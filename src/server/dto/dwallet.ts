import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const walletDto = z.object({
  id: z.string(),
  balance: z.number(),
  currency: z.string(),
  lifetimeEarned: z.number(),
  lifetimePaid: z.number(),
  status: z.string(),
  createdAt: dateSchema,
});

export const walletTransactionDto = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.number(),
  description: z.string(),
  sourceType: z.string(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  createdAt: dateSchema,
});

export const consentDto = z.object({
  id: z.string(),
  streamKey: z.string(),
  granted: z.boolean(),
  grantedAt: dateSchema.nullable(),
  revokedAt: dateSchema.nullable(),
  createdAt: dateSchema,
});

export const payoutDto = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  method: z.string().nullable(),
  bankReference: z.string().nullable(),
  processedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type WalletDto = z.infer<typeof walletDto>;
export type WalletTransactionDto = z.infer<typeof walletTransactionDto>;
export type ConsentDto = z.infer<typeof consentDto>;
export type PayoutDto = z.infer<typeof payoutDto>;
