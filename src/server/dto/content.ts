import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const contentDto = z.object({
  id: z.string(),
  title: z.unknown(),
  excerpt: z.unknown().nullable(),
  content: z.unknown(),
  image: z.string().nullable(),
  category: z.string(),
  tags: z.array(z.string()),
  published: z.boolean(),
  featured: z.boolean(),
  priority: z.string(),
  defaultLocale: z.string(),
  contentType: z.string(),
  viewCount: z.number(),
  commentsEnabled: z.boolean(),
  publishedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const contentAuthorDto = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

export const announcementDto = z.object({
  id: z.string(),
  title: z.unknown(),
  content: z.string(),
  author: z.string(),
  priority: z.string(),
  targetFilter: z.string(),
  targetRoles: z.array(z.string()),
  resourceId: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  expiresAt: dateSchema.nullable(),
});

export type ContentDto = z.infer<typeof contentDto>;
export type ContentAuthorDto = z.infer<typeof contentAuthorDto>;
export type AnnouncementDto = z.infer<typeof announcementDto>;
