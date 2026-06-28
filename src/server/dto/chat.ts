import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { conversations } from '@/db/schema/conversations';
import { messages } from '@/db/schema/messages';

const dateSchema = z.date().transform(d => d.toISOString());

export const conversationDto = createSelectSchema(conversations, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({ id: true, name: true, type: true, createdAt: true, updatedAt: true });

export const messageDto = createSelectSchema(messages, {
  createdAt: dateSchema,
}).pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  type: true,
  messageVersion: true,
  payload: true,
  mediaUrl: true,
  createdAt: true,
});

export const conversationDetailDto = conversationDto.extend({
  lastMessage: messageDto.nullable().optional(),
  participantIds: z.array(z.string()).optional(),
  unreadCount: z.number().optional(),
});

export const unreadCountsDto = z.object({
  unreadCounts: z.record(z.string(), z.number()),
  totalUnread: z.number(),
});

export type ConversationDto = z.infer<typeof conversationDto>;
export type MessageDto = z.infer<typeof messageDto>;
export type ConversationDetailDto = z.infer<typeof conversationDetailDto>;
export type UnreadCountsDto = z.infer<typeof unreadCountsDto>;
