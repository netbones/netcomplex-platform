import { z } from 'zod';

/**
 * Zod schema for message creation validation.
 * @property conversationId - ID of the conversation
 * @property content - Message content (1-2000 chars)
 * @property type - Message type (defaults to TEXT)
 */
export const messageSchema = z
  .object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
    content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
    type: z.enum(['TEXT', 'IMAGE', 'SYSTEM', 'VOICE', 'FILE']).optional().default('TEXT'),
    mediaUrl: z.string().url().optional(),
    messageVersion: z.number().int().positive().optional().default(1),
    payload: z.record(z.unknown()).optional(),
  })
  .refine(
    data => {
      if (data.type === 'IMAGE') {
        return !!data.mediaUrl;
      }
      return true;
    },
    {
      message: 'Image URL is required for IMAGE messages',
    }
  );

export type MessageFormData = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long').trim(),
  type: z.enum(['DIRECT', 'GROUP', 'SECURE_DIRECT', 'SECURE_GROUP']).optional().default('DIRECT'),
  participantIds: z
    .array(z.string().uuid('Invalid participant ID'))
    .min(2, 'At least 2 participants required'),
});

export type ConversationFormData = z.infer<typeof conversationSchema>;
