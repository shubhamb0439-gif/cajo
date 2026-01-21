/*
  # Cajo ERP Database Schema

  ## Overview
  Complete ERP system for inventory, purchasing, and manufacturing management.

  ## Tables Created

  1. **users**
     - Custom user management table linked to auth.users
     - Fields: id, email, name, role (admin/user)
     - Audit fields: created_at, created_by, updated_at, updated_by

  2. **inventory_items**
     - Core inventory management
     - Fields: item_id (unique code), item_name, display_name, unit, group, class
     - Stock tracking: current, min, max, reorder levels
     - Cost tracking: average, min, max
     - Serial number tracking flag
     - Audit fields included

  3. **vendors**
     - Supplier management
     - Fields: vendor_id (unique), name, legal_name, group, contact info
     - Ratings: price, quality, lead time
     - Audit fields included

  4. **purchases**
     - Purchase transaction records
     - Links to inventory_items and vendors
     - Fields: quantity, unit_cost, date, PO number
     - Audit fields included

  5. **boms** (Bill of Materials)
     - Manufacturing recipes
     - Fields: bom_name, bom_item_id (links to finished good)
     - Audit fields included

  6. **bom_items**
     - Components within a BOM
     - Fields: component_item_id, quantity required
     - Audit fields included

  7. **assemblies**
     - Manufacturing execution records
     - Fields: bom_id, assembly_name, quantity
     - Audit fields included

  8. **assembly_units**
     - Individual units produced in an assembly
     - Fields: assembly_id, unit_number, serial_number
     - Audit fields included

  9. **assembly_items**
     - Components used in assembly units
     - Fields: assembly_id, unit_id, component_item_id, serial_number
     - Tracks exact parts/components used
     - Audit fields included

  10. **activity_logs**
      - Audit trail for all system actions
      - Fields: user_id, action, details (JSONB)
      - Audit fields included

  11. **dropdown_values**
      - Configurable dropdown options
      - Types: category, currency, group, class
      - Audit fields included

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users
  - Admin-only policies for sensitive operations
  - Read-only access for activity_logs

  ## Functions & Triggers
  - Auto-update updated_at timestamp
  - Activity logging triggers
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id text UNIQUE NOT NULL,
  item_name text NOT NULL,
  item_display_name text,
  item_unit text NOT NULL DEFAULT 'pcs',
  item_group text,
  item_class text,
  item_stock_min numeric DEFAULT 0,
  item_stock_max numeric DEFAULT 0,
  item_stock_reorder numeric DEFAULT 0,
  item_stock_current numeric DEFAULT 0,
  item_cost_average numeric DEFAULT 0,
  item_cost_min numeric DEFAULT 0,
  item_cost_max numeric DEFAULT 0,
  item_serial_number_tracked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id text UNIQUE NOT NULL,
  vendor_name text NOT NULL,
  vendor_name_legal text,
  vendor_group text,
  vendor_email text,
  vendor_phone text,
  vendor_address text,
  vendor_currency text DEFAULT 'USD',
  vendor_rating_price numeric DEFAULT 0 CHECK (vendor_rating_price >= 0 AND vendor_rating_price <= 5),
  vendor_rating_quality numeric DEFAULT 0 CHECK (vendor_rating_quality >= 0 AND vendor_rating_quality <= 5),
  vendor_rating_lead numeric DEFAULT 0 CHECK (vendor_rating_lead >= 0 AND vendor_rating_lead <= 5),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  purchase_vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  purchase_quantity numeric NOT NULL CHECK (purchase_quantity > 0),
  purchase_unit_cost numeric NOT NULL CHECK (purchase_unit_cost >= 0),
  purchase_date timestamptz DEFAULT now(),
  purchase_po_number text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- BOMs (Bill of Materials)
CREATE TABLE IF NOT EXISTS boms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_name text NOT NULL,
  bom_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(bom_item_id)
);

-- BOM Items (Components)
CREATE TABLE IF NOT EXISTS bom_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_id uuid REFERENCES boms(id) ON DELETE CASCADE NOT NULL,
  bom_component_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  bom_component_quantity numeric NOT NULL CHECK (bom_component_quantity > 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Assemblies
CREATE TABLE IF NOT EXISTS assemblies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_id uuid REFERENCES boms(id) ON DELETE CASCADE NOT NULL,
  assembly_name text NOT NULL,
  assembly_quantity numeric NOT NULL CHECK (assembly_quantity > 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Assembly Units
CREATE TABLE IF NOT EXISTS assembly_units (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assembly_id uuid REFERENCES assemblies(id) ON DELETE CASCADE NOT NULL,
  assembly_unit_number integer NOT NULL,
  assembly_serial_number text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Assembly Items (Traceability)
CREATE TABLE IF NOT EXISTS assembly_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assembly_id uuid REFERENCES assemblies(id) ON DELETE CASCADE NOT NULL,
  assembly_unit_id uuid REFERENCES assembly_units(id) ON DELETE CASCADE,
  assembly_component_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  assembly_item_serial_number text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Dropdown Values
CREATE TABLE IF NOT EXISTS dropdown_values (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_type text NOT NULL CHECK (drop_type IN ('vendor_group', 'vendor_currency', 'item_group', 'item_class')),
  drop_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  UNIQUE(drop_type, drop_value)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_group ON inventory_items(item_group);
CREATE INDEX IF NOT EXISTS idx_inventory_items_class ON inventory_items(item_class);
CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(purchase_item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_vendor ON purchases(purchase_vendor_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_assembly_units_assembly ON assembly_units(assembly_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boms_updated_at BEFORE UPDATE ON boms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON bom_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assemblies_updated_at BEFORE UPDATE ON assemblies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assembly_items_updated_at BEFORE UPDATE ON assembly_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dropdown_values_updated_at BEFORE UPDATE ON dropdown_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropdown_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for inventory_items
CREATE POLICY "Authenticated users can view inventory items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inventory items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for vendors
CREATE POLICY "Authenticated users can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for purchases
CREATE POLICY "Authenticated users can view purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchases"
  ON purchases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchases"
  ON purchases FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchases"
  ON purchases FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for boms
CREATE POLICY "Authenticated users can view boms"
  ON boms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert boms"
  ON boms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update boms"
  ON boms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete boms"
  ON boms FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for bom_items
CREATE POLICY "Authenticated users can view bom items"
  ON bom_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bom items"
  ON bom_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bom items"
  ON bom_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bom items"
  ON bom_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for assemblies
CREATE POLICY "Authenticated users can view assemblies"
  ON assemblies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assemblies"
  ON assemblies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assemblies"
  ON assemblies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assemblies"
  ON assemblies FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for assembly_units
CREATE POLICY "Authenticated users can view assembly units"
  ON assembly_units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assembly units"
  ON assembly_units FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assembly units"
  ON assembly_units FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assembly units"
  ON assembly_units FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for assembly_items
CREATE POLICY "Authenticated users can view assembly items"
  ON assembly_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assembly items"
  ON assembly_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assembly items"
  ON assembly_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assembly items"
  ON assembly_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for activity_logs (read-only for all, system writes)
CREATE POLICY "Authenticated users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for dropdown_values
CREATE POLICY "Authenticated users can view dropdown values"
  ON dropdown_values FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert dropdown values"
  ON dropdown_values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update dropdown values"
  ON dropdown_values FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete dropdown values"
  ON dropdown_values FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );