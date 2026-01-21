/*
  # Assembly Files System

  1. New Tables
    - `assembly_files`
      - `id` (uuid, primary key)
      - `assembly_unit_id` (uuid, references assembly_units)
      - `file_name` (text)
      - `file_path` (text, path in storage)
      - `file_size` (bigint, size in bytes)
      - `file_type` (text, mime type)
      - `uploaded_by` (uuid, references users)
      - `uploaded_at` (timestamptz)

  2. Storage
    - Create `assembly-files` bucket with public read access

  3. Security
    - Enable RLS on `assembly_files` table
    - Add policies for authenticated users to manage files
    - Set up storage policies for upload/download/delete
*/

-- Create assembly_files table
CREATE TABLE IF NOT EXISTS assembly_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_unit_id uuid NOT NULL REFERENCES assembly_units(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE assembly_files ENABLE ROW LEVEL SECURITY;

-- Policies for assembly_files
CREATE POLICY "Authenticated users can view assembly files"
  ON assembly_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assembly files"
  ON assembly_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated users can delete own assembly files"
  ON assembly_files FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Create storage bucket for assembly files
INSERT INTO storage.buckets (id, name, public)
VALUES ('assembly-files', 'assembly-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assembly-files bucket
CREATE POLICY "Authenticated users can upload assembly files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'assembly-files');

CREATE POLICY "Authenticated users can view assembly files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'assembly-files');

CREATE POLICY "Users can delete own assembly files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assembly-files' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assembly_files_unit_id ON assembly_files(assembly_unit_id);
CREATE INDEX IF NOT EXISTS idx_assembly_files_uploaded_by ON assembly_files(uploaded_by);
