import { User, Message } from '../types';

const USERS_KEY = 'chatapp_users';
const MESSAGES_KEY = 'chatapp_messages';
const CURRENT_USER_KEY = 'chatapp_current_user';

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

// ---- BroadcastChannel for real-time sync ----
let channel: BroadcastChannel | null = null;

export function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel('chatapp_sync');
  }
  return channel;
}

export function broadcastUpdate(type: 'message' | 'user' | 'logout') {
  getChannel().postMessage({ type, timestamp: Date.now() });
}

export function onBroadcast(callback: (data: { type: string; timestamp: number }) => void) {
  const ch = getChannel();
  ch.onmessage = (event) => callback(event.data);
  return () => { ch.onmessage = null; };
}

// Also listen to storage events for cross-tab sync
export function onStorageChange(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === MESSAGES_KEY || e.key === USERS_KEY || e.key === CURRENT_USER_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
