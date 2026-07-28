import 'server-only';

import { db, dWallets, now } from '@api/server';
import { createComponentLogger } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

const logger = createComponentLogger('dwallet-api');

/**
 * Starting balance credited to newly created wallets.
 * Used for testing/dev — users can send chips immediately without a
 * prior earn event.
 */
const NEW_WALLET_BALANCE = '1000.00';

/**
 * Upsert a DWallet for the given user. Creates with ACTIVE status and
 * {@link NEW_WALLET_BALANCE} chips if none exists. Returns the wallet record.
 *
 * Called by all API routes that need the wallet — single source of truth for
 * wallet creation.
 */
export async function getOrCreateWallet(userId: string, tenantId: string) {
  const [existing] = await db
    .select()
    .from(dWallets)
    .where(and(eq(dWallets.userId, userId), eq(dWallets.tenantId, tenantId)))
    .limit(1);

  if (existing) return existing;

  const id = createId();
  const timestamp = now();

  const [wallet] = await db
    .insert(dWallets)
    .values({
      id,
      tenantId,
      userId,
      balance: NEW_WALLET_BALANCE,
      lifetimePaid: '0.00',
      lifetimeEarned: '0.00',
      updatedAt: timestamp,
    })
    .onConflictDoNothing()
    .returning();

  if (wallet) {
    logger.info({ event: 'wallet_created', userId, tenantId, walletId: wallet.id });
    return wallet;
  }

  const [retried] = await db
    .select()
    .from(dWallets)
    .where(and(eq(dWallets.userId, userId), eq(dWallets.tenantId, tenantId)))
    .limit(1);

  return retried;
}
