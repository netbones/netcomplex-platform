import {
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  auth,
  communityMerits,
  db,
  notDeleted,
  now,
  withErrorHandler,
  writeAuditLog,
} from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/**
 * POST /api/merits/[id]/dispute — Resident disputes their own behavior record.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.length < 3) {
      return apiError('VALIDATION_ERROR', 'Dispute reason is required (minimum 3 characters)', 400);
    }

    const [record] = await db
      .select()
      .from(communityMerits)
      .where(
        and(
          eq(communityMerits.id, id),
          eq(communityMerits.tenantId, tenantId),
          notDeleted(communityMerits)
        )
      );

    if (!record) return apiNotFound('Behavior record not found');

    if (record.userId !== session.user.id) {
      return apiForbidden('You can only dispute your own records');
    }

    if (record.status !== 'ACTIVE') {
      return apiError('VALIDATION_ERROR', 'Only active records can be disputed', 400);
    }

    const ts = now();
    const currentHistory: unknown[] = (record.disputeHistory as unknown[]) ?? [];
    await db
      .update(communityMerits)
      .set({
        status: 'DISPUTED',
        disputeReason: reason,
        disputedAt: ts,
        disputeHistory: [
          ...currentHistory,
          { type: 'FILED', actorId: session.user.id, reason, timestamp: ts.toISOString() },
        ],
      })
      .where(eq(communityMerits.id, id));

    await writeAuditLog({
      tenantId,
      action: 'MERIT_DISPUTE_FILED',
      targetId: id,
      actorId: session.user.id,
      details: { reason },
    });

    return apiSuccess({ status: 'DISPUTED' });
  }
);
