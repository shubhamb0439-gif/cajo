/*
  # Fix Purchase Items Remaining Quantity Tracking

  ## Overview
  Adds remaining_quantity tracking to purchase_items table and migrates
  FIFO logic to work with the new multi-item purchase structure.

  ## Problem
  - purchase_remaining_quantity is at purchase (header) level
  - With multi-item purchases, we need per-item remaining quantity tracking
  - FIFO logic was broken because it couldn't find purchase_item_id

  ## Solution
  1. Add remaining_quantity column to purchase_items
  2. Migrate data: copy quantity to remaining_quantity for existing items
  3. Remove purchase_remaining_quantity from purchases (no longer needed)
  4. Update fulfill_delivery to use purchase_items with item-level tracking
  5. Update execute_assembly_transaction to use purchase_items

  ## Changes
  - Added purchase_items.remaining_quantity column
  - Migrated existing data
  - Updated fulfill_delivery function
  - Updated execute_assembly_transaction function
  - Removed purchases.purchase_remaining_quantity column
*/

-- Add remaining_quantity to purchase_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_items' AND column_name = 'remaining_quantity'
  ) THEN
    ALTER TABLE purchase_items 
    ADD COLUMN remaining_quantity numeric DEFAULT 0 CHECK (remaining_quantity >= 0);
  END IF;
END $$;

-- Migrate data: set remaining_quantity = quantity for all purchase_items
UPDATE purchase_items
SET remaining_quantity = quantity
WHERE remaining_quantity IS NULL OR remaining_quantity = 0;

-- Make remaining_quantity NOT NULL with default
ALTER TABLE purchase_items 
ALTER COLUMN remaining_quantity SET NOT NULL,
ALTER COLUMN remaining_quantity SET DEFAULT 0;

-- Update fulfill_delivery function to use purchase_items
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
  v_purchase_item RECORD;
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

      -- FIFO: Deduct from oldest purchase_items first
      v_remaining_to_deduct := v_bom_component.quantity_per_unit;
      
      FOR v_purchase_item IN
        SELECT 
          pi.id, 
          pi.remaining_quantity,
          pi.purchase_id
        FROM purchase_items pi
        JOIN purchases p ON p.id = pi.purchase_id
        WHERE pi.item_id = v_bom_component.inventory_item_id
          AND pi.remaining_quantity > 0
          AND pi.received = true
        ORDER BY p.purchase_date ASC, pi.created_at ASC
      LOOP
        EXIT WHEN v_remaining_to_deduct <= 0;
        
        -- Determine how much to deduct from this purchase item
        v_deduct_qty := LEAST(v_remaining_to_deduct, v_purchase_item.remaining_quantity);
        
        -- Update purchase_item remaining quantity
        UPDATE purchase_items
        SET remaining_quantity = remaining_quantity - v_deduct_qty
        WHERE id = v_purchase_item.id;
        
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

