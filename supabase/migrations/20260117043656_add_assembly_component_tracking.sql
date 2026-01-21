/*
  # Add Component Source Tracking to Assemblies

  ## Overview
  Enhances the assembly tracking system to record the source (vendor/assembly) of each component used.

  ## Changes
  1. Add source tracking columns to assembly_items table
    - `source_type` - Type of source (purchase or assembly)
    - `source_purchase_id` - Reference to purchase if component was purchased
    - `source_assembly_id` - Reference to assembly if component was assembled
    - `vendor_id` - Quick reference to vendor (for purchased items)

  2. Create helper view for component usage history
    - Tracks all uses of components in assemblies with source information

  ## Security
  - Maintain existing RLS policies on assembly_items table
*/

-- Add source tracking columns to assembly_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assembly_items' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE assembly_items
    ADD COLUMN source_type text CHECK (source_type IN ('purchase', 'assembly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assembly_items' AND column_name = 'source_purchase_id'
  ) THEN
    ALTER TABLE assembly_items
    ADD COLUMN source_purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assembly_items' AND column_name = 'source_assembly_id'
  ) THEN
    ALTER TABLE assembly_items
    ADD COLUMN source_assembly_id uuid REFERENCES assemblies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assembly_items' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE assembly_items
    ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create a view for component usage tracking
CREATE OR REPLACE VIEW component_usage_history AS
SELECT
  ai.assembly_component_item_id,
  ii.item_name,
  ai.assembly_id,
  a.assembly_name,
  a.assembly_quantity,
  a.created_at,
  ai.source_type,
  ai.vendor_id,
  v.vendor_name,
  ai.source_purchase_id,
  ai.source_assembly_id,
  u.name as created_by_name
FROM assembly_items ai
JOIN assemblies a ON ai.assembly_id = a.id
JOIN inventory_items ii ON ai.assembly_component_item_id = ii.id
LEFT JOIN vendors v ON ai.vendor_id = v.id
LEFT JOIN users u ON a.created_by = u.id;

-- Grant access to authenticated users
GRANT SELECT ON component_usage_history TO authenticated;