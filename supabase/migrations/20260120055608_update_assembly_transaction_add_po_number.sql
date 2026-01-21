/*
  # Update Assembly Transaction Function for PO Number

  ## Changes
  Updates the `execute_assembly_transaction` function to accept and store PO number
  when creating assemblies.

  ## Modified Function
  - `execute_assembly_transaction` - Add p_po_number parameter
*/

CREATE OR REPLACE FUNCTION execute_assembly_transaction(
  p_bom_id uuid,
  p_assembly_name text,
  p_quantity numeric,
  p_user_id uuid,
  p_bom_item_id uuid,
  p_po_number text DEFAULT NULL
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
  INSERT INTO assemblies (bom_id, assembly_name, assembly_quantity, po_number, created_by, updated_by)
  VALUES (p_bom_id, p_assembly_name, p_quantity, p_po_number, p_user_id, p_user_id)
  RETURNING id INTO v_assembly_id;

  FOR v_bom_item IN 
    SELECT bom_component_item_id, bom_component_quantity
    FROM bom_items
    WHERE bom_id = p_bom_id
  LOOP
    v_required_qty := v_bom_item.bom_component_quantity * p_quantity;
    
    SELECT item_stock_current, item_cost_average
    INTO v_component
    FROM inventory_items
    WHERE id = v_bom_item.bom_component_item_id;
    
    IF v_component.item_stock_current < v_required_qty THEN
      RAISE EXCEPTION 'Insufficient stock for component %', v_bom_item.bom_component_item_id;
    END IF;
    
    v_component_cost := v_required_qty * v_component.item_cost_average;
    v_total_component_cost := v_total_component_cost + v_component_cost;
    
    UPDATE inventory_items
    SET 
      item_stock_current = item_stock_current - v_required_qty,
      updated_at = now(),
      updated_by = p_user_id
    WHERE id = v_bom_item.bom_component_item_id;

    v_remaining_to_deduct := v_required_qty;

    FOR v_purchase_item IN
      SELECT pi.id, pi.quantity, pi.quantity_used, pi.item_cost
      FROM purchase_items pi
      JOIN purchases p ON p.id = pi.purchase_id
      WHERE pi.item_id = v_bom_item.bom_component_item_id
        AND pi.received = true
        AND (pi.quantity - pi.quantity_used) > 0
      ORDER BY p.purchase_date ASC, pi.created_at ASC
    LOOP
      EXIT WHEN v_remaining_to_deduct <= 0;

      v_deduct_qty := LEAST(v_remaining_to_deduct, v_purchase_item.quantity - v_purchase_item.quantity_used);

      UPDATE purchase_items
      SET quantity_used = quantity_used + v_deduct_qty
      WHERE id = v_purchase_item.id;

      v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_qty;
    END LOOP;

    IF v_remaining_to_deduct > 0 THEN
      RAISE EXCEPTION 'Could not allocate all required quantity for component %', v_bom_item.bom_component_item_id;
    END IF;
  END LOOP;

  FOR v_unit_number IN 1..p_quantity LOOP
    INSERT INTO assembly_units (
      assembly_id,
      assembly_unit_number,
      assembly_unit_cost,
      created_by,
      updated_by
    )
    VALUES (
      v_assembly_id,
      v_unit_number,
      v_total_component_cost / p_quantity,
      p_user_id,
      p_user_id
    );
  END LOOP;

  UPDATE inventory_items
  SET 
    item_stock_current = item_stock_current + p_quantity,
    item_cost_average = (
      (item_stock_current * item_cost_average) + v_total_component_cost
    ) / (item_stock_current + p_quantity),
    updated_at = now(),
    updated_by = p_user_id
  WHERE id = p_bom_item_id;

  RETURN v_assembly_id;
END;
$$;
