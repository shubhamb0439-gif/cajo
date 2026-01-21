/*
  # Add vendor contact name column

  1. Changes
    - Add `vendor_contact_name` column to `vendors` table to store the primary contact person's name
  
  2. Details
    - Column type: text
    - Nullable: yes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'vendor_contact_name'
  ) THEN
    ALTER TABLE vendors ADD COLUMN vendor_contact_name text;
  END IF;
END $$;