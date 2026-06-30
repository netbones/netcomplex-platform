import {
  db,
  payoutRequests,
  apiSuccess,
  apiCreated,
  apiError,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
  now,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet/server';
import { payoutRequestSchema } from '@entities/dwallet';
import type { PayoutRequestItem } from '@entities/dwallet';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  const { tenantId } = await withTenant();

  const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

  // List own payout requests
  const payouts = await db
    .select()
    .from(payoutRequests)
    .where(and(eq(payoutRequests.walletId, wallet.id), eq(payoutRequests.tenantId, tenantId)))
    .orderBy(desc(payoutRequests.createdAt));

  const items: PayoutRequestItem[] = payouts.map(p => ({
    id: p.id,
    amount: p.amount,
    status: p.status as PayoutRequestItem['status'],
    method: p.method,
    createdAt: p.createdAt.toISOString(),
    processedAt: p.processedAt?.toISOString() ?? null,
    notes: p.notes,
  }));

  return apiSuccess(items);
});

export const POST = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  const { tenantId } = await withTenant();

  const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

  // Parse and validate body with Zod
  const body = payoutRequestSchema.parse(await request.json());

  // Enforce minimum payout threshold of R50
  const balanceNum = Number(wallet.balance);
  if (balanceNum < 50) {
    return apiError('VALIDATION_ERROR', 'Below minimum payout threshold of R50', 400);
  }

  const timestamp = now();
  const payoutId = createId();

  // INSERT PayoutRequest with PENDING status
  // Balance is NOT modified — debited only when admin marks COMPLETED
  await db.insert(payoutRequests).values({
    id: payoutId,
    tenantId,
    walletId: wallet.id,
    userId: sessionData.userId,
    amount: body.amount.toString(),
    currency: wallet.currency,
    status: 'PENDING',
    method: 'bank_transfer',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return apiCreated({
    id: payoutId,
    amount: body.amount.toString(),
    status: 'PENDING',
    method: 'bank_transfer',
    createdAt: timestamp.toISOString(),
  });
});
