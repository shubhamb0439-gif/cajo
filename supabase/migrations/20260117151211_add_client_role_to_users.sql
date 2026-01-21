/*
  # Add Client Role to Users Table

  1. Changes
    - Modify the CHECK constraint on the users.role column to include 'client'
    - Previously only 'admin' and 'user' were allowed
    - Now 'admin', 'user', and 'client' are allowed

  2. Purpose
    - Enable the system to have a separate "client" role with limited access
    - Clients will have access to a dedicated dashboard with restricted functionality
    - This supports external stakeholders who need visibility but not full system access
*/

-- Drop the existing check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new check constraint with 'client' included
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'client'));