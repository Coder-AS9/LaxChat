-- ============================================
-- LaxChat - FIXED Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- This version has explicit RLS policies that WORK
-- ============================================

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  avatar TEXT NOT NULL DEFAULT '😎',
  color TEXT NOT NULL DEFAULT 'bg-indigo-500',
  password TEXT NOT NULL,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster conversation lookups
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_reverse ON messages(receiver_id, sender_id);

-- ============================================
-- CHAT REQUESTS TABLE
-- ============================================
CREATE TABLE chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE EXPLICIT RLS POLICIES FOR USERS TABLE
-- These policies allow anonymous access for registration/login
-- ============================================

-- DROP any existing policies first
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Enable select for all users" ON users;
DROP POLICY IF EXISTS "Enable update for all users" ON users;
DROP POLICY IF EXISTS "Enable delete for all users" ON users;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- CREATE explicit policies for each operation
CREATE POLICY "Enable insert for all users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Enable select for all users"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Enable update for all users"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- CREATE EXPLICIT RLS POLICIES FOR MESSAGES TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable insert for all users" ON messages;
DROP POLICY IF EXISTS "Enable select for all users" ON messages;
DROP POLICY IF EXISTS "Enable update for all users" ON messages;
DROP POLICY IF EXISTS "Enable delete for all users" ON messages;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;

CREATE POLICY "Enable insert for all users"
  ON messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Enable select for all users"
  ON messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Enable update for all users"
  ON messages
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
  ON messages
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- CREATE EXPLICIT RLS POLICIES FOR CHAT_REQUESTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable insert for all users" ON chat_requests;
DROP POLICY IF EXISTS "Enable select for all users" ON chat_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON chat_requests;
DROP POLICY IF EXISTS "Enable delete for all users" ON chat_requests;
DROP POLICY IF EXISTS "Allow all operations on chat_requests" ON chat_requests;

CREATE POLICY "Enable insert for all users"
  ON chat_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Enable select for all users"
  ON chat_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Enable update for all users"
  ON chat_requests
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
  ON chat_requests
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify the setup:
-- ============================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'messages', 'chat_requests');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'messages', 'chat_requests');

-- Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'messages', 'chat_requests');

-- ============================================
-- DONE! Your LaxChat database is now properly configured.
-- Registration and login should work correctly.
-- ============================================
