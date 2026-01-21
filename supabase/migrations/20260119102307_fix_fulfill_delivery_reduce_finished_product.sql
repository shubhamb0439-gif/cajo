/*
  # Fix Delivery Fulfillment to Reduce Finished Product Stock

  ## Overview
  Corrects the fulfill_delivery function to reduce stock of the FINISHED PRODUCT
  being sold, not the raw components that make it up. Components were already
  consumed during assembly.

  ## Problem
  - Current logic reduces stock of BOM components when delivering
  - This is incorrect: components are consumed during assembly
  - Should reduce stock of the finished product (assembly) instead

  ## Solution
  - Update fulfill_delivery to:
    1. Get the finished product (bom_item_id) from the assembly
    2. Reduce stock of the finished product by 1 per assembly unit
    3. Use FIFO tracking on the finished product's purchase_items
    4. Create stock movement for the finished product sale
    5. Track delivery history on the finished product

  ## Changes Made
  1. Rewrote fulfill_delivery function logic
  2. Stock reduction now targets finished product, not components
  3. FIFO tracking applies to finished product inventory
  4. Stock movements track finished product sales
*/

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
  v_finished_product_id uuid;
  v_finished_product_name text;
  v_current_stock numeric;
  v_result jsonb;
  v_items_count int;
  v_remaining_to_deduct numeric;
  v_purchase_item RECORD;
  v_deduct_qty numeric;
  v_customer_name text;
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

  -- Get customer name for tracking
  SELECT c.customer_name INTO v_customer_name
  FROM sales s
  JOIN customers c ON c.id = s.customer_id
  WHERE s.id = v_sale_id;

  -- First pass: Check if we have sufficient stock for all finished products in THIS delivery
  FOR v_sale_item IN
    SELECT 
      si.id, 
      si.assembly_unit_id, 
      si.serial_number,
      b.bom_item_id as finished_product_id,
      ii.item_name as finished_product_name,
      ii.item_stock_current
    FROM sale_items si
    JOIN delivery_items di ON di.sale_item_id = si.id
    JOIN assembly_units au ON au.id = si.assembly_unit_id
    JOIN assemblies a ON a.id = au.assembly_id
    JOIN boms b ON b.id = a.bom_id
    JOIN inventory_items ii ON ii.id = b.bom_item_id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    -- Each assembly unit = 1 unit of finished product
    IF v_sale_item.item_stock_current < 1 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Insufficient stock for finished product: ' || v_sale_item.finished_product_name || 
                 ' (Available: ' || v_sale_item.item_stock_current || ', Required: 1)'
      );
    END IF;
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

  -- Second pass: Process each sale item, reduce finished product stock
  FOR v_sale_item IN
    SELECT 
      si.id, 
      si.assembly_unit_id, 
      si.serial_number, 
      si.sale_id,
      b.bom_item_id as finished_product_id,
      ii.item_name as finished_product_name
    FROM sale_items si
    JOIN delivery_items di ON di.sale_item_id = si.id
    JOIN assembly_units au ON au.id = si.assembly_unit_id
    JOIN assemblies a ON a.id = au.assembly_id
    JOIN boms b ON b.id = a.bom_id
    JOIN inventory_items ii ON ii.id = b.bom_item_id
    WHERE di.delivery_id = p_delivery_id
  LOOP
    -- Reduce stock of the FINISHED PRODUCT by 1
    UPDATE inventory_items
    SET 
      item_stock_current = item_stock_current - 1,
      updated_by = p_user_id,
      updated_at = now()
    WHERE id = v_sale_item.finished_product_id;

    -- FIFO: Deduct from oldest purchase_items of the FINISHED PRODUCT
    v_remaining_to_deduct := 1;
    
    FOR v_purchase_item IN
      SELECT 
        pi.id, 
        pi.remaining_quantity,
        pi.purchase_id
      FROM purchase_items pi
      JOIN purchases p ON p.id = pi.purchase_id
      WHERE pi.item_id = v_sale_item.finished_product_id
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

    -- Create stock movement record for the sale of finished product
    INSERT INTO stock_movements (
      inventory_item_id,
      movement_type,
      quantity_change,
      reference_id,
      reference_type,
      notes,
      created_by
    ) VALUES (
      v_sale_item.finished_product_id,
      'sale',
      -1,
      v_sale_id,
      'sale',
      'Sold assembly unit SN: ' || v_sale_item.serial_number || ' to ' || COALESCE(v_customer_name, 'Unknown'),
      p_user_id
    );
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
