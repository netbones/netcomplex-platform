import {
  db,
  contents,
  users,
  groups,
} from '@api/server';

import { eq, and, desc, or, isNull, lte, gt, type SQL } from 'drizzle-orm';
import { ContentCategoryEnum, type ContentCategory } from '@api/shared';
import { getLocalizedValue, defaultLanguage, supportedLanguages } from '@shared/lib';

/**
 * Builds where conditions for content queries with tenant isolation.
 */
export function buildContentConditions(params: {
  tenantId: string;
  category?: string | null;
  published?: string | null;
  featured?: string | null;
  groupId?: string | null;
  authorId?: string | null;
}) {
  const whereConditions: (SQL<unknown> | undefined)[] = [eq(contents.tenantId, params.tenantId)];

  if (params.category && params.category in (ContentCategoryEnum as Record<string, string>)) {
    whereConditions.push(eq(contents.category, params.category as ContentCategory));
  }
  if (params.published !== null && params.published !== undefined) {
    whereConditions.push(eq(contents.published, params.published === 'true'));
  }
  if (params.featured === 'true') {
    whereConditions.push(eq(contents.featured, true));
  }
  if (params.groupId) {
    whereConditions.push(eq(contents.groupId, params.groupId));
  }
  if (params.authorId) {
    whereConditions.push(eq(contents.authorId, params.authorId));
  }

  // Always filter by publish/expiry dates for public-facing queries
  const now = new Date();
  whereConditions.push(or(isNull(contents.publishedAt), lte(contents.publishedAt, now)));
  whereConditions.push(or(isNull(contents.expiresAt), gt(contents.expiresAt, now)));

  return whereConditions;
}

/**
 * Lists content items with localization.
 */
export async function listContent(params: {
  tenantId: string;
  category?: string | null;
  published?: string | null;
  featured?: string | null;
  groupId?: string | null;
  authorId?: string | null;
  locale?: string;
}) {
  const whereConditions = buildContentConditions(params);

  const contentItems = await db
    .select({
      id: contents.id,
      title: contents.title,
      content: contents.content,
      excerpt: contents.excerpt,
      image: contents.image,
      category: contents.category,
      tags: contents.tags,
      authorId: contents.authorId,
      groupId: contents.groupId,
      published: contents.published,
      featured: contents.featured,
      priority: contents.priority,
      defaultLocale: contents.defaultLocale,
      contentType: contents.contentType,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      publishedAt: contents.publishedAt,
      expiresAt: contents.expiresAt,
    })
    .from(contents)
    .leftJoin(users, eq(contents.authorId, users.id))
    .leftJoin(groups, eq(contents.groupId, groups.id))
    .where(and(...whereConditions.filter((c): c is NonNullable<typeof c> => c !== undefined)))
    .orderBy(desc(contents.createdAt));

  return contentItems;
}

/**
 * Validates the locale parameter against supported languages.
 */
export function resolveLocale(locale?: string | null): string {
  if (!locale) return defaultLanguage;
  return supportedLanguages.includes(locale as (typeof supportedLanguages)[number])
    ? locale
    : defaultLanguage;
}

/**
 * Transforms content item to include localized fields.
 */
export function transformContentForLocale(content: Record<string, unknown>, userLocale: string) {
  const defaultLocale = (content.defaultLocale as string) || defaultLanguage;

  return {
    id: content.id,
    title: getLocalizedValue(content.title as Record<string, unknown>, userLocale, defaultLocale),
    content: getLocalizedValue(
      content.content as Record<string, unknown>,
      userLocale,
      defaultLocale
    ),
    excerpt: getLocalizedValue(
      content.excerpt as Record<string, unknown>,
      userLocale,
      defaultLocale
    ),
    image: content.image,
    category: content.category,
    tags: content.tags,
    authorId: content.authorId,
    groupId: content.groupId,
    published: content.published,
    featured: content.featured,
    priority: content.priority,
    defaultLocale: content.defaultLocale,
    contentType: content.contentType,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    publishedAt: content.publishedAt,
    expiresAt: content.expiresAt,
    // Include raw JSON for admin editing
    _raw: {
      title: content.title,
      content: content.content,
      excerpt: content.excerpt,
    },
  };
}

/**
 * Creates a new content item.
 */
export async function createContent(data: {
  id: string;
  tenantId: string;
  title: Record<string, string>;
  content: Record<string, string>;
  excerpt: Record<string, string> | null;
  category: 'ANNOUNCEMENT' | 'NEWS' | 'EVENT' | 'BLOG' | 'CONSERVATION' | 'SERVICES' | 'CAMPAIGN';
  authorId: string;
  groupId: string | null;
  featured: boolean;
  published: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  tags: string[];
  priority: string;
  defaultLocale: string;
  contentType: string;
}) {
  const now = new Date();

  const publishedAt: Date | null = data.published ? data.publishedAt || now : data.publishedAt;

  const [content] = await db
    .insert(contents)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      category: data.category,
      authorId: data.authorId,
      groupId: data.groupId,
      featured: data.featured,
      published: data.published,
      publishedAt,
      expiresAt: data.expiresAt,
      tags: data.tags,
      priority: data.priority,
      defaultLocale: data.defaultLocale,
      contentType: data.contentType,
      updatedAt: now,
      createdAt: now,
    })
    .returning();

  return content;
}
