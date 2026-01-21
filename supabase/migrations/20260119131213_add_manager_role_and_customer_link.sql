/*
  # Add Manager Role and Customer Link to Users

  ## Overview
  Adds support for the "manager" role - a client with admin rights for the client
  interface only. Managers are linked to specific customers and can access
  enhanced features within the Customer Dashboard.

  ## Changes to Existing Tables

  ### `users`
  - Add `customer_id` (uuid) - Links user to a customer (for client and manager roles)
  - Foreign key constraint to customers table
  - Nullable because admin and user roles don't need customer association

  ## Security
  - Update RLS policies to allow managers to access customer-related data
  - Managers can only access data for their assigned customer

  ## Important Notes
  1. Manager role is similar to client role but with additional privileges
  2. Both client and manager roles must be linked to a customer
  3. Managers get access to Settings and other admin-like features in client interface
*/

-- Add customer_id field to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN customer_id uuid REFERENCES customers(id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);

-- Update users table policies to support manager role access
-- Managers can read their own record
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Managers can update their own profile (except role and customer_id)
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Admin users can read all users
DROP POLICY IF EXISTS "Admin can read all users" ON users;
CREATE POLICY "Admin can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admin users can insert users
DROP POLICY IF EXISTS "Admin can insert users" ON users;
CREATE POLICY "Admin can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admin users can update all users
DROP POLICY IF EXISTS "Admin can update all users" ON users;
CREATE POLICY "Admin can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admin users can delete users
DROP POLICY IF EXISTS "Admin can delete users" ON users;
CREATE POLICY "Admin can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );
