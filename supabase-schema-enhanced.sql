-- ============================================
-- LaxChat - Enhanced Schema (FIXED ORDER)
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Drop existing tables (in correct order to avoid dependency issues)
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS favorite_chats CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_requests CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 1. USERS TABLE (must be first - referenced by others)
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
-- 2. GROUPS TABLE (must be before messages)
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
-- 3. MESSAGES TABLE (references both users and groups)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_reverse ON messages(receiver_id, sender_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_messages_pinned ON messages(is_pinned);

-- ============================================
-- 4. CHAT REQUESTS TABLE
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
-- 5. TYPING INDICATORS TABLE
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
-- 6. FAVORITE CHATS TABLE
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
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_chats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES (drop first to avoid conflicts)
-- ============================================

-- Users
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

CREATE POLICY "users_insert" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users_select" ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "users_delete" ON users FOR DELETE TO anon, authenticated USING (true);

-- Groups
DROP POLICY IF EXISTS "groups_insert" ON groups;
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_update" ON groups;
DROP POLICY IF EXISTS "groups_delete" ON groups;

CREATE POLICY "groups_insert" ON groups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "groups_select" ON groups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "groups_update" ON groups FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "groups_delete" ON groups FOR DELETE TO anon, authenticated USING (true);

-- Messages
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_insert" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "messages_select" ON messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "messages_delete" ON messages FOR DELETE TO anon, authenticated USING (true);

-- Chat Requests
DROP POLICY IF EXISTS "chat_requests_insert" ON chat_requests;
DROP POLICY IF EXISTS "chat_requests_select" ON chat_requests;
DROP POLICY IF EXISTS "chat_requests_update" ON chat_requests;
DROP POLICY IF EXISTS "chat_requests_delete" ON chat_requests;

CREATE POLICY "chat_requests_insert" ON chat_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "chat_requests_select" ON chat_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chat_requests_update" ON chat_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_requests_delete" ON chat_requests FOR DELETE TO anon, authenticated USING (true);

-- Typing Indicators
DROP POLICY IF EXISTS "typing_insert" ON typing_indicators;
DROP POLICY IF EXISTS "typing_select" ON typing_indicators;
DROP POLICY IF EXISTS "typing_update" ON typing_indicators;
DROP POLICY IF EXISTS "typing_delete" ON typing_indicators;

CREATE POLICY "typing_insert" ON typing_indicators FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "typing_select" ON typing_indicators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "typing_update" ON typing_indicators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "typing_delete" ON typing_indicators FOR DELETE TO anon, authenticated USING (true);

-- Favorite Chats
DROP POLICY IF EXISTS "favorites_insert" ON favorite_chats;
DROP POLICY IF EXISTS "favorites_select" ON favorite_chats;
DROP POLICY IF EXISTS "favorites_update" ON favorite_chats;
DROP POLICY IF EXISTS "favorites_delete" ON favorite_chats;

CREATE POLICY "favorites_insert" ON favorite_chats FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "favorites_select" ON favorite_chats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "favorites_update" ON favorite_chats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "favorites_delete" ON favorite_chats FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- ============================================
-- VERIFICATION (run these to check)
-- ============================================

-- Should return 6 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

-- Should show 24 policies (4 per table)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats')
GROUP BY tablename;

-- ============================================
-- DONE! ✅
-- ============================================
