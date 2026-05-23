import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { requireAssistScope } from '@entities/tenant/api/assist-scope-guard';
import { db, contents, users, groups } from '@api/db';
import { eq, and, desc, or, isNull, lte, gt, type SQL } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ContentCategoryEnum, type ContentCategory } from '@shared/api/types';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { getLocalizedValue, supportedLanguages, defaultLanguage } from '@shared/lib';

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

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

/**
 * GET /api/content - List content/announcements
 * @query category - Filter by NEWS, ANNOUNCEMENT, EVENT, or BLOG
 * @query published - Filter by published status (true/false)
 * @query featured - Filter by featured (true/false)
 * @query groupId - Filter by group ID
 * @query authorId - Filter by author ID (for user's own content)
 * @query locale - Content locale to fetch (default: user's browser locale or 'en')
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const published = searchParams.get('published');
  const featured = searchParams.get('featured');
  const groupId = searchParams.get('groupId');
  const authorId = searchParams.get('authorId');
  const locale = searchParams.get('locale') || defaultLanguage;

  // Validate locale
  const userLocale = supportedLanguages.includes(locale as (typeof supportedLanguages)[number])
    ? locale
    : defaultLanguage;

  // Build where conditions — tenant isolation is mandatory
  const whereConditions: (SQL<unknown> | undefined)[] = [eq(contents.tenantId, tenantId)];

  if (category && category in ContentCategoryEnum) {
    whereConditions.push(eq(contents.category, category as ContentCategory));
  }
  if (published !== null) {
    whereConditions.push(eq(contents.published, published === 'true'));
  }
  if (featured === 'true') {
    whereConditions.push(eq(contents.featured, true));
  }
  if (groupId) {
    whereConditions.push(eq(contents.groupId, groupId));
  }

  // Filter by author only when explicitly requested (e.g., "my posts" page)
  // Public/news listings should show ALL published content for the tenant
  if (authorId) {
    whereConditions.push(eq(contents.authorId, authorId));
  }

  // Always filter by publish/expiry dates for public-facing queries
  const now = new Date();
  whereConditions.push(or(isNull(contents.publishedAt), lte(contents.publishedAt, now)));
  whereConditions.push(or(isNull(contents.expiresAt), gt(contents.expiresAt, now)));

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

  // Transform to localized content
  const localizedContent = contentItems.map(item => transformContentForLocale(item, userLocale));

  return NextResponse.json(localizedContent);
}

/**
 * POST /api/content - Create new content (requires content permission)
 * @body title - Content title (JSON: { "en": "...", "af": "..." })
 * @body content - Content body (JSON: { "en": "...", "af": "..." })
 * @body excerpt - Optional excerpt (JSON: { "en": "...", "af": "..." })
 * @body category - Content category
 * @body authorId - Author user ID
 * @body groupId - Optional group ID
 * @body featured - Whether featured
 * @body published - Whether published
 * @body defaultLocale - Fallback locale (default: "en")
 * @body contentType - "article" or "campaign"
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const now = new Date();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [content] = await db
    .insert(contents)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      title: body.title || { [defaultLanguage]: 'Untitled' },
      content: body.content || { [defaultLanguage]: '' },
      excerpt: body.excerpt || null,
      category: body.category,
      authorId: authData.userId,
      groupId: body.groupId || null,
      featured: body.featured || false,
      published: body.published || false,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : body.published ? now : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      tags: body.tags || [],
      priority: body.priority || 'normal',
      defaultLocale: body.defaultLocale || defaultLanguage,
      contentType: body.contentType || 'article',
      updatedAt: now,
      createdAt: now,
    })
    .returning();

  // Revalidate content caches immediately when new content is created
  revalidateContent();

  return NextResponse.json(content, { status: 201 });
}
