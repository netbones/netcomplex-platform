import { z } from 'zod';

/** Schema for content/announcement form validation */
export const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt too long').optional().default(''),
  category: z.enum(['NEWS', 'ANNOUNCEMENT', 'EVENT', 'BLOG']),
  groupId: z.string().optional().default(''),
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
export const messageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  type: z.enum(['TEXT', 'IMAGE', 'SYSTEM']).optional().default('TEXT'),
});

export type MessageFormData = z.infer<typeof messageSchema>;
