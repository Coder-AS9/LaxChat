export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  password: string;
  createdAt: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}
