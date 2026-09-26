import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Message, ChatRequest } from '../types';

// Helper function to check if Supabase is configured
function checkSupabaseConfig(): boolean {
  if (!isSupabaseConfigured) {
    console.error('❌ Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
    return false;
  }
  return true;
}

// ============================================
// USERS
// ============================================

export async function getUsers(): Promise<User[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

export async function addUser(user: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
  if (!checkSupabaseConfig()) return null;

  console.log('🔍 addUser: Starting user creation...');
  console.log('🔍 addUser: Inserting user data:', {
    name: user.name,
    avatar: user.avatar,
    color: user.color,
    password: user.password ? '[SET]' : '[NOT SET]',
    profile_image: user.profileImage ? '[HAS IMAGE]' : null,
  });
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        avatar: user.avatar,
        color: user.color,
        password: user.password,
        profile_image: user.profileImage || null,
      })
      .select()
      .single();

    console.log('🔍 addUser: Supabase response - data:', data);
    console.log('🔍 addUser: Supabase response - error:', error);

    if (error) {
      console.error('❌ addUser: Supabase returned error:', error);
      console.error('❌ addUser: Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }

    if (!data) {
      console.error('❌ addUser: No data returned from Supabase (but no error either)');
      return null;
    }

    console.log('✅ addUser: User successfully created in Supabase:', data);
    const mappedUser = mapUserFromDB(data);
    console.log('✅ addUser: Mapped user object:', mappedUser);
    return mappedUser;
  } catch (err) {
    console.error('💥 addUser: Exception thrown:', err);
    console.error('💥 addUser: Exception details:', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }
}

export async function updateUser(updatedUser: User): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('users')
    .update({
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      color: updatedUser.color,
      profile_image: updatedUser.profileImage || null,
    })
    .eq('id', updatedUser.id);

  if (error) {
    console.error('Error updating user:', error);
    return false;
  }

  return true;
}

export async function getUserById(id: string): Promise<User | null> {
  if (!checkSupabaseConfig()) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapUserFromDB(data);
}

export async function getUserByName(name: string): Promise<User | null> {
  if (!checkSupabaseConfig()) return null;

  console.log('🔍 getUserByName: Searching for user:', name);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', name)
    .single();

  console.log('🔍 getUserByName: Result - data:', data);
  console.log('🔍 getUserByName: Result - error:', error);

  if (error) {
    console.log('🔍 getUserByName: Error occurred (user not found or DB error):', error.message);
    return null;
  }

  if (!data) {
    console.log('🔍 getUserByName: No data returned (user not found)');
    return null;
  }

  const user = mapUserFromDB(data);
  console.log('✅ getUserByName: User found:', user);
  return user;
}

// ============================================
// MESSAGES
// ============================================

export async function getMessages(): Promise<Message[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data || []).map(mapMessageFromDB);
}

export async function addMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
  if (!checkSupabaseConfig()) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: message.senderId,
      receiver_id: message.receiverId,
      text: message.text,
      status: message.status,
      is_pinned: message.isPinned || false,
      group_id: message.groupId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }

  return mapMessageFromDB(data);
}

export async function getConversation(userId1: string, userId2: string): Promise<Message[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching conversation:', error);
    return [];
  }

  return (data || []).map(mapMessageFromDB);
}

export async function markMessagesAsSeen(receiverId: string, senderId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('messages')
    .update({ status: 'seen' })
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .neq('status', 'seen');

  if (error) {
    console.error('Error marking messages as seen:', error);
    return false;
  }

  return true;
}

// ============================================
// CHAT REQUESTS
// ============================================

export async function getRequests(): Promise<ChatRequest[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('chat_requests')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }

  return (data || []).map(mapRequestFromDB);
}

export async function getChatRequestBetween(userId1: string, userId2: string): Promise<ChatRequest | null> {
  if (!checkSupabaseConfig()) return null;

  const { data, error } = await supabase
    .from('chat_requests')
    .select('*')
    .or(`and(from_user_id.eq.${userId1},to_user_id.eq.${userId2}),and(from_user_id.eq.${userId2},to_user_id.eq.${userId1})`)
    .single();

  if (error || !data) {
    return null;
  }

  return mapRequestFromDB(data);
}

