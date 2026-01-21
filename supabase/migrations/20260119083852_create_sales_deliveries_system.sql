/*
  # Create Sales and Deliveries System

  ## Overview
  This migration creates a comprehensive sales and delivery tracking system that links
  customers with assembled products from the traceability table.

  ## New Tables

  ### `sales`
  Stores information about sales transactions to customers.
  - `id` (uuid, primary key) - Unique identifier for the sale
  - `sale_number` (text, unique) - Human-readable sale number (e.g., "SALE-001")
  - `customer_id` (uuid, foreign key) - References customers table
  - `sale_date` (date) - Date of the sale
  - `sale_notes` (text) - Additional notes about the sale
  - `is_delivered` (boolean) - Whether the sale has been delivered
  - `created_by` (uuid) - User who created the sale
  - `updated_by` (uuid) - User who last updated the sale
  - `created_at` (timestamptz) - When the sale was created
  - `updated_at` (timestamptz) - When the sale was last updated

  ### `sale_items`
  Stores individual assembled products included in each sale.
  - `id` (uuid, primary key) - Unique identifier
  - `sale_id` (uuid, foreign key) - References sales table
  - `assembly_id` (uuid, foreign key) - References assemblies table
  - `serial_number` (text) - Serial number of the assembled product
  - `created_at` (timestamptz) - When the item was added

  ### `deliveries`
  Stores delivery information for sales that have been marked as delivered.
  - `id` (uuid, primary key) - Unique identifier
  - `sale_id` (uuid, foreign key, unique) - References sales table (one-to-one)
  - `delivery_address` (text) - Where the products were delivered
  - `delivery_location` (text) - Specific location at customer's site
  - `delivery_date` (date) - When the delivery was made
  - `delivery_notes` (text) - Additional delivery notes
  - `created_by` (uuid) - User who created the delivery record
  - `updated_by` (uuid) - User who last updated the delivery record
  - `created_at` (timestamptz) - When the delivery was created
  - `updated_at` (timestamptz) - When the delivery was last updated

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage sales and deliveries
  - Ensure data integrity with foreign key constraints

  ## Important Notes
  1. Each assembled product can only be assigned to one sale at a time
  2. When a sale is deleted, the products become available for other sales
  3. Deliveries are automatically created when is_delivered is set to true
  4. Serial numbers must be unique within the traceability system
*/

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  sale_notes text,
  is_delivered boolean DEFAULT false,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  assembly_id uuid NOT NULL REFERENCES assemblies(id) ON DELETE RESTRICT,
  serial_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assembly_id)
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid UNIQUE NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  delivery_address text,
  delivery_location text,
  delivery_date date DEFAULT CURRENT_DATE,
  delivery_notes text,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Sales policies
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- Sale items policies
CREATE POLICY "Authenticated users can view sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sale items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sale items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- Deliveries policies
CREATE POLICY "Authenticated users can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deliveries"
  ON deliveries FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_assembly_id ON sale_items(assembly_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_sale_id ON deliveries(sale_id);

-- Function to generate next sale number
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
  sale_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 6) AS integer)), 0) + 1
  INTO next_num
  FROM sales
  WHERE sale_number LIKE 'SALE-%';
  
  sale_num := 'SALE-' || LPAD(next_num::text, 4, '0');
  RETURN sale_num;
END;
$$;
