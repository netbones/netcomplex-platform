import { db, resources } from '@api/db';
import { and, eq, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import { apiSuccess, apiNotFound } from '@api/api-response';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [updated] = await db
    .update(resources)
    .set({
      downloadCount: sql`${resources.downloadCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)))
    .returning({ downloadCount: resources.downloadCount });

  if (!updated) {
    return apiNotFound('Resource not found');
  }

  return apiSuccess({ downloadCount: updated.downloadCount });
}
