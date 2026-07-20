import { db, resources, apiSuccess, apiNotFound, now, withErrorHandler } from '@api/server';

import { and, eq, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.resources.incrementDownloadCount instead.
 */
export const POST = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const [updated] = await db
      .update(resources)
      .set({
        downloadCount: sql`${resources.downloadCount} + 1`,
        updatedAt: now(),
      })
      .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)))
      .returning({ downloadCount: resources.downloadCount });

    if (!updated) {
      return apiNotFound('Resource not found');
    }

    return apiSuccess({ downloadCount: updated.downloadCount });
  }
);
