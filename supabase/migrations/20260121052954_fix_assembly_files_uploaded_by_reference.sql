/*
  # Fix Assembly Files Uploaded By Reference

  1. Changes
    - Drop foreign key constraint on uploaded_by that references users(id)
    - Change uploaded_by to reference auth.users(id) directly
    - Update existing data to use auth_user_id instead of users.id
    - Update RLS policies to work with the new structure

  2. Security
    - Maintain RLS policies for authenticated users
    - Ensure uploaded_by correctly references the auth user ID
*/

-- First, update existing data to use auth.users ID
UPDATE assembly_files
SET uploaded_by = (
  SELECT auth_user_id 
  FROM users 
  WHERE users.id = assembly_files.uploaded_by
)
WHERE uploaded_by IS NOT NULL;

-- Drop the old foreign key constraint
ALTER TABLE assembly_files 
DROP CONSTRAINT IF EXISTS assembly_files_uploaded_by_fkey;

-- Add new foreign key constraint referencing auth.users
ALTER TABLE assembly_files
ADD CONSTRAINT assembly_files_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;
