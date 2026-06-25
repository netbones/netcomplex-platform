import {
  auth,
  db,
  communityMerits,
  notifications,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiError,
  apiSuccess,
  now,
  writeAuditLog,
  withErrorHandler,
} from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { getStandingTier } from '@entities/merit';
import { getEffectivePoints } from '@/entities/merit/services';

export const maxDuration = 8;

/**
 * POST /api/merits/[id]/resolve — Admin resolves a dispute (UPHOLD or OVERTURN).
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    if (!hasPermission((session.user as Record<string, unknown>).role as string, 'users'))
      return apiForbidden('Insufficient permissions');

    const body = await request.json();
    const { verdict } = body;

    if (!verdict || !['UPHOLD', 'OVERTURN'].includes(verdict)) {
      return apiError('VALIDATION_ERROR', 'Verdict must be UPHOLD or OVERTURN', 400);
    }

    const [record] = await db
      .select()
      .from(communityMerits)
      .where(
        and(
          eq(communityMerits.id, id),
          eq(communityMerits.tenantId, tenantId),
          isNull(communityMerits.deletedAt)
        )
      );

    if (!record) return apiNotFound('Behavior record not found');

    if (record.status !== 'DISPUTED') {
      return apiError('VALIDATION_ERROR', 'Only disputed records can be resolved', 400);
    }

    const ts = now();
    const currentHistory: unknown[] = (record.disputeHistory as unknown[]) ?? [];
    const updateData: Record<string, unknown> = {
      resolvedById: session.user.id,
      resolvedAt: ts,
      disputeHistory: [
        ...currentHistory,
        { type: 'RESOLVED', actorId: session.user.id, verdict, timestamp: ts.toISOString() },
      ],
    };

    if (verdict === 'OVERTURN') {
      updateData.status = 'OVERTURNED';
      updateData.recognitionPoints = 0;
      updateData.disciplinaryPoints = 0;
      updateData.standingAfter = record.standingBefore;
    } else {
      updateData.status = 'UPHELD';
    }

    await db
      .update(communityMerits)
      .set(updateData as typeof communityMerits.$inferInsert)
      .where(eq(communityMerits.id, id));

    await writeAuditLog({
      tenantId,
      action: 'MERIT_DISPUTE_RESOLVED',
      targetId: id,
      actorId: session.user.id,
      details: { verdict, previousStatus: record.status },
    });

    if (verdict === 'OVERTURN') {
      const points = await getEffectivePoints(record.userId, tenantId);
      const tierBefore = getStandingTier(record.standingAfter ?? 0);
      const tierAfter = getStandingTier(points.overall);
      if (tierBefore !== tierAfter) {
        const labels: Record<string, string> = {
          GOLD: 'Gold',
          SILVER: 'Silver',
          BRONZE: 'Bronze',
          WATCHLIST: 'Watchlist',
          PROBATION: 'Probation',
        };
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          tenantId,
          userId: record.userId,
          title: 'Dispute resolved — standing updated',
          message: `Your standing changed from ${labels[tierBefore]} to ${labels[tierAfter]} after dispute resolution.`,
          type: tierAfter === 'WATCHLIST' || tierAfter === 'PROBATION' ? 'warning' : 'info',
          read: false,
        });
      }
    }

    return apiSuccess({ status: verdict === 'UPHOLD' ? 'UPHELD' : 'OVERTURNED' });
  }
);
