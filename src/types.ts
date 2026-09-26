export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  password: string;
  createdAt: number;
  profileImage?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
  isPinned?: boolean;
  groupId?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
  senderName?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
  isPinned?: boolean;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted';
  timestamp: number;
}

export interface Group {
  id: string;
  name: string;
  avatar?: string;
  createdBy: string;
  members: string[];
  createdAt: number;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  chatId: string;
  isTyping: boolean;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: number;
}
