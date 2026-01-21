/*
  # Add Delivery Fulfillment and Stock Tracking for Sales

  ## Overview
  This migration adds the ability to track when deliveries are fulfilled and 
  implements stock tracking for sold items.

  ## Changes to Existing Tables

  ### `deliveries`
  - Add `delivered` (boolean) - Whether the delivery has been completed/fulfilled
  - Add `delivered_at` (timestamptz) - When the delivery was marked as delivered
  - Add `delivered_by` (uuid) - User who marked the delivery as delivered

  ### `sale_items`
  - Add `delivered` (boolean) - Whether this specific item has been delivered (denormalized for performance)

  ## New Tables

  ### `stock_movements`
  Tracks all stock movements including purchases, assemblies used, and sales.
  - `id` (uuid, primary key) - Unique identifier
  - `inventory_item_id` (uuid, foreign key) - References inventory_items table
  - `movement_type` (text) - Type: 'purchase', 'assembly_used', 'sale'
  - `quantity_change` (numeric) - Positive for additions, negative for reductions
  - `reference_id` (uuid) - ID of the related record (purchase_id, assembly_id, or sale_id)
  - `reference_type` (text) - Type of reference: 'purchase', 'assembly', 'sale'
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - User who created this movement
  - `created_at` (timestamptz) - When the movement occurred

  ## Security
  - Enable RLS on stock_movements table
  - Add policies for authenticated users

  ## Important Notes
  1. Stock movements are created automatically when deliveries are marked as delivered
  2. The stock formula is: Purchases + Assembled - Used in Assemblies - Sold
  3. Sale items must reference assembly_units which contain the components used
*/

-- Add new fields to deliveries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'delivered'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN delivered boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN delivered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'delivered_by'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN delivered_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Add delivered field to sale_items for denormalization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'delivered'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN delivered boolean DEFAULT false;
  END IF;
END $$;

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'assembly_used', 'sale')),
  quantity_change numeric(10, 2) NOT NULL,
  reference_id uuid NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('purchase', 'assembly', 'sale')),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Stock movements policies
CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_item_id ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Function to process delivery fulfillment and update stock
CREATE OR REPLACE FUNCTION fulfill_delivery(
  p_delivery_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id uuid;
  v_sale_item RECORD;
  v_assembly_item RECORD;
  v_result jsonb;
BEGIN
  -- Get the sale_id from the delivery
  SELECT sale_id INTO v_sale_id
  FROM deliveries
  WHERE id = p_delivery_id;

  IF v_sale_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found');
  END IF;

  -- Check if already delivered
  IF EXISTS (SELECT 1 FROM deliveries WHERE id = p_delivery_id AND delivered = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery already fulfilled');
  END IF;

  -- Mark delivery as delivered
  UPDATE deliveries
  SET 
    delivered = true,
    delivered_at = now(),
    delivered_by = p_user_id,
    updated_by = p_user_id,
    updated_at = now()
  WHERE id = p_delivery_id;

  -- Mark all sale items as delivered
  UPDATE sale_items
  SET delivered = true
  WHERE sale_id = v_sale_id;

  -- Process each sale item and reduce stock
  FOR v_sale_item IN
    SELECT si.id, si.assembly_unit_id, si.serial_number, si.sale_id
    FROM sale_items si
    WHERE si.sale_id = v_sale_id
  LOOP
    -- Get all components used in this assembly unit
    FOR v_assembly_item IN
      SELECT 
        ai.assembly_component_item_id as inventory_item_id,
        1 as quantity_used  -- Each component is used once per assembly
      FROM assembly_items ai
      WHERE ai.assembly_unit_id = v_sale_item.assembly_unit_id
    LOOP
      -- Create stock movement record for the sale
      INSERT INTO stock_movements (
        inventory_item_id,
        movement_type,
        quantity_change,
        reference_id,
        reference_type,
        notes,
        created_by
      ) VALUES (
        v_assembly_item.inventory_item_id,
        'sale',
        -v_assembly_item.quantity_used,  -- Negative for stock reduction
        v_sale_id,
        'sale',
        'Sold in assembly unit SN: ' || v_sale_item.serial_number,
        p_user_id
      );
    END LOOP;
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'sale_id', v_sale_id
  );

  RETURN v_result;
END;
$$;

-- Create a view to calculate current stock levels including sales
CREATE OR REPLACE VIEW current_stock_with_sales AS
SELECT 
  ii.id as inventory_item_id,
  ii.item_id,
  ii.item_name,
  ii.item_group,
  ii.item_class,
  COALESCE(SUM(
    CASE sm.movement_type
      WHEN 'purchase' THEN sm.quantity_change
      WHEN 'assembly_used' THEN sm.quantity_change
      WHEN 'sale' THEN sm.quantity_change
      ELSE 0
    END
  ), 0) as stock_quantity,
  COUNT(CASE WHEN sm.movement_type = 'purchase' THEN 1 END) as purchase_count,
  COUNT(CASE WHEN sm.movement_type = 'assembly_used' THEN 1 END) as assembly_used_count,
  COUNT(CASE WHEN sm.movement_type = 'sale' THEN 1 END) as sale_count
FROM inventory_items ii
LEFT JOIN stock_movements sm ON ii.id = sm.inventory_item_id
GROUP BY ii.id, ii.item_id, ii.item_name, ii.item_group, ii.item_class;
