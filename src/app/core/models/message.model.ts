export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  sentAt?: Date;
  isIncoming?: boolean;
  isRead?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  studentName?: string;
  role?: string;      // Student | Teacher | Parent
  className?: string;
}