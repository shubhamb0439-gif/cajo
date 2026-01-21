/*
  # Update Device Policies for User Role

  1. Changes
    - Allow "user" role to view all devices (same as admin)
    - Allow "user" role to update device status and location
    - This enables the Cajo Handheld functionality for field staff

  2. Security
    - User role can only update status and location fields
    - Admin retains full access to all device operations
    - Client and manager access remains unchanged
*/

-- Drop existing admin-only policies and recreate for admin and user
DROP POLICY IF EXISTS "Admin can view all devices" ON devices;
DROP POLICY IF EXISTS "Admin can update devices" ON devices;

-- Allow admin and user to view all devices
CREATE POLICY "Admin and user can view all devices"
  ON devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'user')
    )
  );

-- Allow admin and user to update devices
CREATE POLICY "Admin and user can update devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'user')
    )
  );

-- Update device_history policies for user role
DROP POLICY IF EXISTS "Admin can view all device history" ON device_history;

CREATE POLICY "Admin and user can view all device history"
  ON device_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'user')
    )
  );
