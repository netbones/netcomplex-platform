import {
  auth,
  db,
  behaviorRecords,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiError,
  apiSuccess,
  writeAuditLog,
} from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/**
 * POST /api/merits/[id]/dispute — Resident disputes their own behavior record.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .from(behaviorRecords)
    .where(
      and(
        eq(behaviorRecords.id, id),
        eq(behaviorRecords.tenantId, tenantId),
        isNull(behaviorRecords.deletedAt)
      )
    );

  if (!record) return apiNotFound('Behavior record not found');

  if (record.userId !== session.user.id) {
    return apiForbidden('You can only dispute your own records');
  }

  if (record.status !== 'ACTIVE') {
    return apiError('VALIDATION_ERROR', 'Only active records can be disputed', 400);
  }

  const now = new Date();
  await db
    .update(behaviorRecords)
    .set({
      status: 'DISPUTED',
      disputeReason: reason,
      disputedAt: now,
    })
    .where(eq(behaviorRecords.id, id));

  await writeAuditLog({
    tenantId,
    action: 'MERIT_DISPUTE_FILED',
    targetId: id,
    actorId: session.user.id,
    details: { reason },
  });

  return apiSuccess({ status: 'DISPUTED' });
}
