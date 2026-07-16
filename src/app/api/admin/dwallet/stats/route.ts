import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
  withErrorHandler,
  getSessionAndRole,
  db,
  dWallets,
  dataConsents,
  payoutRequests,
  walletTransactions,
  guardSuspension,
} from '@api/server';
import { hasPermission } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { eq, and, gte, sql, count, countDistinct, sum } from 'drizzle-orm';

export const maxDuration = 8;

const logger = createComponentLogger('admin-dwallet-stats');

/**
 * GET /api/admin/dwallet/stats
 *
 * Returns aggregate-only admin stats:
 * - optedInResidents: count of active wallets with at least one granted consent
 * - totalRewardsMonth: sum of CREDIT transactions for current month
 * - pendingPayouts: count of PENDING payout requests
 * - totalOptedInAllStreams: total distinct (walletId, streamKey) consents where granted=true
 *
 * CONSTRAINT 5: Never returns individual balances, consent choices, or transaction details.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();
  const guard = guardSuspension(sessionData);
  if (guard) return guard;

  if (!hasPermission(sessionData.role, 'admin')) return apiForbidden();

  try {
    const { tenantId } = await withTenant();

    // optedInResidents: count distinct walletIds where status='ACTIVE'
    // AND at least one DataConsent exists with granted=true
    const optedInResult = await db
      .select({ count: countDistinct(dataConsents.walletId) })
      .from(dataConsents)
      .innerJoin(dWallets, eq(dWallets.id, dataConsents.walletId))
      .where(
        and(
          eq(dataConsents.tenantId, tenantId),
          eq(dataConsents.granted, true),
          eq(dWallets.status, 'ACTIVE'),
          eq(dWallets.tenantId, tenantId)
        )
      );

    const optedInResidents = Number(optedInResult[0]?.count ?? 0);

    // totalRewardsMonth: SUM of CREDIT transactions for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const rewardsResult = await db
      .select({ total: sum(walletTransactions.amount) })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.tenantId, tenantId),
          eq(walletTransactions.type, 'CREDIT'),
          gte(walletTransactions.createdAt, monthStart)
        )
      );

    const totalRewardsMonth = rewardsResult[0]?.total ?? '0.00';

    // pendingPayouts: COUNT of PENDING payout requests
    const pendingResult = await db
      .select({ count: count() })
      .from(payoutRequests)
      .where(and(eq(payoutRequests.tenantId, tenantId), eq(payoutRequests.status, 'PENDING')));

    const pendingPayouts = Number(pendingResult[0]?.count ?? 0);

    // totalOptedInAllStreams: total distinct (walletId, streamKey) consents where granted=true
    const allStreamsResult = await db
      .select({
        count: countDistinct(sql`${dataConsents.walletId} || ':' || ${dataConsents.streamKey}`),
      })
      .from(dataConsents)
      .where(and(eq(dataConsents.tenantId, tenantId), eq(dataConsents.granted, true)));

    const totalOptedInAllStreams = Number(allStreamsResult[0]?.count ?? 0);

    const stats = {
      optedInResidents,
      totalRewardsMonth: String(totalRewardsMonth),
      pendingPayouts,
      totalOptedInAllStreams,
    };

    return apiSuccess(stats);
  } catch (error) {
    logger.error({ event: 'stats_error' }, 'Failed to fetch admin stats', error);
    return apiInternalError(String(error));
  }
});
