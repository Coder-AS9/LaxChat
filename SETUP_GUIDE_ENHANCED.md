# 🚀 LaxChat Setup Guide - Enhanced Version

## Quick Start (5 Minutes)

### Step 1: Update Supabase Database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Copy the entire contents of `supabase-schema-enhanced.sql`
6. Paste into the SQL Editor
7. Click **"Run"** or press `Ctrl+Enter`

⚠️ **WARNING**: This will delete existing data! If you want to keep data, manually add the new tables instead.

### Step 2: Verify Database Setup

Run these verification queries in SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

-- Should return 6 tables
```

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

-- All should show rowsecurity = true
```

```sql
-- Check if policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'messages', 'chat_requests', 'groups', 'typing_indicators', 'favorite_chats');

-- Should show 24 policies (4 per table)
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from:
- Supabase Dashboard → Settings → API
- Copy **Project URL** and **anon/public key**

### Step 5: Run the App

```bash
npm run dev
```

Open http://localhost:5173

---

## 🎯 What's New in This Version

### ✅ New Features Added

1. **Dashboard/Home Screen**
   - Welcome dashboard after login
   - Quick action buttons
   - Recent chats display
   - Groups overview
   - Statistics cards

2. **Dark Mode** 🌙
   - Toggle between light/dark themes
   - Persistent preference
   - Full dark mode support

3. **Online Status** 🟢🔴
   - Real-time online/offline indicators
   - Automatic status updates
   - Last seen tracking

4. **Typing Indicators** ⌨️
   - "User is typing..." notifications
   - Real-time updates
   - Auto-clears after inactivity

5. **Group Chat** 👥
   - Create groups
   - Add/remove members
   - Group messaging
   - Member management

6. **Message Search** 🔍
   - Search across all messages
   - Click to view in context
   - Works in all chats

7. **Pinned Messages** 📌
   - Pin important messages
   - Quick access
   - Visual indicators

8. **Favorite Chats** ⭐
   - Mark chats as favorites
   - Quick access
   - Star indicators

### 🔜 Coming Soon (UI Only)

- 🎤 Voice Messages
- 📹 Video Calling
- 📞 Audio Calling
- 📍 Location Sharing
- 🤖 AI Chat Assistant

These features have UI placeholders but require additional backend infrastructure.

---

## 📊 Database Schema

### New Tables

1. **groups** - Group chat data
   - id, name, created_by
   - members (UUID array)
   - created_at

2. **typing_indicators** - Typing status
   - id, user_id, chat_id
   - is_typing, updated_at

3. **favorite_chats** - Favorite conversations
   - id, user_id, chat_id
   - created_at

### Enhanced Tables

1. **users** - Added presence fields
   - is_online (boolean)
   - last_seen (timestamp)

2. **messages** - Added group and pin support
   - group_id (UUID, nullable)
   - is_pinned (boolean)

---

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub:
```bash
git add .
git commit -m "Add enhanced features: dashboard, dark mode, groups, typing indicators"
git push origin master
```

2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click "Deploy"

### Deploy to Netlify

1. Push code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Import your GitHub repository
4. Add environment variables in Site settings
5. Deploy

---

## 🧪 Testing the New Features

### Test Dashboard
1. Login to the app
2. You should see the dashboard (not find users page)
3. Check quick action buttons
4. View recent chats and groups
5. Check statistics cards

### Test Dark Mode
1. Click moon/sun icon on dashboard
2. Theme should toggle
3. Refresh page - theme should persist
4. Navigate to chat - dark mode should work there too

### Test Online Status
1. Open app in two browser tabs
2. Login as different users
3. Check online indicators
4. Close one tab - status should update

### Test Typing Indicators
1. Open chat with another user
2. Start typing in one tab
3. Other tab should show "typing..." indicator
4. Stop typing - indicator should disappear after 5 seconds

### Test Group Chat
1. Click "Create Group" on dashboard
2. Enter group name
3. Select members
4. Send messages to group
5. Add/remove members

### Test Message Search
1. Click search icon
2. Enter search term
3. View results
4. Click to view in context

### Test Pinned Messages
1. Hover over a message
2. Click pin icon
3. Message should be pinned
4. Access pinned messages from menu

### Test Favorite Chats
1. Click star icon next to a chat
2. Chat should be marked as favorite
3. Access favorites from dashboard

---

## 🐛 Troubleshooting

### Issue: "Table doesn't exist" error
**Solution**: Run the enhanced schema SQL in Supabase SQL Editor

### Issue: Dark mode not working
**Solution**: Clear browser cache and reload

### Issue: Typing indicators not showing
**Solution**: Check browser console for errors, verify typing_indicators table exists

### Issue: Groups not loading
**Solution**: Verify groups table exists and has proper RLS policies

### Issue: Online status not updating
**Solution**: Check browser console for errors, verify users table has is_online and last_seen columns

---

## 📝 Migration from Previous Version

If you have existing data:

1. **Backup your data** first
2. Run the enhanced schema (will delete existing data)
3. OR manually add new tables:

```sql
-- Add new columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Add new columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create new tables
CREATE TABLE IF NOT EXISTS groups (...);
CREATE TABLE IF NOT EXISTS typing_indicators (...);
CREATE TABLE IF NOT EXISTS favorite_chats (...);
```

---

## 🎨 Customization

### Change Dashboard Layout
Edit `src/components/Dashboard.tsx`

### Add More Emojis
Edit `EMOJI_CATEGORIES` in `src/components/Chat.tsx`

### Customize Colors
Edit `tailwind.config.js`

### Change Feature Status
Edit `features` array in `src/components/Dashboard.tsx`

---

## 📚 Documentation

- **COMPLETE_FEATURE_GUIDE.md** - Full feature documentation
- **README.md** - Project overview
- **QUICKSTART.md** - Quick start guide
- **DEPLOYMENT.md** - Deployment instructions

---

## ✅ Checklist

Before deploying:

- [ ] Run enhanced schema in Supabase
- [ ] Verify all tables exist
- [ ] Verify RLS policies exist
- [ ] Test all new features locally
- [ ] Configure environment variables
- [ ] Test dark mode
- [ ] Test online status
- [ ] Test typing indicators
- [ ] Test group chat
- [ ] Test message search
- [ ] Test pinned messages
- [ ] Test favorite chats
- [ ] Push to GitHub
- [ ] Deploy to Vercel/Netlify
- [ ] Test in production

---

## 🎉 You're All Set!

Your LaxChat app now has:
- ✅ Dashboard with quick actions
- ✅ Dark mode support
- ✅ Online status indicators
- ✅ Typing indicators
- ✅ Group chat functionality
- ✅ Message search
- ✅ Pinned messages
- ✅ Favorite chats
- ✅ All previous features (emoji, media, image viewer, etc.)

**Happy Chatting!** 💬
