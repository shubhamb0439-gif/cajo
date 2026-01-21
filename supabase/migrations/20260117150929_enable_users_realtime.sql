/*
  # Enable Realtime for Users Table

  1. Changes
    - Enable realtime replication on the `users` table
    - This allows the frontend to subscribe to user profile changes in real-time

  2. Purpose
    - When an admin changes a user's role, rights, or enabled status
    - The affected user's session will be updated immediately
    - If a user is disabled, they will be signed out automatically
    - If a user's role changes, they will be redirected to the appropriate dashboard

  3. Security
    - Users can only subscribe to changes for their own profile via RLS
    - The existing RLS policies control what data is accessible
*/

-- Enable realtime replication on the users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;