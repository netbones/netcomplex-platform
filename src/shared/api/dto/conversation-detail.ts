import { z } from 'zod/v4';
import { conversationDto } from './conversation';
import { messageDto } from './message';

export const conversationDetailDto = conversationDto.extend({
  lastMessage: messageDto.nullable().optional(),
  participantIds: z.array(z.string()).optional(),
  unreadCount: z.number().optional(),
});

export type ConversationDetailDto = z.infer<typeof conversationDetailDto>;
