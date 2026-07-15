import { z } from 'zod';

/**
 * Zod schema for admin event form validation.
 * Matches the Event model: title, description, date, location, organizer, image, isPublic.
 */
export const adminEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description too long')
    .trim(),
  date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date must be YYYY-MM-DDTHH:MM'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long').trim(),
  organizer: z.string().min(1, 'Organizer is required').max(200, 'Organizer too long').trim(),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  isPublic: z.boolean(),
  category: z.string().optional().nullable(),
  maxAttendees: z.coerce.number().int().positive().optional().nullable(),
});

export type AdminEventFormData = z.infer<typeof adminEventSchema>;

/**
 * Zod schema for admin competition form validation.
 * Matches the Competition model: title, description, rules, prizeInfo, startDate, endDate, image.
 */
export const adminCompetitionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(5000, 'Description too long').trim().optional().or(z.literal('')),
  rules: z.string().max(10000, 'Rules too long').trim().optional().or(z.literal('')),
  prizeInfo: z.string().max(2000, 'Prize info too long').trim().optional().or(z.literal('')),
  startDate: z
    .string()
    .min(1, 'Start date is required')
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date must be YYYY-MM-DDTHH:MM'),
  endDate: z
    .string()
    .min(1, 'End date is required')
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date must be YYYY-MM-DDTHH:MM'),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED']),
  type: z.enum(['RAFFLE', 'PHOTO', 'SCORE']),
  winnersCount: z.number().int().min(1).max(100),
  maxParticipants: z.number().int().min(1).optional().nullable(),
});

export type AdminCompetitionFormData = z.infer<typeof adminCompetitionSchema>;
