import { db, contents, users, groups } from '@api/db';
import { eq, and, or, isNull, lte, gt, type SQL } from 'drizzle-orm';
import {
  getLocalizedValue,
  getLocalizedContent,
  supportedLanguages,
  defaultLanguage,
} from '@shared/lib';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';

import { apiError, apiNotFound, apiSuccess } from '@api/api-response';
/**
 * Transform content item to include localized fields
 */
function transformContentForLocale(content: Record<string, unknown>, userLocale: string) {
  const defaultLocale = (content.defaultLocale as string) || defaultLanguage;

  return {
    id: content.id,
    title: getLocalizedValue(content.title as Record<string, unknown>, userLocale, defaultLocale),
    content: getLocalizedContent(
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || defaultLanguage;
  const published = searchParams.get('published');
  const userLocale = supportedLanguages.includes(locale as (typeof supportedLanguages)[number])
    ? locale
    : defaultLanguage;

  // Check if user has content permission (admin)
  const session = await auth.api.getSession({ headers: request.headers });
  let canViewAll = false;
  if (session?.user?.id) {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    canViewAll = hasPermission(user?.role || 'RESIDENT', 'content');
  }

  // Build where conditions
  const whereConditions: (SQL<unknown> | undefined)[] = [
    eq(contents.id, id),
    eq(contents.tenantId, tenantId),
  ];

  if (published !== null) {
    whereConditions.push(eq(contents.published, published === 'true'));
  }

  // For non-admin users, apply date filtering
  if (!canViewAll) {
    const now = new Date();
    whereConditions.push(or(isNull(contents.publishedAt), lte(contents.publishedAt, now)));
    whereConditions.push(or(isNull(contents.expiresAt), gt(contents.expiresAt, now)));
  }

  const [content] = await db
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
      authorName: users.name,
      groupName: groups.name,
    })
    .from(contents)
    .leftJoin(users, eq(contents.authorId, users.id))
    .leftJoin(groups, eq(contents.groupId, groups.id))
    .where(and(...whereConditions.filter((c): c is NonNullable<typeof c> => c !== undefined)))
    .limit(1);

  if (!content) {
    return apiNotFound('Not found');
  }

  const localized = transformContentForLocale(content, userLocale);

  // Add author and group info
  const result = {
    ...localized,
    author: content.authorId ? { id: content.authorId, name: content.authorName || '' } : null,
    group: content.groupId ? { id: content.groupId, name: content.groupName || '' } : null,
  };

  return apiSuccess(result);
}

/**
 * PATCH /api/content/[id] - Update content
 * @body title - Content title (JSON or string for single locale)
 * @body content - Content body (JSON or string for single locale)
 * @body excerpt - Optional excerpt (JSON or string)
 * @body defaultLocale - Fallback locale
 * @body contentType - "article" or "campaign"
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Handle title - can be string (single locale) or JSON (multi-locale)
  if (body.title) {
    updateData.title =
      typeof body.title === 'string' ? { [defaultLanguage]: body.title } : body.title;
  }

  // Handle content - can be string (single locale) or JSON (multi-locale)
  if (body.content) {
    updateData.content =
      typeof body.content === 'string' ? { [defaultLanguage]: body.content } : body.content;
  }

  // Handle excerpt - can be string or JSON
  if (body.excerpt !== undefined) {
    updateData.excerpt = body.excerpt
      ? typeof body.excerpt === 'string'
        ? { [defaultLanguage]: body.excerpt }
        : body.excerpt
      : null;
  }

  if (body.category) updateData.category = body.category;
  if (body.groupId !== undefined) updateData.groupId = body.groupId || null;
  if (body.featured !== undefined) updateData.featured = body.featured;
  if (body.published !== undefined) updateData.published = body.published;
  if (body.defaultLocale) updateData.defaultLocale = body.defaultLocale;
  if (body.contentType) updateData.contentType = body.contentType;
  if (body.tags) updateData.tags = body.tags;
  if (body.priority) updateData.priority = body.priority;

  if (body.published && !body.publishedAt) {
    updateData.publishedAt = new Date();
  }
  if (body.publishedAt !== undefined) {
    updateData.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
  }
  if (body.expiresAt !== undefined) {
    updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  const [content] = await db
    .update(contents)
    .set(updateData)
    .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)))
    .returning();

  // Revalidate content caches
  revalidateContent();

  return apiSuccess(content);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  await db.delete(contents).where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));

  // Revalidate content caches
  revalidateContent();

  return apiSuccess({ success: true });
}
