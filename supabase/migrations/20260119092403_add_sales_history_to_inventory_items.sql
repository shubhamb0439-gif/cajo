/*
  # Add Sales History Tracking to Inventory Items

  ## Overview
  This migration adds a sales history field to the inventory_items table to track
  the total quantity sold for each item. This helps maintain the stock formula:
  Purchases + Assembled - Used - Sold = Current Stock

  ## Changes to Existing Tables

  ### `inventory_items`
  - Add `item_stock_sold` (numeric) - Total quantity sold throughout history
  - Default value is 0 for existing items

  ## Updates
  - Update the `fulfill_delivery` function to increment `item_stock_sold` when items are sold
  - This provides a clear audit trail of total sales per component

  ## Important Notes
  1. The `item_stock_sold` field is cumulative and never decreases
  2. Combined with stock_movements table, provides complete sales traceability
  3. Helps with reporting and analytics on which components are frequently sold
*/

-- Add item_stock_sold field to inventory_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'item_stock_sold'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN item_stock_sold numeric DEFAULT 0;
  END IF;
END $$;

-- Update the fulfill_delivery function to track sales history
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

  -- First pass: Check if we have sufficient stock for all items
  FOR v_sale_item IN
    SELECT si.id, si.assembly_unit_id, si.serial_number, si.sale_id
    FROM sale_items si
    WHERE si.sale_id = v_sale_id
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

  -- Mark all sale items as delivered
  UPDATE sale_items
  SET delivered = true
  WHERE sale_id = v_sale_id;

  -- Second pass: Process each sale item, reduce stock, update sales history, and create movements
  FOR v_sale_item IN
    SELECT si.id, si.assembly_unit_id, si.serial_number, si.sale_id
    FROM sale_items si
    WHERE si.sale_id = v_sale_id
  LOOP
    -- Get all components used in this assembly unit
    FOR v_assembly_item IN
      SELECT 
        ai.assembly_component_item_id as inventory_item_id,
        1 as quantity_used
      FROM assembly_items ai
      WHERE ai.assembly_unit_id = v_sale_item.assembly_unit_id
    LOOP
      -- Update inventory: reduce current stock and increment sales history
      UPDATE inventory_items
      SET 
        item_stock_current = item_stock_current - v_assembly_item.quantity_used,
        item_stock_sold = COALESCE(item_stock_sold, 0) + v_assembly_item.quantity_used,
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

  v_result := jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'sale_id', v_sale_id
  );

  RETURN v_result;
END;
$$;