export async function createChatRequest(fromUserId: string, toUserId: string): Promise<ChatRequest | null> {
  if (!checkSupabaseConfig()) return null;

  // Check if request already exists
  const existing = await getChatRequestBetween(fromUserId, toUserId);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('chat_requests')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat request:', error);
    return null;
  }

  return mapRequestFromDB(data);
}

export async function updateChatRequest(requestId: string, status: 'accepted'): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('chat_requests')
    .update({ status })
    .eq('id', requestId);

  if (error) {
    console.error('Error updating chat request:', error);
    return false;
  }

  return true;
}

export async function deleteChatRequest(requestId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('chat_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Error deleting chat request:', error);
    return false;
  }

  return true;
}

export async function areUsersConnected(userId1: string, userId2: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const req = await getChatRequestBetween(userId1, userId2);
  return req?.status === 'accepted';
}

export async function getPendingRequestsForUser(userId: string): Promise<ChatRequest[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('chat_requests')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return (data || []).map(mapRequestFromDB);
}

// ============================================
// GROUPS
// ============================================

export async function createGroup(name: string, createdBy: string, members: string[]): Promise<any | null> {
  if (!checkSupabaseConfig()) return null;

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      created_by: createdBy,
      members,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating group:', error);
    return null;
  }

  return data;
}

export async function getGroups(userId: string): Promise<any[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .contains('members', [userId])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching groups:', error);
    return [];
  }

  return data || [];
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { data: group, error: fetchError } = await supabase
    .from('groups')
    .select('members')
    .eq('id', groupId)
    .single();

  if (fetchError || !group) return false;

  const members = group.members || [];
  if (members.includes(userId)) return true;

  const { error } = await supabase
    .from('groups')
    .update({ members: [...members, userId] })
    .eq('id', groupId);

  if (error) {
    console.error('Error adding member to group:', error);
    return false;
  }

  return true;
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { data: group, error: fetchError } = await supabase
    .from('groups')
    .select('members')
    .eq('id', groupId)
    .single();

  if (fetchError || !group) return false;

  const members = (group.members || []).filter((m: string) => m !== userId);

  const { error } = await supabase
    .from('groups')
    .update({ members })
    .eq('id', groupId);

  if (error) {
    console.error('Error removing member from group:', error);
    return false;
  }

  return true;
}

export async function getGroupMessages(groupId: string): Promise<Message[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching group messages:', error);
    return [];
  }

  return (data || []).map(mapMessageFromDB);
}

// ============================================
// TYPING INDICATORS
// ============================================

export async function setTypingStatus(userId: string, chatId: string, isTyping: boolean): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('typing_indicators')
    .upsert({
      user_id: userId,
      chat_id: chatId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error setting typing status:', error);
    return false;
  }

  return true;
}

export async function getTypingUsers(chatId: string): Promise<any[]> {
  if (!checkSupabaseConfig()) return [];

  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

  const { data, error } = await supabase
    .from('typing_indicators')
    .select('*')
    .eq('chat_id', chatId)
    .eq('is_typing', true)
    .gte('updated_at', fiveSecondsAgo);

  if (error) {
    console.error('Error fetching typing users:', error);
    return [];
  }

  return data || [];
}

// ============================================
// ONLINE PRESENCE
// ============================================

export async function setUserPresence(userId: string, isOnline: boolean): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('users')
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error setting user presence:', error);
    return false;
  }

  return true;
}

export async function getUserPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: number } | null> {
  if (!checkSupabaseConfig()) return null;

  const { data, error } = await supabase
    .from('users')
    .select('is_online, last_seen')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    isOnline: data.is_online || false,
    lastSeen: data.last_seen ? new Date(data.last_seen).getTime() : 0,
  };
}

// ============================================
// PINNED MESSAGES
// ============================================

