/*
  # Create Foreign Exchange Rates System

  1. New Tables
    - `foreign_exchange_rates`
      - `id` (uuid, primary key) - Unique identifier
      - `currency_code` (text) - Currency code (e.g., 'EUR', 'USD')
      - `currency_name` (text) - Currency name (e.g., 'Euro', 'US Dollar')
      - `inr_per_unit` (numeric) - How many Indian Rupees per one unit of this currency
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid) - User who last updated this rate

  2. Security
    - Enable RLS on `foreign_exchange_rates` table
    - Authenticated users can read all rates
    - Only admin users can insert, update, or delete rates

  3. Initial Data
    - Seed with EUR at rate of 106 INR per Euro
*/

CREATE TABLE IF NOT EXISTS foreign_exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name text NOT NULL,
  inr_per_unit numeric(10,2) NOT NULL DEFAULT 1.00,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  CONSTRAINT positive_rate CHECK (inr_per_unit > 0)
);

ALTER TABLE foreign_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exchange rates"
  ON foreign_exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert exchange rates"
  ON foreign_exchange_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update exchange rates"
  ON foreign_exchange_rates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete exchange rates"
  ON foreign_exchange_rates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert initial EUR rate
INSERT INTO foreign_exchange_rates (currency_code, currency_name, inr_per_unit)
VALUES ('EUR', 'Euro', 106.00)
ON CONFLICT (currency_code) DO NOTHING;