import {
  db,
  dataConsents,
  walletTransactions,
  payoutRequests,
  apiSuccess,
  apiError,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
  now,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet';
import { exportRequestSchema } from '@entities/dwallet';
import { createComponentLogger } from '@shared/lib';
import { NextResponse } from 'next/server';

const logger = createComponentLogger('dwallet-export');

export const maxDuration = 8;

export const POST = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  const { tenantId } = await withTenant();

  // Parse and validate body with Zod
  const body = exportRequestSchema.parse(await request.json());

  const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

  const timestamp = now();

  // Fetch all own data — filtered by walletId + tenantId
  const [consents, transactions, payouts] = await Promise.all([
    db
      .select()
      .from(dataConsents)
      .where(and(eq(dataConsents.walletId, wallet.id), eq(dataConsents.tenantId, tenantId)))
      .orderBy(desc(dataConsents.createdAt)),

    db
      .select()
      .from(walletTransactions)
      .where(
        and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.tenantId, tenantId))
      )
      .orderBy(desc(walletTransactions.createdAt)),

    db
      .select()
      .from(payoutRequests)
      .where(and(eq(payoutRequests.walletId, wallet.id), eq(payoutRequests.tenantId, tenantId)))
      .orderBy(desc(payoutRequests.createdAt)),
  ]);

  // Build export payload
  const exportData = {
    exportedAt: timestamp.toISOString(),
    format: body.format,
    wallet: {
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimePaid: wallet.lifetimePaid,
      status: wallet.status,
    },
    consents: consents.map(c => ({
      id: c.id,
      streamKey: c.streamKey,
      granted: c.granted,
      grantedAt: c.grantedAt?.toISOString() ?? null,
      revokedAt: c.revokedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      sourceType: t.sourceType,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt.toISOString(),
    })),
    payouts: payouts.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      method: p.method,
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt?.toISOString() ?? null,
    })),
  };

  if (body.format === 'csv') {
    // Simple CSV conversion for transactions (most commonly exported)
    const headers = [
      'id',
      'type',
      'amount',
      'description',
      'sourceType',
      'balanceBefore',
      'balanceAfter',
      'createdAt',
    ];
    const csvRows = [
      headers.join(','),
      ...transactions.map(t =>
        [
          t.id,
          t.type,
          t.amount,
          `"${t.description.replace(/"/g, '""')}"`,
          t.sourceType,
          t.balanceBefore,
          t.balanceAfter,
          t.createdAt.toISOString(),
        ].join(',')
      ),
    ];
    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dwallet-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // Default: JSON format
  return apiSuccess({ format: body.format, data: exportData, exportedAt: timestamp.toISOString() });
});
