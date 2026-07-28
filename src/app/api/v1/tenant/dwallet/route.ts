import {
  db,
  walletTransactions,
  dataConsents,
  dataRevenueStreams,
  apiSuccess,
  withErrorHandler,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet/server';
import type { DWalletSummary, ConsentState, TransactionItem } from '@entities/dwallet';
import { requireAuth } from '@/shared/api/auth-utils';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { tenantId } = await withTenant();

  // Get or create the resident's wallet
  const wallet = await getOrCreateWallet(auth.data.userId, tenantId);

  // Fetch active revenue streams for this tenant
  const streams = await db
    .select()
    .from(dataRevenueStreams)
    .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

  // Fetch current consent state per stream (latest row per (walletId, streamKey))
  const consents: ConsentState[] = await Promise.all(
    streams.map(async stream => {
      const [latestConsent] = await db
        .select()
        .from(dataConsents)
        .where(and(eq(dataConsents.walletId, wallet.id), eq(dataConsents.streamKey, stream.key)))
        .orderBy(desc(dataConsents.createdAt))
        .limit(1);

      return {
        streamKey: stream.key,
        label: stream.label,
        description: stream.description,
        granted: latestConsent?.granted ?? false,
        grantedAt: latestConsent?.grantedAt?.toISOString() ?? null,
        revokedAt: latestConsent?.revokedAt?.toISOString() ?? null,
      };
    })
  );

  // Fetch 5 most recent transactions
  const recentTxns = await db
    .select()
    .from(walletTransactions)
    .where(
      and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.tenantId, tenantId))
    )
    .orderBy(desc(walletTransactions.createdAt))
    .limit(5);

  const recentTransactions: TransactionItem[] = recentTxns.map(txn => ({
    id: txn.id,
    type: txn.type as TransactionItem['type'],
    amount: txn.amount,
    description: txn.description,
    sourceType: txn.sourceType as TransactionItem['sourceType'],
    balanceBefore: txn.balanceBefore,
    balanceAfter: txn.balanceAfter,
    createdAt: txn.createdAt.toISOString(),
  }));

  const summary: DWalletSummary = {
    balance: wallet.balance,
    lifetimeEarned: wallet.lifetimeEarned,
    lifetimePaid: wallet.lifetimePaid,
    currency: wallet.currency,
    status: wallet.status as DWalletSummary['status'],
    consents,
    recentTransactions,
  };

  return apiSuccess(summary);
});
