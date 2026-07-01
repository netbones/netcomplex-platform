import { db, apiSuccess, withErrorHandler, bursaryFields } from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

export const GET = withErrorHandler(async () => {
  const { tenantId } = await withTenant();

  const rows = await db
    .select()
    .from(bursaryFields)
    .where(and(eq(bursaryFields.tenantId, tenantId), isNull(bursaryFields.deletedAt)))
    .orderBy(bursaryFields.label);

  return apiSuccess(rows);
});
