import { z } from 'zod';

// ─── Entity-Owned Schema Re-exports ───────────────────────────────────────
// Schemas are now defined in their respective entity modules.
// This file re-exports them for backward compatibility during migration.

export { contentSchema, groupSchema, announcementSchema } from '@entities/content';
export { surveySchema } from '@entities/survey';
export type { ContentFormData, GroupFormData, AnnouncementFormData } from '@entities/content';
export type { SurveyFormData } from '@entities/survey';

export { bookingSchema } from '@entities/booking';
export type { BookingFormData } from '@entities/booking';

export { eventSchema, adminEventSchema, adminCompetitionSchema } from '@entities/events';
export type { EventFormData, AdminEventFormData, AdminCompetitionFormData } from '@entities/events';

export { maintenanceRequestSchema } from '@entities/maintenance';
export type { MaintenanceRequestFormData } from '@entities/maintenance';

export { signupSchema } from '@entities/tenant';
export type { SignupFormData } from '@entities/tenant';

export { messageSchema, conversationSchema } from '@entities/chat';
export type { MessageFormData, ConversationFormData } from '@entities/chat';

// ─── Shared Schemas (no entity module yet) ────────────────────────────────

const phoneRegex = /^[\d\s\-+()]{7,20}$/;

/**
 * Zod schema for user profile form validation.
 * @property name - Display name (required, max 100 chars)
 * @property street - Street address (optional)
 * @property unit - Unit number (optional)
 * @property phone - Phone number (optional)
 * @property interests - Array of user interests
 * @property isPublic - Whether profile is publicly visible
 * TODO: Move to @entities/user/schema when user entity has an api/ module
 */
export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  street: z.string().max(200).trim().optional().default(''),
  unit: z.string().max(20).trim().optional().default(''),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().or(z.literal('')),
  interests: z.array(z.string().max(50)).max(20, 'Maximum 20 interests').default([]),
  isPublic: z.boolean(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
