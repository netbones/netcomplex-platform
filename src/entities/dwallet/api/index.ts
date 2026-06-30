import 'server-only';

import { db, dWallets, now } from '@api/server';
import { createComponentLogger } from '@shared/lib';
import { eq, and } from 'drizzle-orm';

const logger = createComponentLogger('dwallet-api');

/**
 * Upsert a DWallet for the given user. Creates with ACTIVE status and 0 balance
 * if none exists. Returns the wallet record.
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

  const id = crypto.randomUUID();
  const timestamp = now();

  const [wallet] = await db
    .insert(dWallets)
    .values({
      id,
      tenantId,
      userId,
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
