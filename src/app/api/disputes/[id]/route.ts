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
  revalidateDashboard,
  users,
  withErrorHandler,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission, apiLogger } from '@shared/lib';
import { disputeUpdateSchema } from '@entities/dispute';
import { canTransition } from '@entities/dispute';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request.
 */
/**
 * GET /api/disputes/[id] - Get a single dispute with access control.
 * @deprecated Use trpc.disputes.getDispute instead.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }
    const guard = guardSuspension(authData);
    if (guard) return guard;

    // Fetch with tenant scoping and soft-delete exclusion
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

    // Access control: party or moderator only
    const isParty =
      dispute.complainantId === authData.userId || dispute.respondentId === authData.userId;
    const isModerator =
      hasPermission(authData.role, 'admin') ||
      authData.role === 'BOARD' ||
      authData.role === 'COMMITTEE';

    if (!isParty && !isModerator) {
      return apiForbidden();
    }

    return apiSuccess(dispute);
  }
);

/**
 * PATCH /api/disputes/[id] - Update dispute fields with status transition validation.
 * @deprecated Use trpc.disputes.updateDispute instead.
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiValidationError([{ message: 'Invalid JSON body' }]);
    }

    const validationResult = disputeUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const updates = validationResult.data;

    // Fetch existing dispute
    const [existing] = await db
      .select()
      .from(disputeCases)
      .where(
        and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId), notDeleted(disputeCases))
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Not found');
    }

    // Access control: party or moderator only
    const isParty =
      existing.complainantId === authData.userId || existing.respondentId === authData.userId;
    const isModerator =
      hasPermission(authData.role, 'admin') ||
      authData.role === 'BOARD' ||
      authData.role === 'COMMITTEE';

    if (!isParty && !isModerator) {
      return apiForbidden();
    }

    // Status transition validation
    if (updates.status && updates.status !== existing.status) {
      if (!canTransition(existing.status, updates.status)) {
        return apiConflict(`Cannot transition from ${existing.status} to ${updates.status}`);
      }
    }

    const ts = now();

    // Atomic update + event log
    try {
      const result = await db.transaction(async tx => {
        const [updated] = await tx
          .update(disputeCases)
          .set({
            ...updates,
            updatedAt: ts,
          })
          .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)))
          .returning();

        // Log STATUS_CHANGED event if status changed
        if (updates.status && updates.status !== existing.status) {
          await tx.insert(disputeEvents).values({
            id: createId(),
            tenantId,
            disputeId: id,
            actorId: authData.userId,
            eventType: 'STATUS_CHANGED',
            fromStatus: existing.status,
            toStatus: updates.status,
            createdAt: ts,
          });
        }

        return updated;
      });

      revalidateDashboard();

      return apiSuccess(result);
    } catch (error) {
      apiLogger.error({ err: error, disputeId: id }, 'Dispute update error');
      return apiInternalError();
    }
  }
);
