import { User, Message, ChatRequest } from '../types';

const USERS_KEY = 'laxchat_users';
const MESSAGES_KEY = 'laxchat_messages';
const REQUESTS_KEY = 'laxchat_requests';
const CURRENT_USER_KEY = 'laxchat_current_user';

// ---- Users ----
export function getUsers(): User[] {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function addUser(user: User) {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

export function updateUser(updatedUser: User) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === updatedUser.id);
  if (idx !== -1) {
    users[idx] = updatedUser;
    saveUsers(users);
  }
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function getUserByName(name: string): User | undefined {
  return getUsers().find(u => u.name.toLowerCase() === name.toLowerCase());
}

// ---- Current User ----
export function getCurrentUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// ---- Messages ----
export function getMessages(): Message[] {
  const data = localStorage.getItem(MESSAGES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveMessages(messages: Message[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function addMessage(message: Message) {
  const messages = getMessages();
  messages.push(message);
  saveMessages(messages);
}

export function getConversation(userId1: string, userId2: string): Message[] {
  return getMessages().filter(
    m =>
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
  );
}

// Mark messages as seen
export function markMessagesAsSeen(receiverId: string, senderId: string) {
  const messages = getMessages();
  let changed = false;
  messages.forEach(m => {
    if (m.senderId === senderId && m.receiverId === receiverId && m.status !== 'seen') {
      m.status = 'seen';
      changed = true;
    }
  });
  if (changed) {
    saveMessages(messages);
  }
}

// ---- Chat Requests ----
export function getRequests(): ChatRequest[] {
  const data = localStorage.getItem(REQUESTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveRequests(requests: ChatRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export function getChatRequest(fromUserId: string, toUserId: string): ChatRequest | undefined {
  return getRequests().find(
    r => r.fromUserId === fromUserId && r.toUserId === toUserId
  );
}

export function getChatRequestBetween(userId1: string, userId2: string): ChatRequest | undefined {
  return getRequests().find(
    r =>
      (r.fromUserId === userId1 && r.toUserId === userId2) ||
      (r.fromUserId === userId2 && r.toUserId === userId1)
  );
}

export function createChatRequest(fromUserId: string, toUserId: string): ChatRequest {
  const existing = getChatRequest(fromUserId, toUserId);
  if (existing) return existing;

  const request: ChatRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromUserId,
    toUserId,
    status: 'pending',
    timestamp: Date.now(),
  };
  const requests = getRequests();
  requests.push(request);
  saveRequests(requests);
  return request;
}

export function updateChatRequest(requestId: string, status: 'accepted' | 'rejected') {
  const requests = getRequests();
  const req = requests.find(r => r.id === requestId);
  if (req) {
    req.status = status;
    saveRequests(requests);
  }
}

export function areUsersConnected(userId1: string, userId2: string): boolean {
  const req = getChatRequestBetween(userId1, userId2);
  return req?.status === 'accepted';
}

export function getPendingRequestsForUser(userId: string): ChatRequest[] {
  return getRequests().filter(r => r.toUserId === userId && r.status === 'pending');
}

export function getSentRequestsForUser(userId: string): ChatRequest[] {
  return getRequests().filter(r => r.fromUserId === userId && r.status === 'pending');
}

// ---- BroadcastChannel for real-time sync ----
let channel: BroadcastChannel | null = null;

export function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel('laxchat_sync');
  }
  return channel;
}

export function broadcastUpdate(type: 'message' | 'user' | 'logout' | 'request' | 'seen') {
  getChannel().postMessage({ type, timestamp: Date.now() });
}

export function onBroadcast(callback: (data: { type: string; timestamp: number }) => void) {
  const ch = getChannel();
  ch.onmessage = (event) => callback(event.data);
  return () => { ch.onmessage = null; };
}

export function onStorageChange(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (
      e.key === MESSAGES_KEY ||
      e.key === USERS_KEY ||
      e.key === CURRENT_USER_KEY ||
      e.key === REQUESTS_KEY
    ) {
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
