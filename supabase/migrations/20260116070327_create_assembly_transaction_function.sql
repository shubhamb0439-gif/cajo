/*
  # Assembly Transaction Function

  ## Overview
  Creates a PostgreSQL function to handle assembly transactions atomically.

  ## Function: execute_assembly_transaction
  
  This function performs the following operations in a single transaction:
  1. Validates BOM and component availability
  2. Deducts component quantities from inventory
  3. Increases finished good quantity in inventory
  4. Creates assembly record
  5. Creates assembly units
  6. Updates average cost of finished good
  
  All operations succeed or all fail (atomic transaction).

  ## Parameters
  - p_bom_id: UUID of the BOM
  - p_assembly_name: Name for the assembly
  - p_quantity: Number of units to assemble
  - p_user_id: UUID of the user creating the assembly
  - p_bom_item_id: UUID of the finished good item

  ## Returns
  - UUID of the created assembly
*/

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
  v_total_component_cost numeric := 0;
  v_component_cost numeric;
  v_unit_number integer;
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