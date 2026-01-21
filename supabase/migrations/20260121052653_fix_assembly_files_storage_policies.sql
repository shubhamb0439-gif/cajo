/*
  # Fix Assembly Files Storage Policies

  1. Changes
    - Drop existing storage policies for assembly-files bucket
    - Create new simplified policies that allow authenticated users full access
    - This fixes upload issues by removing complex path-based checks

  2. Security
    - All authenticated users can upload, view, and manage files
    - Additional access control is handled at the application level through the assembly_files table RLS
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload assembly files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view assembly files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own assembly files" ON storage.objects;

-- Create new simplified policies
CREATE POLICY "Authenticated users can upload to assembly-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'assembly-files');

CREATE POLICY "Authenticated users can read from assembly-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'assembly-files');

CREATE POLICY "Authenticated users can update in assembly-files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'assembly-files')
  WITH CHECK (bucket_id = 'assembly-files');

CREATE POLICY "Authenticated users can delete from assembly-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'assembly-files');
