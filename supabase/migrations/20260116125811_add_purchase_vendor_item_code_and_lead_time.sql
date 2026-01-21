/*
  # Add Vendor Item Code and Lead Time Fields

  1. Changes to `purchases` table
    - Add `purchase_vendor_item_code` (text) - Vendor's item code/SKU
    - Add `purchase_lead_time` (numeric) - Lead time in days
  
  2. Changes to `inventory_items` table
    - Add `item_lead_time_average` (numeric) - Average lead time in days

  3. Notes
    - These fields support better vendor management and supply chain tracking
    - Lead time average will be calculated as weighted average based on purchase quantities
*/

-- Add vendor item code and lead time to purchases table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_vendor_item_code'
  ) THEN
    ALTER TABLE purchases ADD COLUMN purchase_vendor_item_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_lead_time'
  ) THEN
    ALTER TABLE purchases ADD COLUMN purchase_lead_time numeric DEFAULT 0;
  END IF;
END $$;

-- Add average lead time to inventory_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'item_lead_time_average'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN item_lead_time_average numeric DEFAULT 0;
  END IF;
END $$;