import { z } from 'zod';

/**
 * Zod schema for user profile form validation.
 * @property name - Display name (required, max 100 chars)
 * @property street - Street address (optional)
 * @property unit - Unit number (optional)
 * @property phone - Phone number (optional)
 * @property interests - Array of user interests
 * @property isPublic - Whether profile is publicly visible
 */
export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  street: z.string().max(200).trim().optional().default(''),
  unit: z.string().max(20).trim().optional().default(''),
  phone: z
    .string()
    .regex(/^[\d\s\-+()]{7,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  interests: z.array(z.string().max(50)).max(20, 'Maximum 20 interests').default([]),
  isPublic: z.boolean(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
