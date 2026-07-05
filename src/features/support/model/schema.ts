import { z } from 'zod';

export const supportTargetSchema = z.enum([
  'CONTENT',
  'RESOURCE',
  'EVENT',
  'GROUP',
  'SERVICE',
  'PROJECT',
  'CAMPAIGN',
  'PROFILE',
]);

export const createSupportSchema = z.object({
  targetType: supportTargetSchema,
  targetId: z.string().min(1, 'Target ID is required'),
  recipientUserId: z.string().min(1, 'Recipient is required'),
  chips: z
    .number()
    .int()
    .positive('Chips must be a positive integer')
    .max(10000, 'Maximum 10,000 chips per support'),
  message: z.string().max(280, 'Message must be 280 characters or less').optional(),
  isAnonymous: z.boolean().default(false),
});

export type CreateSupportInput = z.infer<typeof createSupportSchema>;
export type SupportTarget = z.infer<typeof supportTargetSchema>;

export const supportQuerySchema = z.object({
  targetType: supportTargetSchema,
  targetId: z.string().min(1, 'Target ID is required'),
});

export type SupportQueryInput = z.infer<typeof supportQuerySchema>;
