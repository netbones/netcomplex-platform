import { db, contents, users, groups } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getLocalizedValue, supportedLanguages, defaultLanguage } from '@/lib/i18n';
import { revalidateContent } from '@/lib/revalidation';

/**
 * Transform content item to include localized fields
 */
function transformContentForLocale(content: Record<string, unknown>, userLocale: string) {
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || defaultLanguage;
  const userLocale = supportedLanguages.includes(locale as (typeof supportedLanguages)[number])
    ? locale
    : defaultLanguage;

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
    })
    .from(contents)
    .leftJoin(users, eq(contents.authorId, users.id))
    .leftJoin(groups, eq(contents.groupId, groups.id))
    .where(eq(contents.id, id))
    .limit(1);

  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const localized = transformContentForLocale(content, userLocale);

  // Add author and group info
  const result = {
    ...localized,
    author: content.authorId ? { id: content.authorId, name: '' } : null,
    group: content.groupId ? { id: content.groupId, name: '' } : null,
  };

  return NextResponse.json(result);
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

  const [content] = await db
    .update(contents)
    .set(updateData)
    .where(eq(contents.id, id))
    .returning();

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json(content);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await db.delete(contents).where(eq(contents.id, id));

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json({ success: true });
}
