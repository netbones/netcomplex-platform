import {
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
  db,
  disputeCases,
  disputeEvents,
  notDeleted,
  now,
  withErrorHandler,
} from '@api/server';

import { disputeAssignSchema } from '@entities/dispute';
import { apiLogger, hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';
import { requireAuth } from '@/shared/api/auth-utils';

export const maxDuration = 8;

/**
 * POST /api/disputes/[id]/assign — assign moderator.
 * BOARD/ADMIN only. Updates assignedModeratorId and logs ASSIGNED event
 * in a single transaction.
 * @deprecated Use trpc.disputes.assignDispute instead.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;
    const featureCheck = await assertModuleEnabled('disputes');
    if (featureCheck) return featureCheck;

    // Role guard: only BOARD and ADMIN can assign moderators
    if (auth.data.role !== 'BOARD' && !hasPermission(auth.data.role, 'admin')) {
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
        and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId), notDeleted(disputeCases))
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
          id: createId(),
          tenantId,
          disputeId: id,
          actorId: auth.data.userId,
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
