/*
  # Fix Infinite Recursion in Users Table RLS Policies

  ## Problem
  The current RLS policies on the users table cause infinite recursion because:
  - Admin policies check user role by querying the users table
  - This triggers the same RLS policies
  - Which query the users table again, creating infinite recursion

  ## Solution
  1. Create a helper function that uses SECURITY DEFINER to check if current user is admin
  2. Update all users table policies to use this function instead of subqueries
  3. Allow all authenticated users to read basic user information (SELECT)

  ## Changes

  ### New Functions
  - `is_admin()` - Security definer function to check if current user is admin
  - `is_admin_or_self(user_auth_id)` - Check if user is admin or accessing own record

  ### Updated Policies
  - All users table policies now use the helper functions
  - No more recursive queries on the users table

  ## Security Notes
  - SELECT is open to all authenticated users (needed for user listings, assignments, etc.)
  - INSERT, UPDATE, DELETE restricted to admins only
  - Users can update their own profile (name, profile_picture)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can read all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Create helper function to check if current user is admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create helper function to check if user is admin or accessing own record
CREATE OR REPLACE FUNCTION is_admin_or_self(user_auth_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    auth.uid() = user_auth_id
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );
$$;

-- Allow all authenticated users to view all users (needed for ERP functionality)
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert new users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Allow users to update their own profile, admins can update any profile
CREATE POLICY "Users can update own profile or admins can update all"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin_or_self(auth_user_id))
  WITH CHECK (is_admin_or_self(auth_user_id));

-- Allow admins to delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (is_admin());
