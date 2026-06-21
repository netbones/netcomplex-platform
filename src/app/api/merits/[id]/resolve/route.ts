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
  withErrorHandler,
} from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

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

    if (!hasPermission(session.user.role, 'users')) return apiForbidden('Insufficient permissions');

    const body = await request.json();
    const { verdict } = body;

    if (!verdict || !['UPHOLD', 'OVERTURN'].includes(verdict)) {
      return apiError('VALIDATION_ERROR', 'Verdict must be UPHOLD or OVERTURN', 400);
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

    if (record.status !== 'DISPUTED') {
      return apiError('VALIDATION_ERROR', 'Only disputed records can be resolved', 400);
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      resolvedById: session.user.id,
      resolvedAt: now,
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
      .update(behaviorRecords)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(eq(behaviorRecords.id, id));

    await writeAuditLog({
      tenantId,
      action: 'MERIT_DISPUTE_RESOLVED',
      targetId: id,
      actorId: session.user.id,
      details: { verdict, previousStatus: record.status },
    });

    return apiSuccess({ status: verdict === 'UPHOLD' ? 'UPHELD' : 'OVERTURNED' });
  }
);
