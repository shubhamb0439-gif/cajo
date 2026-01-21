/*
  # Add Manager Role to Users

  ## Overview
  Adds support for the "manager" role - a client-facing role with admin privileges
  within the client interface. Managers are linked to specific customers and can
  access enhanced features within the Customer Dashboard.

  ## Changes

  ### `users` table
  - Update role constraint to include 'manager'
  - Managers must be linked to a customer (via customer_id)

  ## Role Definitions
  - **admin**: Full system access, internal staff
  - **user**: Standard internal staff access
  - **client**: Customer portal access, read-only or limited access
  - **manager**: Customer portal access with admin privileges for their customer

  ## Important Notes
  1. Manager role is similar to client role but with additional privileges
  2. Both client and manager roles must be linked to a customer
  3. Managers get access to Settings and other admin-like features in client interface
  4. Managers can only manage data for their assigned customer
*/

-- Update the role constraint to include 'manager'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'client'::text, 'manager'::text]));

-- Add a comment to clarify the roles
COMMENT ON COLUMN users.role IS 'User role: admin (full access), user (standard staff), client (customer portal), manager (customer portal admin)';
