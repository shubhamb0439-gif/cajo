/*
  # Fix FIFO Assembly Logic

  ## Overview
  Updates the assembly transaction function to implement proper FIFO (First In, First Out) inventory tracking.

  ## Changes
  1. Modified Function: execute_assembly_transaction
    - Implements FIFO logic to deduct from oldest purchases first
    - Updates purchase_remaining_quantity for each purchase used
    - Tracks source purchase in assembly_items table for full traceability
    - Maintains atomic transaction behavior

  ## FIFO Logic
  When components are used in assembly:
  - Purchases are ordered by date (oldest first)
  - Stock is deducted from oldest available purchases
  - Each component usage is linked to its source purchase
  - Remaining quantities are tracked accurately

  ## Security
  - No changes to RLS policies
  - Maintains existing permissions
*/

-- Drop and recreate the function with FIFO logic
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
  v_purchase record;
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

    -- FIFO: Deduct from oldest purchases first
    v_remaining_to_deduct := v_required_qty;
    
    FOR v_purchase IN
      SELECT id, purchase_remaining_quantity, purchase_vendor_id
      FROM purchases
      WHERE purchase_item_id = v_bom_item.bom_component_item_id
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
        v_purchase.id,
        v_purchase.purchase_vendor_id,
        p_user_id
      );
      
      v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_qty;
    END LOOP;
    
    -- If we still have quantity to deduct, check if there are internal assemblies
    IF v_remaining_to_deduct > 0 THEN
      -- This means the component came from internal assembly, not purchase
      -- Record it with null vendor (Cajo Technologies internal)
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
