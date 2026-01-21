/*
  # Update Sale Items to Reference Assembly Units

  ## Changes
  - Modify sale_items table to reference assembly_units instead of assemblies
  - This allows tracking individual units with serial numbers
  - Each assembly unit can only be sold once

  ## Important
  - Assembly units have serial numbers (assembly_serial_number field)
  - Only units with serial numbers can be sold
*/

-- Drop the existing foreign key and add new one for assembly_units
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_assembly_id_fkey;
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_assembly_unit_id_fkey;

-- Rename column if it exists as assembly_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'assembly_id'
  ) THEN
    ALTER TABLE sale_items RENAME COLUMN assembly_id TO assembly_unit_id;
  END IF;
END $$;

-- Add assembly_unit_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'assembly_unit_id'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN assembly_unit_id uuid NOT NULL REFERENCES assembly_units(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Ensure the foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sale_items_assembly_unit_id_fkey'
  ) THEN
    ALTER TABLE sale_items 
      ADD CONSTRAINT sale_items_assembly_unit_id_fkey 
      FOREIGN KEY (assembly_unit_id) REFERENCES assembly_units(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Update unique constraint to use assembly_unit_id
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_assembly_id_key;
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_assembly_unit_id_key;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_assembly_unit_id_key UNIQUE (assembly_unit_id);

-- Update index
DROP INDEX IF EXISTS idx_sale_items_assembly_id;
CREATE INDEX IF NOT EXISTS idx_sale_items_assembly_unit_id ON sale_items(assembly_unit_id);
