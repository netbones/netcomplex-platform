import {
  apiConflict,
  apiError,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  disputeCases,
  disputeEvents,
  notDeleted,
  now,
  revalidateDashboard,
  withErrorHandler,
} from '@api/server';

import { apiLogger } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';
import { requireAuth } from '@/shared/api/auth-utils';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request.
 */
/**
 * POST /api/disputes/[id]/submit - Submit a DRAFT dispute with cooling-off enforcement.
 *
 * Enforces:
 * - Authentication required (401)
 * - Dispute must exist and belong to tenant (404)
 * - Dispute must be in DRAFT status (409)
 * - Only the complainant can submit (403)
 * - Cooling-off period must have elapsed (423 with remaining seconds)
 * - Atomic DRAFT→SUBMITTED transition with SUBMITTED event log
 * @deprecated Use trpc.disputes.submitDispute instead.
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;
    const featureCheck = await assertModuleEnabled('disputes');
    if (featureCheck) return featureCheck;

    // Fetch dispute with tenant scoping and soft-delete exclusion
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

    // Validate status is DRAFT
    if (dispute.status !== 'DRAFT') {
      return apiConflict('Dispute is not in draft status');
    }

    // Validate complainant is the authenticated user
    if (dispute.complainantId !== auth.data.userId) {
      return apiForbidden();
    }

    // Validate cooling-off period has elapsed
    if (dispute.coolingOffEndsAt) {
      const nowDate = now();
      if (dispute.coolingOffEndsAt > nowDate) {
        const remainingMs = dispute.coolingOffEndsAt.getTime() - nowDate.getTime();
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        return apiError(
          'COOLING_OFF_ACTIVE',
          `Cooling-off period has not elapsed. ${remainingSeconds}s remaining.`,
          423
        );
      }
    }

    // Atomic transition in transaction
    try {
      const result = await db.transaction(async tx => {
        const ts = now();

        const [updated] = await tx
          .update(disputeCases)
          .set({
            status: 'SUBMITTED',
            submittedAt: ts,
            updatedAt: ts,
          })
          .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)))
          .returning();

        // Log SUBMITTED event
        await tx.insert(disputeEvents).values({
          id: createId(),
          tenantId,
          disputeId: id,
          actorId: auth.data.userId,
          eventType: 'SUBMITTED',
          fromStatus: 'DRAFT',
          toStatus: 'SUBMITTED',
          createdAt: ts,
        });

        return updated;
      });

      revalidateDashboard();

      return apiSuccess({
        message: 'Dispute submitted successfully',
        submittedAt: result.submittedAt?.toISOString() ?? new Date().toISOString(),
      });
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Dispute submit error');
      return apiInternalError();
    }
  }
);
