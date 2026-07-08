import {
  apiConflict,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  auth,
  db,
  disputeCases,
  disputeEvents,
  notDeleted,
  now,
  users,
  withErrorHandler,
} from '@api/server';

import { disputeRulingSchema } from '@entities/dispute';
import { canTransition } from '@entities/dispute';
import { apiLogger, hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
  };
}

/**
 * POST /api/disputes/[id]/ruling — issue formal ruling.
 * BOARD/ADMIN only. Validates canTransition() before accepting,
 * sets rulingDescription and rulingIssuedAt, transitions to FORMAL_RULING,
 * and logs RULING_ISSUED event in a single transaction.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Role guard: only BOARD and ADMIN can issue rulings
    if (authData.role !== 'BOARD' && !hasPermission(authData.role, 'admin')) {
      return apiForbidden('Only board members and admins can issue rulings');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiValidationError([{ message: 'Invalid JSON body' }]);
    }

    const validationResult = disputeRulingSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const { rulingDescription } = validationResult.data;

    // Fetch dispute
    const [dispute] = await db
      .select()
      .from(disputeCases)
      .where(
        and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId), notDeleted(disputeCases))
      )
      .limit(1);

    if (!dispute) {
      return apiNotFound('Not found');
    }

    // Status transition validation
    if (!canTransition(dispute.status, 'FORMAL_RULING')) {
      return apiConflict('Cannot issue ruling from current status');
    }

    const ts = now();

    try {
      await db.transaction(async tx => {
        await tx
          .update(disputeCases)
          .set({
            status: 'FORMAL_RULING',
            rulingDescription,
            rulingIssuedAt: ts,
            updatedAt: ts,
          })
          .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)));

        await tx.insert(disputeEvents).values({
          id: createId(),
          tenantId,
          disputeId: id,
          actorId: authData.userId,
          eventType: 'RULING_ISSUED',
          fromStatus: dispute.status,
          toStatus: 'FORMAL_RULING',
          note: rulingDescription,
          createdAt: ts,
        });
      });

      return apiSuccess({ success: true });
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Ruling issuance error');
      return apiInternalError();
    }
  }
);
