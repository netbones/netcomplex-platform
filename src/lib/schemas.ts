import { z } from 'zod';

/** Schema for content/announcement form validation */
export const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt too long').optional().default(''),
  category: z.enum(['NEWS', 'ANNOUNCEMENT', 'EVENT', 'BLOG']),
  groupId: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  featured: z.boolean(),
  published: z.boolean(),
});

export type ContentFormData = z.infer<typeof contentSchema>;

/**
 * Zod schema for community group form validation.
 * @property name - Group name (1-100 chars)
 * @property description - Group description (max 1000 chars, optional)
 * @property category - Group category
 * @property isPublic - Whether group is publicly visible
 */
export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().default(''),
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
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  preferredDate: z.string().optional().default(''),
  preferredTime: z.string().optional().default(''),
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
export const bookingSchema = z.object({
  facility: z.enum(['POOL', 'GYM', 'COMMUNITY_CENTER', 'TENNIS', 'BBQ_AREA']),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  purpose: z.string().max(500).optional().default(''),
});

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
  name: z.string().min(1, 'Name is required').max(100),
  street: z.string().optional().default(''),
  unit: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  interests: z.array(z.string()),
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
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  type: z.enum(['DIRECT', 'GROUP']).optional().default('DIRECT'),
  participantIds: z.array(z.string()).min(2, 'At least 2 participants required'),
});

export type ConversationFormData = z.infer<typeof conversationSchema>;

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
    communityName: z.string().min(1, 'Community name is required').max(100, 'Name too long'),
    subdomain: z
      .string()
      .min(1, 'Subdomain is required')
      .min(3, 'Subdomain must be at least 3 characters')
      .max(50, 'Subdomain too long')
      .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    plan: z.enum(['foundation', 'depth', 'core']),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;
