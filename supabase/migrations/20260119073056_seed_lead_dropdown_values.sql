/*
  # Seed Lead Dropdown Values

  1. New Data
    - Populates dropdown_values table with default lead statuses
    - Populates dropdown_values table with default lead sources
  
  2. Lead Statuses Added
    - New
    - Contacted
    - Qualified
    - Proposal
    - Negotiation
    - Won
    - Lost
  
  3. Lead Sources Added
    - Website
    - Referral
    - Social Media
    - Cold Call
    - Email
    - Event
    - Other
*/

-- Insert default lead statuses
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('lead_status', 'New'),
  ('lead_status', 'Contacted'),
  ('lead_status', 'Qualified'),
  ('lead_status', 'Proposal'),
  ('lead_status', 'Negotiation'),
  ('lead_status', 'Won'),
  ('lead_status', 'Lost')
ON CONFLICT DO NOTHING;

-- Insert default lead sources
INSERT INTO dropdown_values (drop_type, drop_value) VALUES
  ('lead_source', 'Website'),
  ('lead_source', 'Referral'),
  ('lead_source', 'Social Media'),
  ('lead_source', 'Cold Call'),
  ('lead_source', 'Email'),
  ('lead_source', 'Event'),
  ('lead_source', 'Other')
ON CONFLICT DO NOTHING;