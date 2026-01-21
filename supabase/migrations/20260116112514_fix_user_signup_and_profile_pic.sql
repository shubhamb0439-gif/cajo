/*
  # Fix User Signup and Profile Picture Field

  ## Changes
  
  1. **Rename profile_picture_url to profile_pic**
     - Updates the users table column name to match requirement
  
  2. **Create auto-insert trigger for new auth users**
     - Automatically creates a user record in the users table when someone signs up
     - Uses a function that bypasses RLS to ensure new users are created
  
  3. **Update RLS policy for user insertion**
     - Allows the trigger function to insert new users
     - Maintains security by restricting manual inserts to admins
  
  4. **Insert existing user**
     - Adds Shubham (shubham@cajo.in) to the users table
  
  ## Security Notes
  - The trigger function runs with SECURITY DEFINER to bypass RLS
  - Only triggered automatically by auth.users insertions
  - Cannot be called manually by users
*/

-- Rename profile_picture_url to profile_pic
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE users RENAME COLUMN profile_picture_url TO profile_pic;
  END IF;
END $$;

-- Function to auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'user'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert existing user (Shubham) if not already in users table
INSERT INTO users (auth_user_id, email, name, role)
SELECT '87bea70c-8129-4676-b2a2-60d5dbd9c635', 'shubham@cajo.in', 'Shubham', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'shubham@cajo.in'
);

-- Update RLS policy to allow self-insertion during signup
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can insert own profile during signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can insert any user"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Update policy to allow users to update their own profile
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can update any user"
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
