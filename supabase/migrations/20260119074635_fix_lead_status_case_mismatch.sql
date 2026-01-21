/*
  # Fix Lead Status Case Mismatch

  1. Problem
    - dropdown_values table has capitalized values ('New', 'Contacted', etc.)
    - leads table constraint expects lowercase values ('new', 'contacted', etc.)
    - This causes new lead creation to fail

  2. Changes
    - Update all lead status values in dropdown_values to lowercase
    - Update all lead source values in dropdown_values to lowercase for consistency
    
  3. Data Updated
    - Lead statuses: 'New' -> 'new', 'Contacted' -> 'contacted', etc.
    - Lead sources: 'Website' -> 'website', etc.
*/

-- Update lead status values to lowercase
UPDATE dropdown_values 
SET drop_value = LOWER(drop_value)
WHERE drop_type = 'lead_status';

-- Update lead source values to lowercase for consistency
UPDATE dropdown_values 
SET drop_value = LOWER(drop_value)
WHERE drop_type = 'lead_source';
