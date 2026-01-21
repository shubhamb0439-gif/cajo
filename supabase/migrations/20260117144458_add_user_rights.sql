/*
  # Add User Rights Field

  1. Changes
    - Add `user_rights` column to `users` table
      - Type: text with check constraint (read_only or read_write)
      - Default: 'read_write' (full access by default)
    - Update existing users to have 'read_write' rights

  2. Security
    - Only users can read their own rights
    - No policies for updating rights (will be handled by admin functions)
*/

-- Add user_rights column with constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_rights'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN user_rights text DEFAULT 'read_write' NOT NULL
    CHECK (user_rights IN ('read_only', 'read_write'));
  END IF;
END $$;

-- Update existing users to have read_write access by default
UPDATE users 
SET user_rights = 'read_write' 
WHERE user_rights IS NULL;

-- Add comment
COMMENT ON COLUMN users.user_rights IS 'User access level: read_only or read_write';