/*
  # Create Stock by Vendor Tracking Function

  ## Overview
  Creates a function to calculate available stock for each item grouped by vendor source.
  This enables tracking which vendor's stock is available for use in assemblies.

  ## Function
  - **get_item_stock_by_vendor(p_item_id uuid)**
    - Returns stock available from each vendor for a specific item
    - Includes stock from purchases, assemblies, and usage tracking
    - Calculates: purchased from vendor - used from vendor = available from vendor
*/

-- Function to get stock by vendor for a specific item
CREATE OR REPLACE FUNCTION get_item_stock_by_vendor(p_item_id uuid)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name text,
  source_type text,
  stock_available numeric
) AS $$
BEGIN
  -- Return stock from purchases grouped by vendor
  RETURN QUERY
  WITH purchased_stock AS (
    SELECT
      p.purchase_vendor_id as vendor_id,
      v.vendor_name,
      'purchase' as source_type,
      COALESCE(SUM(p.purchase_quantity), 0) as purchased
    FROM purchases p
    LEFT JOIN vendors v ON v.id = p.purchase_vendor_id
    WHERE p.purchase_item_id = p_item_id
    GROUP BY p.purchase_vendor_id, v.vendor_name
  ),
  used_stock AS (
    SELECT
      ai.vendor_id,
      COALESCE(SUM(bi.bom_component_quantity * a.assembly_quantity), 0) as used
    FROM assembly_items ai
    JOIN assemblies a ON a.id = ai.assembly_id
    JOIN bom_items bi ON bi.bom_component_item_id = ai.assembly_component_item_id
    WHERE ai.assembly_component_item_id = p_item_id
      AND ai.assembly_unit_id IS NULL
    GROUP BY ai.vendor_id
  ),
  assembled_stock AS (
    SELECT
      NULL as vendor_id,
      'Cajo Technologies' as vendor_name,
      'assembly' as source_type,
      COALESCE(SUM(a.assembly_quantity), 0) as assembled
    FROM assemblies a
    JOIN boms b ON b.id = a.bom_id
    WHERE b.bom_item_id = p_item_id
  ),
  cajo_used AS (
    SELECT
      COALESCE(SUM(bi.bom_component_quantity * a.assembly_quantity), 0) as used
    FROM assembly_items ai
    JOIN assemblies a ON a.id = ai.assembly_id
    JOIN bom_items bi ON bi.bom_component_item_id = ai.assembly_component_item_id
    WHERE ai.assembly_component_item_id = p_item_id
      AND ai.vendor_id IS NULL
      AND ai.assembly_unit_id IS NULL
  )
  -- Combine purchase sources
  SELECT
    ps.vendor_id,
    ps.vendor_name,
    ps.source_type,
    GREATEST(ps.purchased - COALESCE(us.used, 0), 0) as stock_available
  FROM purchased_stock ps
  LEFT JOIN used_stock us ON us.vendor_id = ps.vendor_id
  WHERE ps.purchased - COALESCE(us.used, 0) > 0
  
  UNION ALL
  
  -- Add Cajo assembled stock if available
  SELECT
    asmb.vendor_id,
    asmb.vendor_name,
    asmb.source_type,
    GREATEST(asmb.assembled - COALESCE(cu.used, 0), 0) as stock_available
  FROM assembled_stock asmb, cajo_used cu
  WHERE asmb.assembled - COALESCE(cu.used, 0) > 0;
  
END;
$$ LANGUAGE plpgsql;