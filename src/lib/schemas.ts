import { z } from 'zod';

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

export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().default(''),
  category: z.string().min(1, 'Category is required'),
  isPublic: z.boolean(),
});

export type GroupFormData = z.infer<typeof groupSchema>;

export const maintenanceRequestSchema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  preferredDate: z.string().optional().default(''),
  preferredTime: z.string().optional().default(''),
});

export type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

export const bookingSchema = z.object({
  facility: z.enum(['POOL', 'GYM', 'COMMUNITY_CENTER', 'TENNIS', 'BBQ_AREA']),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  purpose: z.string().max(500).optional().default(''),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  street: z.string().optional().default(''),
  unit: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  interests: z.array(z.string()),
  isPublic: z.boolean(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
