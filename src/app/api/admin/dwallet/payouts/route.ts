import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
  withErrorHandler,
  getSessionAndRole,
  db,
  payoutRequests,
  users,
  guardSuspension,
} from '@api/server';
import { hasPermission } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { eq, and, desc } from 'drizzle-orm';

export const maxDuration = 8;

const logger = createComponentLogger('admin-dwallet-payouts');

/**
 * GET /api/admin/dwallet/payouts
 *
 * Lists all PayoutRequest records for the tenant, ordered by createdAt desc.
 * JOINs with users table to get resident name for ADMIN/BOARD payment processing.
 *
 * CONSTRAINT 5: walletId is NOT included in the response (prevents balance lookup).
 * Only resident name is shown — the exception for ADMIN/BOARD payment processing.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();
  const guard = guardSuspension(sessionData);
  if (guard) return guard;

  if (!hasPermission(sessionData.role, 'admin')) return apiForbidden();

  try {
    const { tenantId } = await withTenant();

    const results = await db
      .select({
        id: payoutRequests.id,
        amount: payoutRequests.amount,
        currency: payoutRequests.currency,
        status: payoutRequests.status,
        method: payoutRequests.method,
        bankReference: payoutRequests.bankReference,
        createdAt: payoutRequests.createdAt,
        processedAt: payoutRequests.processedAt,
        processedBy: payoutRequests.processedBy,
        residentUserId: payoutRequests.userId,
        residentName: users.name,
      })
      .from(payoutRequests)
      .leftJoin(users, and(eq(users.id, payoutRequests.userId), eq(users.tenantId, tenantId)))
      .where(eq(payoutRequests.tenantId, tenantId))
      .orderBy(desc(payoutRequests.createdAt));

    // Map to PayoutRequestItem — explicitly exclude walletId
    const items = results.map(r => ({
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      method: r.method,
      bankReference: r.bankReference,
      residentName: r.residentName,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
      processedBy: r.processedBy,
    }));

    return apiSuccess(items);
  } catch (error) {
    logger.error({ event: 'list_payouts_error' }, 'Failed to list payout requests', error);
    return apiInternalError(String(error));
  }
});
