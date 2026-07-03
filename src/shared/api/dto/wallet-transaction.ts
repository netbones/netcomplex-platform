import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { walletTransactions } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const walletTransactionDto = createSelectSchema(walletTransactions, {
  amount: z.number(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  createdAt: dateSch,
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

export type WalletTransactionDto = z.infer<typeof walletTransactionDto>;
