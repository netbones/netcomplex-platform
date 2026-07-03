import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { communityMerits } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const meritDto = createSelectSchema(communityMerits, {
  recognitionPoints: z.number(),
  disciplinaryPoints: z.number(),
  standingBefore: z.number().nullable(),
  standingAfter: z.number().nullable(),
  createdAt: dateSch,
  expiresAt: nullDate,
}).pick({
  id: true,
  userId: true,
  behaviorType: true,
  category: true,
  reason: true,
  description: true,
  recognitionPoints: true,
  disciplinaryPoints: true,
  standingBefore: true,
  standingAfter: true,
  status: true,
  createdById: true,
  createdAt: true,
  expiresAt: true,
});

export type MeritDto = z.infer<typeof meritDto>;
