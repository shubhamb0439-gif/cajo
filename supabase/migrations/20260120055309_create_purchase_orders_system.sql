/*
  # Create Purchase Orders System

  ## Overview
  Creates a comprehensive Purchase Order (PO) system for tracking customer orders
  and linking them to assemblies and sales.

  ## New Tables
  
  ### `purchase_orders`
  - `id` (uuid, primary key)
  - `po_number` (text, unique) - Customer's PO number
  - `customer_id` (uuid) - References customers table
  - `delivery_date` (date) - Expected delivery date
  - `payment_terms` (text) - Payment terms notes
  - `notes` (text) - Additional notes
  - `status` (text) - Order status (open, in_progress, completed, cancelled)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `created_by` (uuid) - User who created the PO

  ### `purchase_order_items`
  - `id` (uuid, primary key)
  - `po_id` (uuid) - References purchase_orders
  - `bom_id` (uuid) - References boms table
  - `quantity` (integer) - Quantity of this BOM item
  - `created_at` (timestamptz)

  ## Modified Tables
  - `assemblies` - Add `po_number` field
  - `sales` - Add `po_number` field

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users based on role
*/

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  delivery_date date,
  payment_terms text DEFAULT '',
  notes text DEFAULT '',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  bom_id uuid REFERENCES boms(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Add po_number to assemblies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assemblies' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE assemblies ADD COLUMN po_number text DEFAULT '';
  END IF;
END $$;

-- Add po_number to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE sales ADD COLUMN po_number text DEFAULT '';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_customer ON purchase_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_po_number ON assemblies(po_number);
CREATE INDEX IF NOT EXISTS idx_sales_po_number ON sales(po_number);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'sales')
    )
  );

CREATE POLICY "Users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'sales')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'sales')
    )
  );

CREATE POLICY "Users can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can view PO items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create PO items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'sales')
    )
  );

CREATE POLICY "Users can update PO items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'sales')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'sales')
    )
  );

CREATE POLICY "Users can delete PO items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_order_items;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_orders_updated_at();
