/*
  # Fix Stock by Vendor Function for Multi-Item Purchases

  ## Problem
  The `get_item_stock_by_vendor` function was referencing old purchase schema columns
  that no longer exist after the multi-item purchase restructure. The function needs
  to query the new `purchase_items` table instead of the `purchases` table directly.

  ## Changes
  - Update `purchased_stock` CTE to use `purchase_items` table
  - Join `purchase_items` with `purchases` to get vendor information
  - Filter by `received = true` to only count received items
  - Update column references to match new schema
*/

DROP FUNCTION IF EXISTS get_item_stock_by_vendor(uuid);

CREATE OR REPLACE FUNCTION get_item_stock_by_vendor(p_item_id uuid)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name text,
  source_type text,
  stock_available numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH purchased_stock AS (
    SELECT
      p.purchase_vendor_id as vendor_id,
      v.vendor_name,
      'purchase' as source_type,
      COALESCE(SUM(pi.quantity), 0) as purchased
    FROM purchase_items pi
    JOIN purchases p ON p.id = pi.purchase_id
    LEFT JOIN vendors v ON v.id = p.purchase_vendor_id
    WHERE pi.item_id = p_item_id
      AND pi.received = true
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
      NULL::uuid as vendor_id,
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
