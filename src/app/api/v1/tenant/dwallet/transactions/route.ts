import {
  db,
  walletTransactions,
  apiSuccess,
  apiError,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
} from '@api/server';

import { eq, and, desc, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet';
import type { TransactionItem } from '@entities/dwallet';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  const { tenantId } = await withTenant();

  const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

  // Parse query parameters
  const url = new URL(request.url);
  const params = querySchema.parse(Object.fromEntries(url.searchParams));

  const page = params.page;
  const limit = params.limit;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [
    eq(walletTransactions.walletId, wallet.id),
    eq(walletTransactions.tenantId, tenantId),
  ];

  if (params.type) {
    conditions.push(
      eq(
        walletTransactions.type,
        params.type as (typeof walletTransactions.type.enumValues)[number]
      )
    );
  }

  if (params.startDate) {
    conditions.push(sql`${walletTransactions.createdAt} >= ${new Date(params.startDate)}`);
  }

  if (params.endDate) {
    conditions.push(sql`${walletTransactions.createdAt} <= ${new Date(params.endDate)}`);
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(walletTransactions)
    .where(and(...conditions));

  const total = countResult?.count ?? 0;

  // Fetch paginated transactions
  const txns = await db
    .select()
    .from(walletTransactions)
    .where(and(...conditions))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const transactions: TransactionItem[] = txns.map(txn => ({
    id: txn.id,
    type: txn.type as TransactionItem['type'],
    amount: txn.amount,
    description: txn.description,
    sourceType: txn.sourceType as TransactionItem['sourceType'],
    balanceBefore: txn.balanceBefore,
    balanceAfter: txn.balanceAfter,
    createdAt: txn.createdAt.toISOString(),
  }));

  return apiSuccess(transactions, { page, limit, total, hasMore: page * limit < total });
});
