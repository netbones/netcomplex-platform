import { z } from 'zod';

const phoneRegex = /^[\d\s\-+()]{7,20}$/;

const localeContentSchema = z.record(z.string(), z.string());

export const contentSchema = z
  .object({
    title: localeContentSchema,
    content: localeContentSchema,
    excerpt: localeContentSchema.optional(),
    category: z.enum([
      'NEWS',
      'ANNOUNCEMENT',
      'EVENT',
      'BLOG',
      'SERVICE',
      'RESOURCE',
      'CAMPAIGN',
      'CONSERVATION',
    ]),
    groupId: z.string().optional().nullable(),
    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed'),
    featured: z.boolean(),
    published: z.boolean(),
    defaultLocale: z.string().min(2, 'Default locale is required').max(5),
    contentType: z.enum(['article', 'campaign']),
    publishedAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
  })
  .refine(
    data => {
      const title = data.title || {};
      const hasAnyTitle = Object.values(title).some(t => t.trim().length > 0);
      return hasAnyTitle;
    },
    { message: 'At least one language must have a title', path: ['title'] }
  )
  .refine(
    data => {
      const content = data.content || {};
      const hasAnyContent = Object.values(content).some(c => c.trim().length > 0);
      return hasAnyContent;
    },
    { message: 'At least one language must have content', path: ['content'] }
  );

export type ContentFormData = z.infer<typeof contentSchema>;

/**
 * Zod schema for community group form validation.
 * @property name - Group name (1-100 chars)
 * @property description - Group description (max 1000 chars, optional)
 * @property category - Group category
 * @property isPublic - Whether group is publicly visible
 */
export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long').trim(),
  description: z.string().max(1000, 'Description too long').trim().optional(),
  category: z.string().min(1, 'Category is required'),
  isPublic: z.boolean(),
});

export type GroupFormData = z.infer<typeof groupSchema>;

/**
 * Zod schema for maintenance request form validation.
 * @property category - Type of maintenance issue
 * @property priority - Urgency level
 * @property description - Detailed description (10-2000 chars)
 * @property preferredDate - Optional preferred service date
 * @property preferredTime - Optional preferred service time
 */
export const maintenanceRequestSchema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim(),
  preferredDate: z
    .string()
    .optional()
    .refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Date must be in YYYY-MM-DD format',
    }),
  preferredTime: z
    .string()
    .optional()
    .refine(val => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
      message: 'Time must be in HH:MM 24-hour format',
    }),
  images: z.array(z.string().url()).max(5).optional().default([]),
});

export type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

/**
 * Zod schema for facility booking form validation.
 * @property facility - Facility to book
 * @property date - Booking date
 * @property startTime - Start time
 * @property endTime - End time
 * @property purpose - Purpose of booking (optional, max 500 chars)
 */
export const bookingSchema = z
  .object({
    facility: z.enum(['POOL', 'GYM', 'COMMUNITY_CENTER', 'TENNIS', 'BBQ_AREA']),
    date: z
      .string()
      .min(1, 'Date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z
      .string()
      .min(1, 'Start time is required')
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM 24-hour format'),
    endTime: z
      .string()
      .min(1, 'End time is required')
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM 24-hour format'),
    purpose: z.string().max(500, 'Purpose too long').trim().optional().default(''),
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    data => {
      const today = new Date().toISOString().split('T')[0];
      return data.date >= today;
    },
    { message: 'Cannot book for past dates', path: ['date'] }
  );

export type BookingFormData = z.infer<typeof bookingSchema>;

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
  phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().or(z.literal('')),
  interests: z.array(z.string().max(50)).max(20, 'Maximum 20 interests').default([]),
  isPublic: z.boolean(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

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
    type: z.enum(['TEXT', 'IMAGE', 'SYSTEM']).optional().default('TEXT'),
    mediaUrl: z.string().url().optional(),
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
  type: z.enum(['DIRECT', 'GROUP']).optional().default('DIRECT'),
  participantIds: z
    .array(z.string().uuid('Invalid participant ID'))
    .min(2, 'At least 2 participants required'),
});

export type ConversationFormData = z.infer<typeof conversationSchema>;

/**
 * Zod schema for event form validation.
 * @property title - Event title
 * @property description - Event description
 * @property startDate - Event start date/time
 * @property endDate - Event end date/time
 * @property location - Event location
 * @property maxAttendees - Maximum attendees (optional)
 */
export const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
    description: z.string().max(2000, 'Description too long').trim().optional().default(''),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Start date required (YYYY-MM-DDTHH:MM)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'End date required (YYYY-MM-DDTHH:MM)'),
    location: z.string().max(200, 'Location too long').trim().optional().default(''),
    maxAttendees: z.number().int().positive().max(10000).optional(),
    requiresRegistration: z.boolean().default(false),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  })
  .refine(data => new Date(data.startDate) >= new Date(), {
    message: 'Cannot create events in the past',
    path: ['startDate'],
  });

export type EventFormData = z.infer<typeof eventSchema>;

/**
 * Zod schema for survey form validation.
 * @property title - Survey title
 * @property description - Survey description
 * @property questions - Array of questions
 * @property expiresAt - Expiration date
 */
export const surveySchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
    description: z.string().max(1000, 'Description too long').trim().optional().default(''),
    questions: z
      .array(
        z.object({
          id: z.string().optional(),
          text: z.string().min(1, 'Question text is required').max(500),
          type: z.enum(['TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE']),
          options: z.array(z.string()).optional(),
          required: z.boolean().default(false),
          order: z.number().int().nonnegative(),
        })
      )
      .min(1, 'At least one question is required'),
    expiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiration date must be YYYY-MM-DD')
      .optional(),
    allowMultipleResponses: z.boolean().default(false),
    showResults: z.boolean().default(true),
  })
  .refine(data => !data.expiresAt || data.expiresAt >= new Date().toISOString().split('T')[0], {
    message: 'Expiration date cannot be in the past',
    path: ['expiresAt'],
  });

export type SurveyFormData = z.infer<typeof surveySchema>;

/**
 * Zod schema for platform signup form validation.
 * @property communityName - Community name (required)
 * @property subdomain - URL subdomain (required, lowercase alphanumeric + hyphens, min 3 chars)
 * @property firstName - Admin first name (required)
 * @property lastName - Admin last name (required)
 * @property email - Admin email address (required, valid email)
 * @property phone - Admin phone number (optional)
 * @property password - Admin password (required, min 8 chars)
 * @property confirmPassword - Password confirmation (must match password)
 * @property plan - Subscription tier (foundation/depth/core)
 */
export const signupSchema = z
  .object({
    communityName: z.string().min(1, 'Community name is required').max(100, 'Name too long').trim(),
    subdomain: z
      .string()
      .min(1, 'Subdomain is required')
      .min(3, 'Subdomain must be at least 3 characters')
      .max(50, 'Subdomain too long')
      .regex(
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        'Subdomain must start and end with alphanumeric, contain only lowercase letters, numbers, and hyphens'
      ),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').trim(),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').trim(),
    email: z.string().min(1, 'Email is required').email('Invalid email address').toLowerCase(),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    plan: z.enum(['foundation', 'depth', 'core']),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

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
});

export type AdminCompetitionFormData = z.infer<typeof adminCompetitionSchema>;
