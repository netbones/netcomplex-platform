import { db, resources } from '@api/db';
import { eq, sql } from 'drizzle-orm';
import { apiSuccess, apiNotFound } from '@api/api-response';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [updated] = await db
    .update(resources)
    .set({
      downloadCount: sql`${resources.downloadCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id))
    .returning({ downloadCount: resources.downloadCount });

  if (!updated) {
    return apiNotFound('Resource not found');
  }

  return apiSuccess({ downloadCount: updated.downloadCount });
}
