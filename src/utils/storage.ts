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
