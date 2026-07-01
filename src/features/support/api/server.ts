import 'server-only';

import { db, dWallets, walletTransactions, supports, now } from '@api/server';
import { createComponentLogger } from '@shared/lib';
import { eq, and, sql } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

import type { SupportTarget } from '@entities/dwallet';

const logger = createComponentLogger('support-service');

export interface CreateSupportParams {
  tenantId: string;
  senderUserId: string;
  recipientUserId: string;
  targetType: SupportTarget;
  targetId: string;
  chips: number;
  message?: string;
  isAnonymous?: boolean;
}

export interface SupportServiceResult {
  supportId: string;
  senderBalanceAfter: number;
  recipientBalanceAfter: number;
}

/**
 * Create a "Support with Chips" transfer.
 *
 * Atomically debits the sender's dWallet, credits the recipient's dWallet,
 * writes two immutable WalletTransaction ledger entries, and records a
 * Support row for analytics and social proof.
 *
 * Throws if sender == recipient, sender balance is insufficient, or either
 * wallet is not ACTIVE.
 */
export async function createSupport(
  params: CreateSupportParams
): Promise<SupportServiceResult> {
  const {
    tenantId,
    senderUserId,
    recipientUserId,
    targetType,
    targetId,
    chips,
    message,
    isAnonymous = false,
  } = params;

  if (senderUserId === recipientUserId) {
    throw new SupportError('Cannot support yourself', 'SELF_SUPPORT');
  }

  if (chips <= 0) {
    throw new SupportError('Chips must be positive', 'INVALID_CHIPS');
  }

  const supportId = createId();

  try {
    return await db.transaction(async tx => {
      // Lock both wallets in deterministic order (by id) to avoid deadlocks.
      const walletQuery = (userId: string) =>
        tx
          .select()
          .from(dWallets)
          .where(and(eq(dWallets.userId, userId), eq(dWallets.tenantId, tenantId)))
          .limit(1)
          .for('update');

      const [senderWallet, recipientWallet] = await Promise.all([
        walletQuery(senderUserId),
        walletQuery(recipientUserId),
      ]);

      if (!senderWallet?.[0]) {
        throw new SupportError('Sender wallet not found', 'WALLET_NOT_FOUND');
      }
      if (!recipientWallet?.[0]) {
        throw new SupportError('Recipient wallet not found', 'WALLET_NOT_FOUND');
      }

      const sender = senderWallet[0];
      const recipient = recipientWallet[0];

      if (sender.status !== 'ACTIVE') {
        throw new SupportError('Sender wallet is not active', 'WALLET_INACTIVE');
      }
      if (recipient.status !== 'ACTIVE') {
        throw new SupportError('Recipient wallet is not active', 'WALLET_INACTIVE');
      }

      const senderBalance = Number(sender.balance);
      if (senderBalance < chips) {
        throw new SupportError(
          `Insufficient chips. You have ${senderBalance}, tried to send ${chips}.`,
          'INSUFFICIENT_CHIPS'
        );
      }

      const senderBalanceAfter = senderBalance - chips;
      const recipientBalanceAfter = Number(recipient.balance) + chips;
      const senderLifetimePaid = Number(sender.lifetimePaid) + chips;
      const recipientLifetimeEarned = Number(recipient.lifetimeEarned) + chips;

      // Debit sender
      await tx.insert(walletTransactions).values({
        id: createId(),
        tenantId,
        walletId: sender.id,
        type: 'DEBIT',
        amount: chips.toFixed(2),
        currency: sender.currency,
        description: `Supported ${targetType.toLowerCase()} #${targetId}`,
        sourceType: 'COMMUNITY_SUPPORT',
        referenceId: supportId,
        referenceType: 'support',
        balanceBefore: sender.balance,
        balanceAfter: senderBalanceAfter.toFixed(2),
        createdAt: now(),
      });

      // Credit recipient
      await tx.insert(walletTransactions).values({
        id: createId(),
        tenantId,
        walletId: recipient.id,
        type: 'CREDIT',
        amount: chips.toFixed(2),
        currency: recipient.currency,
        description: 'Community support',
        sourceType: 'COMMUNITY_SUPPORT',
        referenceId: supportId,
        referenceType: 'support',
        balanceBefore: recipient.balance,
        balanceAfter: recipientBalanceAfter.toFixed(2),
        createdAt: now(),
      });

      // Update wallet balances
      await tx
        .update(dWallets)
        .set({
          balance: senderBalanceAfter.toFixed(2),
          lifetimePaid: senderLifetimePaid.toFixed(2),
          updatedAt: now(),
        })
        .where(eq(dWallets.id, sender.id));

      await tx
        .update(dWallets)
        .set({
          balance: recipientBalanceAfter.toFixed(2),
          lifetimeEarned: recipientLifetimeEarned.toFixed(2),
          updatedAt: now(),
        })
        .where(eq(dWallets.id, recipient.id));

      // Record the Support
      await tx.insert(supports).values({
        id: supportId,
        tenantId,
        senderUserId,
        recipientUserId,
        targetType,
        targetId,
        chips,
        message: message ?? null,
        isAnonymous,
        createdAt: now(),
      });

      logger.info({
        event: 'support_created',
        supportId,
        senderUserId,
        recipientUserId,
        targetType,
        targetId,
        chips,
      });

      return {
        supportId,
        senderBalanceAfter,
        recipientBalanceAfter,
      };
    });
  } catch (error) {
    if (error instanceof SupportError) throw error;
    logger.error({ event: 'support_failed', error, supportId });
    throw new SupportError('Support transfer failed', 'INTERNAL_ERROR');
  }
}

export class SupportError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'SupportError';
  }
}

/**
 * Aggregate support stats for a target (e.g. a content post).
 */
export async function getSupportAggregate(
  tenantId: string,
  targetType: SupportTarget,
  targetId: string,
  viewerUserId?: string
) {
  const [aggregate] = await db
    .select({
      totalChips: sql<number>`COALESCE(SUM(${supports.chips}), 0)::int`,
      supporterCount: sql<number>`COUNT(DISTINCT ${supports.senderUserId})::int`,
    })
    .from(supports)
    .where(
      and(
        eq(supports.tenantId, tenantId),
        eq(supports.targetType, targetType),
        eq(supports.targetId, targetId)
      )
    );

  let yourChips = 0;
  let hasSupported = false;

  if (viewerUserId) {
    const [yours] = await db
      .select({
        totalChips: sql<number>`COALESCE(SUM(${supports.chips}), 0)::int`,
      })
      .from(supports)
      .where(
        and(
          eq(supports.tenantId, tenantId),
          eq(supports.targetType, targetType),
          eq(supports.targetId, targetId),
          eq(supports.senderUserId, viewerUserId)
        )
      );
    yourChips = yours?.totalChips ?? 0;
    hasSupported = yourChips > 0;
  }

  return {
    totalChips: aggregate?.totalChips ?? 0,
    supporterCount: aggregate?.supporterCount ?? 0,
    hasSupported,
    yourChips,
  };
}