-- Update execute_assembly_transaction to use purchase_items
CREATE OR REPLACE FUNCTION execute_assembly_transaction(
  p_bom_id uuid,
  p_assembly_name text,
  p_quantity numeric,
  p_user_id uuid,
  p_bom_item_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_assembly_id uuid;
  v_bom_item record;
  v_component record;
  v_required_qty numeric;
  v_remaining_to_deduct numeric;
  v_total_component_cost numeric := 0;
  v_component_cost numeric;
  v_unit_number integer;
  v_purchase_item record;
  v_deduct_qty numeric;
BEGIN
  -- Create assembly record
  INSERT INTO assemblies (bom_id, assembly_name, assembly_quantity, created_by, updated_by)
  VALUES (p_bom_id, p_assembly_name, p_quantity, p_user_id, p_user_id)
  RETURNING id INTO v_assembly_id;

  -- Process each BOM component
  FOR v_bom_item IN 
    SELECT bom_component_item_id, bom_component_quantity
    FROM bom_items
    WHERE bom_id = p_bom_id
  LOOP
    v_required_qty := v_bom_item.bom_component_quantity * p_quantity;
    
    -- Get current component details
    SELECT item_stock_current, item_cost_average
    INTO v_component
    FROM inventory_items
    WHERE id = v_bom_item.bom_component_item_id;
    
    -- Check stock availability
    IF v_component.item_stock_current < v_required_qty THEN
      RAISE EXCEPTION 'Insufficient stock for component %', v_bom_item.bom_component_item_id;
    END IF;
    
    -- Calculate component cost contribution
    v_component_cost := v_required_qty * v_component.item_cost_average;
    v_total_component_cost := v_total_component_cost + v_component_cost;
    
    -- Deduct from component stock
    UPDATE inventory_items
    SET 
      item_stock_current = item_stock_current - v_required_qty,
      updated_at = now(),
      updated_by = p_user_id
    WHERE id = v_bom_item.bom_component_item_id;

    -- FIFO: Deduct from oldest purchase_items first
    v_remaining_to_deduct := v_required_qty;
    
    FOR v_purchase_item IN
      SELECT 
        pi.id, 
        pi.remaining_quantity,
        p.purchase_vendor_id,
        pi.purchase_id
      FROM purchase_items pi
      JOIN purchases p ON p.id = pi.purchase_id
      WHERE pi.item_id = v_bom_item.bom_component_item_id
        AND pi.remaining_quantity > 0
        AND pi.received = true
      ORDER BY p.purchase_date ASC, pi.created_at ASC
    LOOP
      EXIT WHEN v_remaining_to_deduct <= 0;
      
      -- Determine how much to deduct from this purchase item
      v_deduct_qty := LEAST(v_remaining_to_deduct, v_purchase_item.remaining_quantity);
      
      -- Update purchase_item remaining quantity
      UPDATE purchase_items
      SET remaining_quantity = remaining_quantity - v_deduct_qty
      WHERE id = v_purchase_item.id;
      
      -- Record the source of this component in assembly_items
      INSERT INTO assembly_items (
        assembly_id,
        assembly_component_item_id,
        source_type,
        source_purchase_id,
        vendor_id,
        created_by
      ) VALUES (
        v_assembly_id,
        v_bom_item.bom_component_item_id,
        'purchase',
        v_purchase_item.purchase_id,
        v_purchase_item.purchase_vendor_id,
        p_user_id
      );
      
      v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_qty;
    END LOOP;
    
    -- If we still have quantity to deduct, it came from internal assembly
    IF v_remaining_to_deduct > 0 THEN
      INSERT INTO assembly_items (
        assembly_id,
        assembly_component_item_id,
        source_type,
        vendor_id,
        created_by
      ) VALUES (
        v_assembly_id,
        v_bom_item.bom_component_item_id,
        'assembly',
        NULL,
        p_user_id
      );
    END IF;
  END LOOP;

  -- Create assembly units
  FOR v_unit_number IN 1..p_quantity LOOP
    INSERT INTO assembly_units (assembly_id, assembly_unit_number)
    VALUES (v_assembly_id, v_unit_number);
  END LOOP;

  -- Add to finished good stock and update average cost
  UPDATE inventory_items
  SET 
    item_stock_current = item_stock_current + p_quantity,
    item_cost_average = CASE 
      WHEN item_stock_current > 0 THEN
        ((item_stock_current * item_cost_average) + v_total_component_cost) / (item_stock_current + p_quantity)
      ELSE
        v_total_component_cost / p_quantity
    END,
    updated_at = now(),
    updated_by = p_user_id
  WHERE id = p_bom_item_id;

  RETURN v_assembly_id;
END;
$$;

-- Remove purchase_remaining_quantity from purchases table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_remaining_quantity'
  ) THEN
    ALTER TABLE purchases DROP COLUMN purchase_remaining_quantity;
  END IF;
END $$;
