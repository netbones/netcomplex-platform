import { requireAuth } from '@/shared/api/auth-utils';
import {
  revalidateContent,
  apiCreated,
  apiForbidden,
  apiSuccess,
  emitEvent,
  withErrorHandler,
} from '@api/server';

import { hasPermission } from '@shared/lib';
import { requireAssistScope, assertModuleEnabled, withTenant } from '@entities/tenant/server';
import {
  listContent,
  createContent,
  resolveLocale,
  transformContentForLocale,
} from '@entities/content/server';
import { defaultLanguage } from '@shared/lib';

export const maxDuration = 8;

/**
 * GET /api/content - List content/announcements
 * @query category - Filter by NEWS, ANNOUNCEMENT, EVENT, or BLOG
 * @query published - Filter by published status (true/false)
 * @query featured - Filter by featured (true/false)
 * @query groupId - Filter by group ID
 * @query authorId - Filter by author ID (for user's own content)
 * @query locale - Content locale to fetch (default: user's browser locale or 'en')
 */
/**
 * @deprecated Use trpc.content.listContent instead.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const featureCheck = await assertModuleEnabled('content');
  if (featureCheck) return featureCheck;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const published = searchParams.get('published');
  const featured = searchParams.get('featured');
  const groupId = searchParams.get('groupId');
  const authorId = searchParams.get('authorId');
  const locale = searchParams.get('locale') || defaultLanguage;

  const contentItems = await listContent({
    tenantId,
    category,
    published,
    featured,
    groupId,
    authorId,
    locale,
  });

  const resolvedLocale = resolveLocale(locale);
  const transformed = contentItems.map(item =>
    transformContentForLocale(item as Record<string, unknown>, resolvedLocale)
  );

  return apiSuccess(transformed);
});

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
/**
 * @deprecated Use trpc.content.createContent instead.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  if (!hasPermission(auth.data.role, 'content') && !hasPermission(auth.data.role, 'contentOwn')) {
    return apiForbidden();
  }

  const body = await request.json();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Delegate to entity service for creation
  const content = await createContent({
    tenantId,
    title: body.title || { [defaultLanguage]: 'Untitled' },
    content: body.content || { [defaultLanguage]: '' },
    excerpt: body.excerpt || null,
    category: body.category,
    authorId: auth.data.role === 'ADMIN' ? null : auth.data.userId,
    groupId: body.groupId || null,
    featured: body.featured || false,
    published: body.published || false,
    publishedAt: body.publishedAt || null,
    expiresAt: body.expiresAt || null,
    tags: body.tags || [],
    priority: body.priority || 'normal',
    defaultLocale: body.defaultLocale || defaultLanguage,
    contentType: body.contentType || 'article',
    license: body.license,
    copyrightHolder: body.copyrightHolder,
  });

  // Revalidate content caches immediately when new content is created
  revalidateContent();

  emitEvent('content.created', {
    tenantId,
    userId: auth.data.userId,
    contentId: content.id,
    category: content.category,
  });

  return apiCreated(content);
});
