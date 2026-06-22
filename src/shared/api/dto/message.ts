import type { InferSelectModel } from 'drizzle-orm';
import { messages } from '../db';

// API-safe message shape
export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  messageVersion: number;
  payload: Record<string, unknown> | null;
  mediaUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

// Maps a Drizzle message row to MessageDTO
export function toMessageDTO(message: InferSelectModel<typeof messages>): MessageDTO {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    type: message.type,
    messageVersion: message.messageVersion ?? 1,
    payload: (message.payload as Record<string, unknown>) ?? null,
    mediaUrl: message.mediaUrl || null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    createdAt: message.createdAt?.toISOString() ?? new Date().toISOString(),
    expiresAt: message.expiresAt?.toISOString() ?? null,
  };
}

// Maps an array of Drizzle message rows to MessageDTO[]
export function toMessageDTOs(messageRows: InferSelectModel<typeof messages>[]): MessageDTO[] {
  return messageRows.map(toMessageDTO);
}
