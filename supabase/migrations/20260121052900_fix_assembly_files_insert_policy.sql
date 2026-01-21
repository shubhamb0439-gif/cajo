/*
  # Fix Assembly Files Insert Policy

  1. Changes
    - Update INSERT policy for assembly_files to allow authenticated users to insert files
    - Set uploaded_by to auth.uid() automatically if not provided
    - This fixes the RLS violation when uploading files

  2. Security
    - Authenticated users can upload files to any assembly unit
    - The uploaded_by field is automatically set to the authenticated user's ID
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert assembly files" ON assembly_files;

-- Create new insert policy that allows authenticated users to insert
-- and automatically sets uploaded_by to their user ID
CREATE POLICY "Authenticated users can insert assembly files"
  ON assembly_files FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
  );

-- Add a trigger to automatically set uploaded_by if not provided
CREATE OR REPLACE FUNCTION set_uploaded_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_uploaded_by_trigger ON assembly_files;
CREATE TRIGGER set_uploaded_by_trigger
  BEFORE INSERT ON assembly_files
  FOR EACH ROW
  EXECUTE FUNCTION set_uploaded_by();
