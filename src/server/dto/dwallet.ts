import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { dWallets } from '@/db/schema/d-wallets';
import { walletTransactions } from '@/db/schema/wallet-transactions';
import { dataConsents } from '@/db/schema/data-consents';
import { payoutRequests } from '@/db/schema/payout-requests';

const dateSchema = z.date().transform(d => d.toISOString());

export const walletDto = createSelectSchema(dWallets, {
  balance: z.number(),
  lifetimeEarned: z.number(),
  lifetimePaid: z.number(),
  createdAt: dateSchema,
}).pick({
  id: true,
  balance: true,
  currency: true,
  lifetimeEarned: true,
  lifetimePaid: true,
  status: true,
  createdAt: true,
});

export const walletTransactionDto = createSelectSchema(walletTransactions, {
  amount: z.number(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  createdAt: dateSchema,
}).pick({
  id: true,
  type: true,
  amount: true,
  description: true,
  sourceType: true,
  balanceBefore: true,
  balanceAfter: true,
  createdAt: true,
});

export const consentDto = createSelectSchema(dataConsents, {
  grantedAt: dateSchema.nullable(),
  revokedAt: dateSchema.nullable(),
  createdAt: dateSchema,
}).pick({
  id: true,
  streamKey: true,
  granted: true,
  grantedAt: true,
  revokedAt: true,
  createdAt: true,
});

export const payoutDto = createSelectSchema(payoutRequests, {
  amount: z.number(),
  processedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  amount: true,
  currency: true,
  status: true,
  method: true,
  bankReference: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type WalletDto = z.infer<typeof walletDto>;
export type WalletTransactionDto = z.infer<typeof walletTransactionDto>;
export type ConsentDto = z.infer<typeof consentDto>;
export type PayoutDto = z.infer<typeof payoutDto>;
