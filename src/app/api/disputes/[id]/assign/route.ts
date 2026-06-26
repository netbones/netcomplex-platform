import {
  auth,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiInternalError,
  apiValidationError,
  db,
  disputeCases,
  disputeEvents,
  users,
  now,
  withErrorHandler,
} from '@api/server';

import { disputeAssignSchema } from '@entities/dispute';
import { apiLogger, hasPermission } from '@shared/lib';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

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
 * POST /api/disputes/[id]/assign — assign moderator.
 * BOARD/ADMIN only. Updates assignedModeratorId and logs ASSIGNED event
 * in a single transaction.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    // Role guard: only BOARD and ADMIN can assign moderators
    if (authData.role !== 'BOARD' && !hasPermission(authData.role, 'admin')) {
      return apiForbidden('Only board members and admins can assign moderators');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiValidationError([{ message: 'Invalid JSON body' }]);
    }

    const validationResult = disputeAssignSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const { moderatorId } = validationResult.data;

    // Fetch dispute to verify it exists and is tenant-scoped
    const [dispute] = await db
      .select()
      .from(disputeCases)
      .where(
        and(
          eq(disputeCases.id, id),
          eq(disputeCases.tenantId, tenantId),
          isNull(disputeCases.deletedAt)
        )
      )
      .limit(1);

    if (!dispute) {
      return apiNotFound('Not found');
    }

    const ts = now();

    try {
      await db.transaction(async tx => {
        await tx
          .update(disputeCases)
          .set({
            assignedModeratorId: moderatorId,
            updatedAt: ts,
          })
          .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)));

        await tx.insert(disputeEvents).values({
          id: crypto.randomUUID(),
          tenantId,
          disputeId: id,
          actorId: authData.userId,
          eventType: 'ASSIGNED',
          metadata: { assignedModeratorId: moderatorId },
          createdAt: ts,
        });
      });

      return apiSuccess({ success: true, assignedModeratorId: moderatorId });
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Moderator assignment error');
      return apiInternalError();
    }
  }
);
