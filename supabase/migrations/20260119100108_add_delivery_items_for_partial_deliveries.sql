/*
  # Add Delivery Items for Partial Deliveries

  ## Overview
  This migration enables partial deliveries by tracking which specific sale items
  are included in each delivery. This allows multiple deliveries per sale and
  proper stock tracking for each delivered item.

  ## Changes
  1. New Tables
    - `delivery_items` - Junction table linking deliveries to specific sale_items
      - `id` (uuid, primary key)
      - `delivery_id` (uuid, references deliveries)
      - `sale_item_id` (uuid, references sale_items)
      - `created_at` (timestamptz)

  2. Modified Functions
    - Update `fulfill_delivery` to only process items in the specific delivery
    - Only reduce stock for components in the delivered sale_items
    - Mark only the specific sale_items as delivered (not all items in the sale)

  3. Security
    - Enable RLS on `delivery_items` table
    - Add policies for authenticated users to manage delivery items

  ## Important Notes
  - Allows multiple deliveries per sale (partial shipments)
  - Each delivery now tracks its specific items via delivery_items
  - Stock is only reduced for items in the fulfilled delivery
  - Delivered History shows item-level delivery tracking
*/

-- Create delivery_items junction table
CREATE TABLE IF NOT EXISTS delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(delivery_id, sale_item_id)
);

-- Enable RLS
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_items
CREATE POLICY "Authenticated users can view delivery items"
  ON delivery_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert delivery items"
  ON delivery_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery items"
  ON delivery_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete delivery items"
  ON delivery_items FOR DELETE
  TO authenticated
  USING (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_sale_item_id ON delivery_items(sale_item_id);

-- Enable realtime for delivery_items
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_items;

-- Update fulfill_delivery function to process only items in the delivery
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
  v_current_stock numeric;
  v_item_name text;
  v_result jsonb;
  v_items_count int;
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

  -- Check if there are any items in this delivery
  SELECT COUNT(*) INTO v_items_count
  FROM delivery_items
  WHERE delivery_id = p_delivery_id;

  IF v_items_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No items in this delivery');
  END IF;

  -- First pass: Check if we have sufficient stock for all items in THIS delivery
  FOR v_sale_item IN
    SELECT si.id, si.assembly_unit_id, si.serial_number, si.sale_id
    FROM sale_items si
    JOIN delivery_items di ON di.sale_item_id = si.id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    FOR v_assembly_item IN
      SELECT 
        ai.assembly_component_item_id as inventory_item_id,
        ii.item_name,
        ii.item_stock_current,
        1 as quantity_used
      FROM assembly_items ai
      JOIN inventory_items ii ON ii.id = ai.assembly_component_item_id
      WHERE ai.assembly_unit_id = v_sale_item.assembly_unit_id
    LOOP
      IF v_assembly_item.item_stock_current < v_assembly_item.quantity_used THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Insufficient stock for item: ' || v_assembly_item.item_name || 
                   ' (Available: ' || v_assembly_item.item_stock_current || ', Required: ' || v_assembly_item.quantity_used || ')'
        );
      END IF;
    END LOOP;
  END LOOP;

  -- Mark delivery as delivered
  UPDATE deliveries
  SET 
    delivered = true,
    delivered_at = now(),
    delivered_by = p_user_id,
    updated_by = p_user_id,
    updated_at = now()
  WHERE id = p_delivery_id;

  -- Mark only the sale items in THIS delivery as delivered
  UPDATE sale_items
  SET delivered = true
  WHERE id IN (
    SELECT sale_item_id 
    FROM delivery_items 
    WHERE delivery_id = p_delivery_id
  );

  -- Second pass: Process each sale item in THIS delivery, reduce stock, and create movements
  FOR v_sale_item IN
    SELECT si.id, si.assembly_unit_id, si.serial_number, si.sale_id
    FROM sale_items si
    JOIN delivery_items di ON di.sale_item_id = si.id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    -- Get all components used in this assembly unit
    FOR v_assembly_item IN
      SELECT 
        ai.assembly_component_item_id as inventory_item_id,
        1 as quantity_used
      FROM assembly_items ai
      WHERE ai.assembly_unit_id = v_sale_item.assembly_unit_id
    LOOP
      -- Update inventory stock level (reduce by quantity sold)
      UPDATE inventory_items
      SET 
        item_stock_current = item_stock_current - v_assembly_item.quantity_used,
        updated_by = p_user_id,
        updated_at = now()
      WHERE id = v_assembly_item.inventory_item_id;

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
        -v_assembly_item.quantity_used,
        v_sale_id,
        'sale',
        'Sold in assembly unit SN: ' || v_sale_item.serial_number,
        p_user_id
      );
    END LOOP;
  END LOOP;

  -- Check if all items in the sale are delivered, update sale status
  UPDATE sales
  SET is_delivered = NOT EXISTS (
    SELECT 1 FROM sale_items 
    WHERE sale_id = v_sale_id 
    AND delivered = false
  )
  WHERE id = v_sale_id;

  v_result := jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'sale_id', v_sale_id
  );

  RETURN v_result;
END;
$$;
