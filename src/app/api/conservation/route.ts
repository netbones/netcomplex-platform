import { db, contents, users } from '@api/db';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { logError } from '@shared/lib';

import { apiError, apiSuccess, apiInternalError } from '@api/api-response';
export async function GET() {
  try {
    const { tenantId } = await withTenant();

    const contentList = await db
      .select({
        id: contents.id,
        title: contents.title,
        excerpt: contents.excerpt,
        image: contents.image,
        category: contents.category,
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

    return apiSuccess(contentList);
  } catch (error) {
    logError(
      { component: 'conservation-api', operation: 'GET' },
      'Failed to fetch conservation content',
      error
    );
    return apiInternalError('Failed to fetch content');
  }
}
