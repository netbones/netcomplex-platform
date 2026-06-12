import {
  auth,
  db,
  users,
  revalidateContent,
  apiCreated,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { hasPermission } from '@entities/tenant';
import { requireAssistScope } from '@entities/tenant';

import { eq } from 'drizzle-orm';

import { withTenant } from '@entities/tenant';
import { defaultLanguage } from '@shared/lib';
import * as contentService from '@entities/content';

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

  // Delegate to entity service for query building, execution, and localization
  const contentItems = await contentService.listContent({
    tenantId,
    category,
    published,
    featured,
    groupId,
    authorId,
    locale,
  });

  // Transform to localized content using entity service
  const userLocale = contentService.resolveLocale(locale);
  const localizedContent = contentItems.map(item =>
    contentService.transformContentForLocale(item as unknown as Record<string, unknown>, userLocale)
  );

  return apiSuccess(localizedContent);
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
    return apiUnauthorized();
  }

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return apiForbidden();
  }

  const body = await request.json();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Delegate to entity service for creation
  const content = await contentService.createContent({
    id: crypto.randomUUID(),
    tenantId,
    title: body.title || { [defaultLanguage]: 'Untitled' },
    content: body.content || { [defaultLanguage]: '' },
    excerpt: body.excerpt || null,
    category: body.category,
    authorId: authData.role === 'ADMIN' ? null : authData.userId,
    groupId: body.groupId || null,
    featured: body.featured || false,
    published: body.published || false,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    tags: body.tags || [],
    priority: body.priority || 'normal',
    defaultLocale: body.defaultLocale || defaultLanguage,
    contentType: body.contentType || 'article',
  });

  // Revalidate content caches immediately when new content is created
  revalidateContent();

  return apiCreated(content);
}
