import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { payoutRequests } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const payoutDto = createSelectSchema(payoutRequests, {
  amount: z.number(),
  processedAt: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
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

export type PayoutDto = z.infer<typeof payoutDto>;
