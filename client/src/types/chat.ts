export interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  currentRoom?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  isPrivate: boolean;
  members: string[];
  blockedUsers: string[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'image';
  imageUrl?: string;
  timestamp: Date;
  avatar?: string;
}

export interface TypingUser {
  userId: string;
  username: string;
}
