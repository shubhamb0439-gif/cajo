/*
  # Create Messaging System

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to users)
      - `receiver_id` (uuid, foreign key to users)
      - `content` (text, message text content)
      - `created_at` (timestamptz)
    
    - `message_attachments`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `file_url` (text, storage URL)
      - `file_type` (text, e.g., 'image', 'video')
      - `file_name` (text)
      - `created_at` (timestamptz)
    
    - `message_reads`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `user_id` (uuid, foreign key to users)
      - `read_at` (timestamptz)

  2. Storage
    - Create `message-media` bucket for photos/videos

  3. Security
    - Enable RLS on all tables
    - Users can read messages they sent or received
    - Users can create messages
    - Users can mark messages as read
    - Users can upload to message-media bucket
    - Admin users can view all messages
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages they sent or received"
  ON messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE id IN (sender_id, receiver_id)
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = sender_id)
  );

CREATE POLICY "Admin can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Message attachments policies
CREATE POLICY "Users can view attachments for their messages"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_id
      AND auth.uid() IN (
        SELECT auth_user_id FROM users WHERE id IN (messages.sender_id, messages.receiver_id)
      )
    )
  );

CREATE POLICY "Users can create attachments for their messages"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_id
      AND auth.uid() = (SELECT auth_user_id FROM users WHERE id = messages.sender_id)
    )
  );

-- Message reads policies
CREATE POLICY "Users can view read status for their messages"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users 
      WHERE id IN (
        user_id,
        (SELECT sender_id FROM messages WHERE id = message_id),
        (SELECT receiver_id FROM messages WHERE id = message_id)
      )
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- Create storage bucket for message media
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-media', 'message-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-media bucket
CREATE POLICY "Users can upload message media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'message-media');

CREATE POLICY "Users can view message media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'message-media');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);