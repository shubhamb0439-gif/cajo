/*
  # Add Lead Dropdown Types

  1. Changes
    - Drops existing check constraint on dropdown_values.drop_type
    - Creates new check constraint that includes lead_status and lead_source
  
  2. New Dropdown Types
    - lead_status: For managing lead status values
    - lead_source: For managing lead source values
  
  3. Security
    - Maintains existing RLS policies
*/

-- Drop the existing constraint
ALTER TABLE dropdown_values DROP CONSTRAINT IF EXISTS dropdown_values_drop_type_check;

-- Add new constraint with lead_status and lead_source
ALTER TABLE dropdown_values ADD CONSTRAINT dropdown_values_drop_type_check 
  CHECK (drop_type = ANY (ARRAY['vendor_group'::text, 'vendor_currency'::text, 'item_group'::text, 'item_class'::text, 'lead_status'::text, 'lead_source'::text]));