import {
  db,
  dWallets,
  walletTransactions,
  dataConsents,
  apiSuccess,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
  now,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet/server';
import { createComponentLogger } from '@shared/lib';
import { createId } from '@shared/lib/id';

const logger = createComponentLogger('dwalet-deletion');

export const maxDuration = 8;

export const POST = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  const { tenantId } = await withTenant();

  const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

  // If already closed, return early
  if (wallet.status === 'CLOSED') {
    return apiSuccess({ status: 'CLOSED', message: 'Wallet already closed' });
  }

  const timestamp = now();
  const balanceBefore = wallet.balance;

  // If wallet has a balance, sweep it to Community Benefit Fund via a ROLLOVER transaction
  if (Number(balanceBefore) > 0) {
    const rolloverAmount = (-1 * Number(balanceBefore)).toString();

    // Insert immutable ROLLOVER transaction (Constraint 1 — append-only)
    await db.insert(walletTransactions).values({
      id: createId(),
      tenantId,
      walletId: wallet.id,
      type: 'ROLLOVER',
      amount: rolloverAmount,
      currency: wallet.currency,
      description: 'Balance swept to Community Benefit Fund on account deletion',
      referenceId: null,
      referenceType: null,
      balanceBefore,
      balanceAfter: '0',
      sourceType: 'RESIDENT_DATA_SHARE',
      createdAt: timestamp,
    });
  }

  // Update wallet status to CLOSED and balance to 0
  await db
    .update(dWallets)
    .set({
      balance: '0',
      status: 'CLOSED',
      updatedAt: timestamp,
    })
    .where(and(eq(dWallets.id, wallet.id), eq(dWallets.tenantId, tenantId)));

  // Anonymise consent records — set userId to anonymised placeholder
  // (Schema has userId NOT NULL; anonymisation uses placeholder instead of null)
  await db
    .update(dataConsents)
    .set({
      userId: 'ANONYMISED',
    })
    .where(and(eq(dataConsents.walletId, wallet.id), eq(dataConsents.tenantId, tenantId)));

  // Pino audit log for deletion request
  logger.info({
    event: 'deletion_request',
    userId: sessionData.userId,
    tenantId,
    walletId: wallet.id,
  });

  return apiSuccess({
    status: 'CLOSED',
    message: 'Account closure initiated. Data anonymisation in progress.',
  });
});
