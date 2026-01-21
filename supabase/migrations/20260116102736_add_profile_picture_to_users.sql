/*
  # Add Profile Picture Support to Users

  ## Changes
  - Add profile_picture_url column to users table for storing user profile pictures
  - Column is nullable to allow users without profile pictures

  ## Notes
  - Profile pictures will be stored in Supabase Storage
  - This column stores the public URL to the profile picture
*/

-- Add profile picture URL column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture_url text;
  END IF;
END $$;
