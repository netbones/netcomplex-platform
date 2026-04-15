export type ConversationType = 'DIRECT' | 'GROUP';

export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM';

export interface ParticipantInfo {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string | null;
  lastReadMessageId?: string | null;
  user: ParticipantInfo;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
  expiresAt?: string | null;
  isDeleted?: boolean;
  mediaUrl?: string | null;
}

export interface Conversation {
  id: string;
  name: string | null;
  type: ConversationType;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

export interface ConversationListItem {
  id: string;
  name: string | null;
  type: ConversationType;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

export interface CreateConversationData {
  name: string | null;
  type: ConversationType;
  participantIds: string[];
}

export interface FindConversationData {
  participantIds: string[];
}

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  mediaUrl?: string | null;
  createdAt: string;
  sender: ParticipantInfo;
}

export interface MessageFormData {
  conversationId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
}

export interface UseChatOptions {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
}

export interface UseDirectChatOptions {
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  currentUserName: string;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  typingUsers: string[];
  onlineCount: number;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  sendMessage: (content: string, type?: string, mediaUrl?: string) => Promise<boolean>;
  handleInputChange: (value: string, setValue: (v: string) => void) => void;
  sendTypingIndicator: (isTyping: boolean) => Promise<void>;
  formatTypingUsers: () => string | null;
}

export interface DirectChatState extends ChatState {
  conversationId: string | null;
  isReady: boolean;
}
