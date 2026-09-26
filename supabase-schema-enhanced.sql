-- ============================================
-- LaxChat - Enhanced Schema with New Features
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS favorite_chats CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE (Enhanced with presence)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  avatar TEXT NOT NULL DEFAULT '😎',
  color TEXT NOT NULL DEFAULT 'bg-indigo-500',
  password TEXT NOT NULL,
  profile_image TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE (Enhanced with groups and pinning)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT message_receiver CHECK (
    (receiver_id IS NOT NULL AND group_id IS NULL) OR
    (receiver_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_reverse ON messages(receiver_id, sender_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_messages_pinned ON messages(is_pinned);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  members UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_members ON groups USING GIN (members);

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
-- TYPING INDICATORS TABLE
-- ============================================
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

CREATE INDEX idx_typing_chat ON typing_indicators(chat_id);
CREATE INDEX idx_typing_updated ON typing_indicators(updated_at);

-- ============================================
-- FAVORITE CHATS TABLE
-- ============================================
CREATE TABLE favorite_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

CREATE INDEX idx_favorites_user ON favorite_chats(user_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_chats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Enable select for all users" ON users;
DROP POLICY IF EXISTS "Enable update for all users" ON users;
DROP POLICY IF EXISTS "Enable delete for all users" ON users;

CREATE POLICY "Enable insert for all users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable update for all users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON users FOR DELETE TO anon, authenticated USING (true);

-- Messages policies
DROP POLICY IF EXISTS "Enable insert for all users" ON messages;
DROP POLICY IF EXISTS "Enable select for all users" ON messages;
DROP POLICY IF EXISTS "Enable update for all users" ON messages;
DROP POLICY IF EXISTS "Enable delete for all users" ON messages;

CREATE POLICY "Enable insert for all users" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable update for all users" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON messages FOR DELETE TO anon, authenticated USING (true);

-- Groups policies
DROP POLICY IF EXISTS "Enable insert for all users" ON groups;
DROP POLICY IF EXISTS "Enable select for all users" ON groups;
DROP POLICY IF EXISTS "Enable update for all users" ON groups;
DROP POLICY IF EXISTS "Enable delete for all users" ON groups;

CREATE POLICY "Enable insert for all users" ON groups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON groups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable update for all users" ON groups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON groups FOR DELETE TO anon, authenticated USING (true);

-- Chat requests policies
DROP POLICY IF EXISTS "Enable insert for all users" ON chat_requests;
DROP POLICY IF EXISTS "Enable select for all users" ON chat_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON chat_requests;
DROP POLICY IF EXISTS "Enable delete for all users" ON chat_requests;

CREATE POLICY "Enable insert for all users" ON chat_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON chat_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable update for all users" ON chat_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON chat_requests FOR DELETE TO anon, authenticated USING (true);

-- Typing indicators policies
DROP POLICY IF EXISTS "Enable insert for all users" ON typing_indicators;
DROP POLICY IF EXISTS "Enable select for all users" ON typing_indicators;
DROP POLICY IF EXISTS "Enable update for all users" ON typing_indicators;
DROP POLICY IF EXISTS "Enable delete for all users" ON typing_indicators;

CREATE POLICY "Enable insert for all users" ON typing_indicators FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON typing_indicators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable update for all users" ON typing_indicators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON typing_indicators FOR DELETE TO anon, authenticated USING (true);

-- Favorite chats policies
DROP POLICY IF EXISTS "Enable insert for all users" ON favorite_chats;
DROP POLICY IF EXISTS "Enable select for all users" ON favorite_chats;
DROP POLICY IF EXISTS "Enable update for all users" ON favorite_chats;
DROP POLICY IF EXISTS "Enable delete for all users" ON favorite_chats;

CREATE POLICY "Enable insert for all users" ON favorite_chats FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON favorite_chats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable update for all users" ON favorite_chats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON favorite_chats FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

-- ============================================
-- DONE! Your enhanced LaxChat database is ready.
-- ============================================
