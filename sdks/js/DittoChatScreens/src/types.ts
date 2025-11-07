export interface User {
  id: number;
  name: string;
  avatarUrl: string;
  isActive?: boolean;
}

export interface Reaction {
  emoji: string;
  userIds: number[];
  count: number;
}

export interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: string;
  reactions: Reaction[];
  edited?: boolean;
}

export type ChatType = "dm" | "group";

export interface Chat {
  id: number | string;
  type: ChatType;
  name?: string;
  participants: number[];
  messages: Message[];
  unread?: boolean;
}
