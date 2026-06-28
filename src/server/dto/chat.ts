import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const conversationDto = z.object({
  id: z.string(),
  name: z.string().nullable(),
  type: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const messageDto = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  type: z.string(),
  messageVersion: z.number(),
  payload: z.unknown().nullable(),
  mediaUrl: z.string().nullable(),
  createdAt: dateSchema,
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
export type ConversationDetailDto = z.infer<typeof conversationDetailDto>;
export type MessageDto = z.infer<typeof messageDto>;
export type UnreadCountsDto = z.infer<typeof unreadCountsDto>;