export async function pinMessage(messageId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: true })
    .eq('id', messageId);

  if (error) {
    console.error('Error pinning message:', error);
    return false;
  }

  return true;
}

export async function unpinMessage(messageId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: false })
    .eq('id', messageId);

  if (error) {
    console.error('Error unpinning message:', error);
    return false;
  }

  return true;
}

export async function getPinnedMessages(chatId: string): Promise<Message[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pinned messages:', error);
    return [];
  }

  return (data || []).map(mapMessageFromDB);
}

// ============================================
// FAVORITE CHATS
// ============================================

export async function addFavoriteChat(userId: string, chatId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('favorite_chats')
    .insert({
      user_id: userId,
      chat_id: chatId,
    });

  if (error) {
    console.error('Error adding favorite chat:', error);
    return false;
  }

  return true;
}

export async function removeFavoriteChat(userId: string, chatId: string): Promise<boolean> {
  if (!checkSupabaseConfig()) return false;

  const { error } = await supabase
    .from('favorite_chats')
    .delete()
    .eq('user_id', userId)
    .eq('chat_id', chatId);

  if (error) {
    console.error('Error removing favorite chat:', error);
    return false;
  }

  return true;
}

export async function getFavoriteChats(userId: string): Promise<string[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('favorite_chats')
    .select('chat_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorite chats:', error);
    return [];
  }

  return (data || []).map((f: any) => f.chat_id);
}

// ============================================
// MESSAGE SEARCH
// ============================================

export async function searchMessages(userId: string, query: string): Promise<Message[]> {
  if (!checkSupabaseConfig()) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},text.ilike.%${query}%),and(receiver_id.eq.${userId},text.ilike.%${query}%)`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error searching messages:', error);
    return [];
  }

  return (data || []).map(mapMessageFromDB);
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

// Mock subscription object for when Supabase is not configured
const mockSubscription = {
  unsubscribe: () => {},
};

export function subscribeToMessages(callback: (message: Message) => void) {
  if (!checkSupabaseConfig()) return mockSubscription;

  return supabase
    .channel('messages-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const message = mapMessageFromDB(payload.new);
        callback(message);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      (payload) => {
        const message = mapMessageFromDB(payload.new);
        callback(message);
      }
    )
    .subscribe();
}

export function subscribeToChatRequests(callback: (request: ChatRequest) => void) {
  if (!checkSupabaseConfig()) return mockSubscription;

  return supabase
    .channel('chat-requests-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_requests' },
      (payload) => {
        const request = mapRequestFromDB(payload.new);
        callback(request);
      }
    )
    .subscribe();
}

export function subscribeToUsers(callback: (user: User) => void) {
  if (!checkSupabaseConfig()) return mockSubscription;

  return supabase
    .channel('users-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        const user = mapUserFromDB(payload.new);
        callback(user);
      }
    )
    .subscribe();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapUserFromDB(dbUser: any): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    avatar: dbUser.avatar,
    color: dbUser.color,
    password: dbUser.password,
    profileImage: dbUser.profile_image,
    createdAt: new Date(dbUser.created_at).getTime(),
    isOnline: dbUser.is_online || false,
    lastSeen: dbUser.last_seen ? new Date(dbUser.last_seen).getTime() : 0,
  };
}

function mapMessageFromDB(dbMessage: any): Message {
  return {
    id: dbMessage.id,
    senderId: dbMessage.sender_id,
    receiverId: dbMessage.receiver_id,
    text: dbMessage.text,
    status: dbMessage.status,
    timestamp: new Date(dbMessage.created_at).getTime(),
    isPinned: dbMessage.is_pinned || false,
    groupId: dbMessage.group_id || null,
  };
}

function mapRequestFromDB(dbRequest: any): ChatRequest {
  return {
    id: dbRequest.id,
    fromUserId: dbRequest.from_user_id,
    toUserId: dbRequest.to_user_id,
    status: dbRequest.status,
    timestamp: new Date(dbRequest.created_at).getTime(),
  };
}
