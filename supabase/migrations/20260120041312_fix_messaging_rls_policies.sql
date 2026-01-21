/*
  # Fix Messaging System RLS Policies

  ## Problem
  The RLS policies were comparing sender_id/receiver_id (which reference users.id) 
  directly with auth.uid() (which returns auth_user_id). These are different columns,
  causing all message operations to fail.

  ## Solution
  Update all policies to properly join through the users table to map auth.uid() to users.id

  ## Changes
  1. Drop existing incorrect policies
  2. Create correct policies that properly map auth_user_id to users.id
  3. Fix policies for messages, message_attachments, and message_reads tables
*/

-- Drop existing incorrect policies on messages table
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Create correct policies for messages table
CREATE POLICY "Users can view messages they sent or received"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Drop and recreate message_attachments policies
DROP POLICY IF EXISTS "Users can view attachments for their messages" ON message_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their messages" ON message_attachments;

CREATE POLICY "Users can view attachments for their messages"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND (
        m.sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        m.receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create attachments for their messages"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND m.sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Drop and recreate message_reads policies
DROP POLICY IF EXISTS "Users can view read status for their messages" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;

CREATE POLICY "Users can view read status for their messages"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND (
        m.sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        m.receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );