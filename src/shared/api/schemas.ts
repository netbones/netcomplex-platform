import { z } from 'zod';

// ─── Entity-Owned Schema Re-exports ───────────────────────────────────────
// Schemas are now defined in their respective entity modules.
// This file re-exports them for backward compatibility during migration.

export {
  contentSchema,
  groupSchema,
  surveySchema,
  announcementSchema,
} from '@entities/content/schema';
export type {
  ContentFormData,
  GroupFormData,
  SurveyFormData,
  AnnouncementFormData,
} from '@entities/content/schema';

export { bookingSchema } from '@entities/booking/schema';
export type { BookingFormData } from '@entities/booking/schema';

export { eventSchema, adminEventSchema, adminCompetitionSchema } from '@entities/events/schema';
export type {
  EventFormData,
  AdminEventFormData,
  AdminCompetitionFormData,
} from '@entities/events/schema';

export { maintenanceRequestSchema } from '@entities/maintenance/schema';
export type { MaintenanceRequestFormData } from '@entities/maintenance/schema';

export { signupSchema } from '@entities/tenant/schema';
export type { SignupFormData } from '@entities/tenant/schema';

export { messageSchema, conversationSchema } from '@entities/chat/schema';
export type { MessageFormData, ConversationFormData } from '@entities/chat/schema';

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
