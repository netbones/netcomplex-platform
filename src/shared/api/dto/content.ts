import type { InferSelectModel } from 'drizzle-orm';
import { contents } from '@api/db';

// API-safe content shape
export interface ContentDTO {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
  excerpt: Record<string, string> | null;
  image: string | null;
  category: string;
  tags: string[];
  authorId: string | null;
  groupId: string | null;
  published: boolean;
  featured: boolean;
  priority: string;
  defaultLocale: string;
  contentType: string;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Public-facing content shape (only published content)
export interface PublicContentDTO {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
  excerpt: Record<string, string> | null;
  image: string | null;
  category: string;
  tags: string[];
  authorId: string | null;
  publishedAt: string | null;
  contentType: string;
}

// Maps a Drizzle content row to ContentDTO
export function toContentDTO(content: InferSelectModel<typeof contents>): ContentDTO {
  return {
    id: content.id,
    title: content.title as Record<string, string>,
    content: content.content as Record<string, string>,
    excerpt: (content.excerpt as Record<string, string>) || null,
    image: content.image || null,
    category: content.category,
    tags: content.tags || [],
    authorId: content.authorId || null,
    groupId: content.groupId || null,
    published: content.published,
    featured: content.featured,
    priority: content.priority,
    defaultLocale: content.defaultLocale,
    contentType: content.contentType,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    expiresAt: content.expiresAt?.toISOString() ?? null,
    createdAt: content.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: content.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps a Drizzle content row to PublicContentDTO
export function toPublicContentDTO(content: InferSelectModel<typeof contents>): PublicContentDTO {
  return {
    id: content.id,
    title: content.title as Record<string, string>,
    content: content.content as Record<string, string>,
    excerpt: (content.excerpt as Record<string, string>) || null,
    image: content.image || null,
    category: content.category,
    tags: content.tags || [],
    authorId: content.authorId || null,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    contentType: content.contentType,
  };
}
