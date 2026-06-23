import { z } from 'zod';

const localeContentSchema = z.record(z.string(), z.string());

/**
 * Zod schema for content (articles, campaigns, etc.) form validation.
 */
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
    contentType: z.enum(['article', 'campaign', 'document']),
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
 */
export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long').trim(),
  description: z.string().max(1000, 'Description too long').trim().optional(),
  category: z.string().min(1, 'Category is required'),
  isPublic: z.boolean(),
});

export type GroupFormData = z.infer<typeof groupSchema>;

/**
 * Zod schema for announcement form validation.
 */
export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long').trim(),
  author: z.string().min(1, 'Author is required').max(100, 'Author name too long').trim(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  targetFilter: z.enum(['ALL', 'OWNERS_ONLY', 'RENTERS_ONLY']).default('ALL'),
  targetRoles: z
    .array(
      z.enum([
        'RESIDENT',
        'GROUP_ADMIN',
        'COMMITTEE',
        'BOARD',
        'ADMIN',
        'AGENT',
        'MANAGER',
        'ASSOCIATE',
      ])
    )
    .default([]),
  resourceId: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;
