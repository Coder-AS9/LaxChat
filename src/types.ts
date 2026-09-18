export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: number;
}
