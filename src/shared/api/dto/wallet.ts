import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { dWallets } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const walletDto = createSelectSchema(dWallets, {
  balance: z.number(),
  lifetimeEarned: z.number(),
  lifetimePaid: z.number(),
  createdAt: dateSch,
}).pick({
  id: true,
  balance: true,
  currency: true,
  lifetimeEarned: true,
  lifetimePaid: true,
  status: true,
  createdAt: true,
});

export type WalletDto = z.infer<typeof walletDto>;
