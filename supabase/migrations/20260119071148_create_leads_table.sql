/*
  # Create Sales Leads System

  ## Overview
  Creates a comprehensive leads management system for tracking sales opportunities from initial contact through conversion.

  ## 1. New Tables
  
  ### `leads`
  - `id` (uuid, primary key) - Unique identifier for each lead
  - `lead_name` (text, required) - Full name of the lead contact
  - `lead_email` (text, nullable) - Email address
  - `lead_phone` (text, nullable) - Phone number
  - `lead_company` (text, nullable) - Company name
  - `lead_position` (text, nullable) - Job title/position
  - `lead_status` (text, required) - Current status of the lead
  - `lead_source` (text, nullable) - How the lead was acquired
  - `lead_value` (numeric, nullable) - Estimated deal value
  - `lead_notes` (text, nullable) - Additional notes and details
  - `assigned_to` (uuid, nullable) - User assigned to this lead
  - `created_at` (timestamptz) - When the lead was created
  - `created_by` (uuid) - User who created the lead
  - `updated_at` (timestamptz) - Last update timestamp
  - `updated_by` (uuid) - User who last updated the lead

  ## 2. Security
  - Enable RLS on `leads` table
  - Add policies for authenticated users to:
    - View all leads
    - Create new leads
    - Update leads
    - Delete leads
  
  ## 3. Indexes
  - Index on `lead_status` for filtering
  - Index on `assigned_to` for filtering by user
  - Index on `created_at` for sorting

  ## 4. Notes
  - Lead statuses: 'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
  - Lead sources: 'website', 'referral', 'social_media', 'cold_call', 'email', 'event', 'other'
  - All operations will be logged in activity_logs table
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name text NOT NULL,
  lead_email text,
  lead_phone text,
  lead_company text,
  lead_position text,
  lead_status text NOT NULL DEFAULT 'new',
  lead_source text,
  lead_value numeric(10,2),
  lead_notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Add check constraint for valid statuses
ALTER TABLE leads ADD CONSTRAINT valid_lead_status 
  CHECK (lead_status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all leads
CREATE POLICY "Authenticated users can view all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create leads
CREATE POLICY "Authenticated users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Authenticated users can update leads
CREATE POLICY "Authenticated users can update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = updated_by);

-- Policy: Authenticated users can delete leads
CREATE POLICY "Authenticated users can delete leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (true);