import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { contents } from '@/db/schema/contents';
import { announcements } from '@/db/schema/announcements';

const dateSchema = z.date().transform(d => d.toISOString());

export const contentDto = createSelectSchema(contents, {
  publishedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  title: true,
  excerpt: true,
  content: true,
  image: true,
  category: true,
  tags: true,
  published: true,
  featured: true,
  priority: true,
  defaultLocale: true,
  contentType: true,
  viewCount: true,
  commentsEnabled: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const contentAuthorDto = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

export const announcementDto = createSelectSchema(announcements, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
  expiresAt: dateSchema.nullable(),
}).pick({
  id: true,
  title: true,
  content: true,
  author: true,
  priority: true,
  targetFilter: true,
  targetRoles: true,
  resourceId: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
});

export type ContentDto = z.infer<typeof contentDto>;
export type ContentAuthorDto = z.infer<typeof contentAuthorDto>;
export type AnnouncementDto = z.infer<typeof announcementDto>;
