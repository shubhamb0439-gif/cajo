/*
  # Seed Initial Data

  ## Overview
  Populates the database with initial dropdown values for the ERP system.

  ## Data Seeded

  1. **Item Groups**
     - Raw Materials
     - Components
     - Finished Goods
     - Consumables

  2. **Item Classes**
     - Part
     - Component
     - Product
     - Accessory

  3. **Vendor Groups**
     - Supplier
     - Manufacturer
     - Distributor
     - Contractor

  4. **Vendor Currencies**
     - USD
     - EUR
     - GBP
     - JPY
     - CNY

  ## Notes
  - Uses INSERT ... ON CONFLICT DO NOTHING to allow safe re-running
  - All dropdown values can be customized by users in the Settings module
*/

-- Insert Item Groups
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('item_group', 'Raw Materials'),
  ('item_group', 'Components'),
  ('item_group', 'Finished Goods'),
  ('item_group', 'Consumables')
ON CONFLICT (drop_type, drop_value) DO NOTHING;

-- Insert Item Classes
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('item_class', 'Part'),
  ('item_class', 'Component'),
  ('item_class', 'Product'),
  ('item_class', 'Accessory')
ON CONFLICT (drop_type, drop_value) DO NOTHING;

-- Insert Vendor Groups
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('vendor_group', 'Supplier'),
  ('vendor_group', 'Manufacturer'),
  ('vendor_group', 'Distributor'),
  ('vendor_group', 'Contractor')
ON CONFLICT (drop_type, drop_value) DO NOTHING;

-- Insert Vendor Currencies
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('vendor_currency', 'USD'),
  ('vendor_currency', 'EUR'),
  ('vendor_currency', 'GBP'),
  ('vendor_currency', 'JPY'),
  ('vendor_currency', 'CNY'),
  ('vendor_currency', 'CAD'),
  ('vendor_currency', 'AUD')
ON CONFLICT (drop_type, drop_value) DO NOTHING;
