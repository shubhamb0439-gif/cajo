/*
  # Restructure Purchases to Support Multiple Items

  ## Overview
  Restructures the purchases system to support multiple items per purchase order
  and adds receipt tracking to control when stock is updated.

  ## Changes

  ### 1. New Tables
  - **purchase_items**
    - `id` (uuid, primary key)
    - `purchase_id` (uuid, references purchases)
    - `item_id` (uuid, references inventory_items)
    - `vendor_item_code` (text) - Vendor's SKU/part number
    - `quantity` (numeric) - Quantity purchased
    - `unit_cost` (numeric) - Cost per unit
    - `lead_time` (numeric) - Lead time in days
    - `received` (boolean) - Whether items have been received
    - Audit fields: created_at, created_by, updated_at, updated_by

  ### 2. Modified Tables
  - **purchases** - Restructured to hold purchase-level data only
    - Keeps: id, vendor_id, po_number, purchase_date, audit fields
    - Removes: item_id, quantity, unit_cost, vendor_item_code, lead_time (moved to purchase_items)

  ### 3. Data Migration
  - All existing purchases are migrated to new structure
  - Existing purchases marked as received (received=true) to maintain stock consistency
  - Stock levels remain unchanged (already reflected existing purchases)

  ### 4. Security
  - RLS enabled on purchase_items table
  - Policies for authenticated users to view, insert, update, delete

  ### 5. Important Notes
  - This migration maintains data integrity by marking all existing purchases as received
  - Stock updates will now only occur when purchase_items.received is set to true
  - Each purchase can now contain multiple items
*/

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  vendor_item_code text,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  lead_time numeric DEFAULT 0,
  received boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_item ON purchase_items(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_received ON purchase_items(received);

-- Enable RLS on purchase_items
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_items
CREATE POLICY "Authenticated users can view purchase items"
  ON purchase_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase items"
  ON purchase_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase items"
  ON purchase_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchase items"
  ON purchase_items FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_purchase_items_updated_at BEFORE UPDATE ON purchase_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing purchase data to new structure
-- Each existing purchase becomes a purchase with one item, marked as received
INSERT INTO purchase_items (
  purchase_id,
  item_id,
  vendor_item_code,
  quantity,
  unit_cost,
  lead_time,
  received,
  created_at,
  created_by,
  updated_at,
  updated_by
)
SELECT
  id as purchase_id,
  purchase_item_id as item_id,
  purchase_vendor_item_code as vendor_item_code,
  purchase_quantity as quantity,
  purchase_unit_cost as unit_cost,
  COALESCE(purchase_lead_time, 0) as lead_time,
  true as received,
  created_at,
  created_by,
  updated_at,
  updated_by
FROM purchases
WHERE NOT EXISTS (
  SELECT 1 FROM purchase_items WHERE purchase_items.purchase_id = purchases.id
);

-- Now remove the old columns from purchases table
-- We do this after migration to ensure data safety
DO $$
BEGIN
  -- Drop old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_item_id'
  ) THEN
    ALTER TABLE purchases DROP COLUMN purchase_item_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_quantity'
  ) THEN
    ALTER TABLE purchases DROP COLUMN purchase_quantity;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_unit_cost'
  ) THEN
    ALTER TABLE purchases DROP COLUMN purchase_unit_cost;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_vendor_item_code'
  ) THEN
    ALTER TABLE purchases DROP COLUMN purchase_vendor_item_code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'purchase_lead_time'
  ) THEN
    ALTER TABLE purchases DROP COLUMN purchase_lead_time;
  END IF;
END $$;

-- Drop old indexes that referenced dropped columns
DROP INDEX IF EXISTS idx_purchases_item;
