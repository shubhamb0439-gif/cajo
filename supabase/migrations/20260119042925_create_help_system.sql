/*
  # Create Help System

  1. New Tables
    - `help_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., "Inventory", "Purchases")
      - `icon` (text) - Icon name for display
      - `order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `help_articles`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `title` (text) - Article title
      - `content` (text) - Article content in markdown
      - `type` (text) - Type: 'knowledgebase', 'faq', 'howto'
      - `tags` (text array) - Searchable tags
      - `order` (integer) - Display order within category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - All authenticated users can read help content
    - Only admins can manage help content
*/

-- Create help_categories table
CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'Folder',
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create help_articles table
CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES help_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('knowledgebase', 'faq', 'howto')),
  tags text[] DEFAULT '{}',
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Policies for help_categories
CREATE POLICY "Authenticated users can read help categories"
  ON help_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert help categories"
  ON help_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update help categories"
  ON help_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete help categories"
  ON help_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for help_articles
CREATE POLICY "Authenticated users can read help articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert help articles"
  ON help_articles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update help articles"
  ON help_articles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete help articles"
  ON help_articles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_type ON help_articles(type);
CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON help_articles USING gin(tags);
