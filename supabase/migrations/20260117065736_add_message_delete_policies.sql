/*
  # Add DELETE policies for messaging tables

  1. Changes
    - Add DELETE policy for messages table (admin only)
    - Add DELETE policy for message_attachments table (admin only)
    - Add DELETE policy for message_reads table (admin only)

  2. Security
    - Only admin users can delete messages and related data
    - This enables system reset functionality for admins
*/

-- Messages DELETE policy
CREATE POLICY "Admin can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Message attachments DELETE policy
CREATE POLICY "Admin can delete message attachments"
  ON message_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Message reads DELETE policy
CREATE POLICY "Admin can delete message reads"
  ON message_reads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );
