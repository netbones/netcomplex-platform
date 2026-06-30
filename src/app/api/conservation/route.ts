import { db, contents, users, apiSuccess, apiInternalError } from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { resolveLocale, transformContentForLocale } from '@entities/content/server';
import { logError, defaultLanguage } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: Request) {
  try {
    const { tenantId } = await withTenant();
    const moduleCheck = await assertModuleEnabled('conservation');
    if (moduleCheck) return moduleCheck;

    const { searchParams } = new URL(request.url);
    const localeParam = searchParams.get('locale');
    const locale = resolveLocale(localeParam ?? request.headers.get('x-locale') ?? defaultLanguage);

    const contentList = await db
      .select({
        id: contents.id,
        title: contents.title,
        content: contents.content,
        excerpt: contents.excerpt,
        image: contents.image,
        category: contents.category,
        defaultLocale: contents.defaultLocale,
        tags: contents.tags,
        published: contents.published,
        featured: contents.featured,
        publishedAt: contents.publishedAt,
        author: {
          name: users.name,
        },
      })
      .from(contents)
      .leftJoin(users, eq(contents.authorId, users.id))
      .where(and(eq(contents.published, true), eq(contents.tenantId, tenantId)))
      .orderBy(desc(contents.publishedAt))
      .limit(3);

    const transformed = contentList.map(item =>
      transformContentForLocale(item as Record<string, unknown>, locale)
    );

    return apiSuccess(transformed);
  } catch (error) {
    logError(
      { component: 'conservation-api', operation: 'GET' },
      'Failed to fetch conservation content',
      error
    );
    return apiInternalError('Failed to fetch content');
  }
}
