import {
  auth,
  db,
  communityMerits,
  apiUnauthorized,
  apiForbidden,
  apiSuccess,
  writeAuditLog,
  withErrorHandler,
} from '@api/server';
import { sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { getEffectivePoints } from '@/entities/merit/services';

export const maxDuration = 60;

export const POST = withErrorHandler(async (request: Request) => {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  if (!hasPermission(session.user.role, 'users')) {
    return apiForbidden('Insufficient permissions');
  }

  const body = await request.json().catch(() => ({}));
  const batchSize = Math.min(Math.max(parseInt(String(body.batchSize), 10) || 50, 1), 500);
  let offset = parseInt(String(body.offset), 10) || 0;

  const [{ count }] = await db
    .select({ count: sql<number>`count(DISTINCT ${communityMerits.userId})` })
    .from(communityMerits)
    .where(sql`${communityMerits.tenantId} = ${tenantId} AND ${communityMerits.deletedAt} IS NULL`);

  const total = Number(count ?? 0);
  let recalculated = 0;
  const tierChanges = 0;

  while (offset < total) {
    const userIds = await db
      .selectDistinct({ userId: communityMerits.userId })
      .from(communityMerits)
      .where(
        sql`${communityMerits.tenantId} = ${tenantId} AND ${communityMerits.deletedAt} IS NULL`
      )
      .limit(batchSize)
      .offset(offset);

    for (const { userId } of userIds) {
      try {
        await getEffectivePoints(userId, tenantId);
        recalculated++;
      } catch {
        // skip users with calculation errors
      }
    }

    offset += batchSize;
  }

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_UPDATED',
    targetId: tenantId,
    actorId: session.user.id,
    details: { type: 'recalculate_standing', total, recalculated, tierChanges },
  });

  return apiSuccess({ total, recalculated, tierChanges });
});
