import type { InferSelectModel } from 'drizzle-orm';
import { conversations } from '../db';

// API-safe conversation shape
export interface ConversationDTO {
  id: string;
  name: string | null;
  type: string;
  capabilities: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// Maps a Drizzle conversation row to ConversationDTO
export function toConversationDTO(
  conversation: InferSelectModel<typeof conversations>
): ConversationDTO {
  return {
    id: conversation.id,
    name: conversation.name || null,
    type: conversation.type,
    capabilities: (conversation.capabilities as Record<string, unknown>) ?? null,
    createdAt: conversation.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: conversation.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle conversation rows to ConversationDTO[]
export function toConversationDTOs(
  conversationRows: InferSelectModel<typeof conversations>[]
): ConversationDTO[] {
  return conversationRows.map(toConversationDTO);
}
