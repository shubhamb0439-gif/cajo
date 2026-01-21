/*
  # Auto-calculate Purchase Order Status Based on Sales Fulfillment
  
  1. Function
    - `calculate_po_status()` - Calculates PO status based on sales fulfillment
      - Compares PO BOM quantities with sold quantities
      - Returns "fulfilled" if all BOM quantities are met
      - Returns "open" if any BOM quantity is not yet met
  
  2. Triggers
    - Automatically update PO status when:
      - Sale items are added/removed/updated
      - Sales are linked to a PO via po_number
      - Purchase order items are modified
  
  3. Changes
    - Remove user ability to manually set status
    - Status is now system-calculated only
*/

-- Function to calculate purchase order status based on sales fulfillment
CREATE OR REPLACE FUNCTION calculate_po_status(po_id_param uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  po_num text;
  bom_record RECORD;
  sold_count integer;
  all_fulfilled boolean := true;
BEGIN
  -- Get the PO number
  SELECT po_number INTO po_num
  FROM purchase_orders
  WHERE id = po_id_param;
  
  IF po_num IS NULL THEN
    RETURN 'open';
  END IF;
  
  -- Check each BOM item in the purchase order
  FOR bom_record IN
    SELECT bom_id, quantity
    FROM purchase_order_items
    WHERE po_id = po_id_param
  LOOP
    -- Count how many units of this BOM have been sold for this PO
    SELECT COUNT(*) INTO sold_count
    FROM sale_items si
    JOIN assembly_units au ON si.assembly_unit_id = au.id
    JOIN assemblies a ON au.assembly_id = a.id
    JOIN sales s ON si.sale_id = s.id
    WHERE a.bom_id = bom_record.bom_id
      AND s.po_number = po_num;
    
    -- If any BOM hasn't met its quantity, not fulfilled
    IF sold_count < bom_record.quantity THEN
      all_fulfilled := false;
      EXIT;
    END IF;
  END LOOP;
  
  IF all_fulfilled THEN
    RETURN 'fulfilled';
  ELSE
    RETURN 'open';
  END IF;
END;
$$;

-- Function to update PO status (called by triggers)
CREATE OR REPLACE FUNCTION update_po_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  po_id_to_update uuid;
  po_num_to_check text;
BEGIN
  -- Determine which PO to update based on the trigger context
  IF TG_TABLE_NAME = 'purchase_order_items' THEN
    IF TG_OP = 'DELETE' THEN
      po_id_to_update := OLD.po_id;
    ELSE
      po_id_to_update := NEW.po_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'sales' THEN
    IF TG_OP = 'DELETE' THEN
      po_num_to_check := OLD.po_number;
    ELSE
      po_num_to_check := NEW.po_number;
    END IF;
    
    IF po_num_to_check IS NOT NULL THEN
      SELECT id INTO po_id_to_update
      FROM purchase_orders
      WHERE po_number = po_num_to_check;
    END IF;
  ELSIF TG_TABLE_NAME = 'sale_items' THEN
    -- Get the PO number from the sale
    IF TG_OP = 'DELETE' THEN
      SELECT s.po_number INTO po_num_to_check
      FROM sales s
      WHERE s.id = OLD.sale_id;
    ELSE
      SELECT s.po_number INTO po_num_to_check
      FROM sales s
      WHERE s.id = NEW.sale_id;
    END IF;
    
    IF po_num_to_check IS NOT NULL THEN
      SELECT id INTO po_id_to_update
      FROM purchase_orders
      WHERE po_number = po_num_to_check;
    END IF;
  END IF;
  
  -- Update the status if we found a PO
  IF po_id_to_update IS NOT NULL THEN
    UPDATE purchase_orders
    SET status = calculate_po_status(po_id_to_update),
        updated_at = now()
    WHERE id = po_id_to_update;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_po_status_on_po_items ON purchase_order_items;
DROP TRIGGER IF EXISTS trigger_update_po_status_on_sales ON sales;
DROP TRIGGER IF EXISTS trigger_update_po_status_on_sale_items ON sale_items;

-- Trigger on purchase_order_items changes
CREATE TRIGGER trigger_update_po_status_on_po_items
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_po_status();

-- Trigger on sales changes (when po_number is added/changed)
CREATE TRIGGER trigger_update_po_status_on_sales
AFTER INSERT OR UPDATE OF po_number OR DELETE ON sales
FOR EACH ROW
EXECUTE FUNCTION update_po_status();

-- Trigger on sale_items changes
CREATE TRIGGER trigger_update_po_status_on_sale_items
AFTER INSERT OR DELETE ON sale_items
FOR EACH ROW
EXECUTE FUNCTION update_po_status();

-- Update all existing purchase orders to calculated status
UPDATE purchase_orders
SET status = calculate_po_status(id);
