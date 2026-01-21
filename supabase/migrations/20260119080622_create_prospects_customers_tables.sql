/*
  # Create Prospects and Customers Tables

  1. New Tables
    - `prospects`
      - `id` (uuid, primary key)
      - `prospect_name` (text, required)
      - `prospect_email` (text)
      - `prospect_phone` (text)
      - `prospect_company` (text)
      - `prospect_position` (text)
      - `prospect_status` (text, required)
      - `prospect_source` (text)
      - `prospect_value` (numeric)
      - `prospect_notes` (text)
      - `assigned_to` (uuid, references auth.users)
      - `created_by` (uuid, references auth.users)
      - `updated_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `original_lead_id` (uuid) - tracks where this came from

    - `customers`
      - `id` (uuid, primary key)
      - `customer_name` (text, required)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_company` (text)
      - `customer_position` (text)
      - `customer_status` (text, required)
      - `customer_source` (text)
      - `customer_value` (numeric)
      - `customer_notes` (text)
      - `assigned_to` (uuid, references auth.users)
      - `created_by` (uuid, references auth.users)
      - `updated_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `original_prospect_id` (uuid) - tracks where this came from

  2. Dropdown Values
    - Update constraint to allow prospect_status and customer_status
    - Add prospect_status values
    - Add customer_status values

  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name text NOT NULL,
  prospect_email text,
  prospect_phone text,
  prospect_company text,
  prospect_position text,
  prospect_status text NOT NULL DEFAULT 'qualified',
  prospect_source text,
  prospect_value numeric(12, 2),
  prospect_notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  original_lead_id uuid
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_company text,
  customer_position text,
  customer_status text NOT NULL DEFAULT 'active',
  customer_source text,
  customer_value numeric(12, 2),
  customer_notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  original_prospect_id uuid
);

-- Enable RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Prospects policies
CREATE POLICY "Authenticated users can view all prospects"
  ON prospects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert prospects"
  ON prospects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prospects"
  ON prospects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prospects"
  ON prospects FOR DELETE
  TO authenticated
  USING (true);

-- Customers policies
CREATE POLICY "Authenticated users can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Update dropdown_values constraint to include new types
ALTER TABLE dropdown_values DROP CONSTRAINT IF EXISTS dropdown_values_drop_type_check;
ALTER TABLE dropdown_values ADD CONSTRAINT dropdown_values_drop_type_check 
  CHECK (drop_type IN ('vendor_group', 'vendor_currency', 'item_group', 'item_class', 'lead_status', 'lead_source', 'prospect_status', 'customer_status'));

-- Add dropdown values for prospect statuses
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('prospect_status', 'qualified'),
  ('prospect_status', 'contacted'),
  ('prospect_status', 'demo_scheduled'),
  ('prospect_status', 'demo_completed'),
  ('prospect_status', 'proposal_sent'),
  ('prospect_status', 'negotiation'),
  ('prospect_status', 'won'),
  ('prospect_status', 'lost')
ON CONFLICT (drop_type, drop_value) DO NOTHING;

-- Add dropdown values for customer statuses
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('customer_status', 'active'),
  ('customer_status', 'inactive'),
  ('customer_status', 'at_risk'),
  ('customer_status', 'churned')
ON CONFLICT (drop_type, drop_value) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(prospect_status);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(customer_status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
