/*
  # Fix Fulfill Delivery to Use BOM for Stock Reduction

  ## Overview
  This migration fixes the fulfill_delivery function to properly reduce stock
  by using the BOM (Bill of Materials) to determine component quantities per unit.

  ## Problem
  - assembly_items are linked to assembly_id, not assembly_unit_id
  - The previous fulfill_delivery couldn't find components because it queried
    by assembly_unit_id which doesn't exist in assembly_items
  - Stock wasn't being reduced when deliveries were fulfilled

  ## Solution
  - Get the BOM for the assembly
  - Use BOM component quantities (which are per-unit quantities)
  - For each delivered unit, reduce stock by the BOM quantities
  - Create stock movements for traceability
  - Update Delivered History automatically

  ## Changes
  - Updated fulfill_delivery function to use BOM-based component lookups
  - Proper FIFO stock reduction using purchases
  - Creates stock movements for audit trail
*/

-- Update fulfill_delivery function to use BOM for component quantities
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
  v_bom_component RECORD;
  v_current_stock numeric;
  v_item_name text;
  v_result jsonb;
  v_items_count int;
  v_assembly_id uuid;
  v_remaining_to_deduct numeric;
  v_purchase RECORD;
  v_deduct_qty numeric;
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
    SELECT 
      si.id, 
      si.assembly_unit_id, 
      si.serial_number, 
      si.sale_id,
      au.assembly_id
    FROM sale_items si
    JOIN delivery_items di ON di.sale_item_id = si.id
    JOIN assembly_units au ON au.id = si.assembly_unit_id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    -- Get BOM components for this assembly
    FOR v_bom_component IN
      SELECT 
        bi.bom_component_item_id as inventory_item_id,
        bi.bom_component_quantity as quantity_per_unit,
        ii.item_name,
        ii.item_stock_current
      FROM assemblies a
      JOIN bom_items bi ON bi.bom_id = a.bom_id
      JOIN inventory_items ii ON ii.id = bi.bom_component_item_id
      WHERE a.id = v_sale_item.assembly_id
    LOOP
      IF v_bom_component.item_stock_current < v_bom_component.quantity_per_unit THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Insufficient stock for component: ' || v_bom_component.item_name || 
                   ' (Available: ' || v_bom_component.item_stock_current || 
                   ', Required: ' || v_bom_component.quantity_per_unit || ')'
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
    SELECT 
      si.id, 
      si.assembly_unit_id, 
      si.serial_number, 
      si.sale_id,
      au.assembly_id
    FROM sale_items si
    JOIN delivery_items di ON di.sale_item_id = si.id
    JOIN assembly_units au ON au.id = si.assembly_unit_id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    -- Get BOM components for this assembly and reduce stock
    FOR v_bom_component IN
      SELECT 
        bi.bom_component_item_id as inventory_item_id,
        bi.bom_component_quantity as quantity_per_unit
      FROM assemblies a
      JOIN bom_items bi ON bi.bom_id = a.bom_id
      WHERE a.id = v_sale_item.assembly_id
    LOOP
      -- Update inventory stock level (reduce by quantity per unit)
      UPDATE inventory_items
      SET 
        item_stock_current = item_stock_current - v_bom_component.quantity_per_unit,
        updated_by = p_user_id,
        updated_at = now()
      WHERE id = v_bom_component.inventory_item_id;

      -- FIFO: Deduct from oldest purchases first
      v_remaining_to_deduct := v_bom_component.quantity_per_unit;
      
      FOR v_purchase IN
        SELECT id, purchase_remaining_quantity
        FROM purchases
        WHERE purchase_item_id = v_bom_component.inventory_item_id
          AND purchase_remaining_quantity > 0
        ORDER BY purchase_date ASC, created_at ASC
      LOOP
        EXIT WHEN v_remaining_to_deduct <= 0;
        
        -- Determine how much to deduct from this purchase
        v_deduct_qty := LEAST(v_remaining_to_deduct, v_purchase.purchase_remaining_quantity);
        
        -- Update purchase remaining quantity
        UPDATE purchases
        SET purchase_remaining_quantity = purchase_remaining_quantity - v_deduct_qty
        WHERE id = v_purchase.id;
        
        v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_qty;
      END LOOP;

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
        v_bom_component.inventory_item_id,
        'sale',
        -v_bom_component.quantity_per_unit,
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
