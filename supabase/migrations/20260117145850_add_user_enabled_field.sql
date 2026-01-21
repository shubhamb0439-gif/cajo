/*
  # Add User Enabled Field

  1. Changes
    - Add `enabled` column to `users` table
      - Type: boolean
      - Default: false (users must be enabled by admin)
    - Update existing users to be enabled by default (backward compatibility)

  2. Security
    - Only users can read their own enabled status
    - Admins control the enabled field through the application

  3. Notes
    - New signups will have enabled=false by default
    - Existing users will be set to enabled=true
    - Login will check this field before allowing access
*/

-- Add enabled column with default false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Set existing users to enabled (backward compatibility)
UPDATE users 
SET enabled = true 
WHERE enabled IS NULL OR enabled = false;

-- Add comment
COMMENT ON COLUMN users.enabled IS 'Whether user is allowed to login. Must be set to true by admin.';