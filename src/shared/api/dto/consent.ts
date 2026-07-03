import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { dataConsents } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const consentDto = createSelectSchema(dataConsents, {
  grantedAt: nullDate,
  revokedAt: nullDate,
  createdAt: dateSch,
}).pick({
  id: true,
  streamKey: true,
  granted: true,
  grantedAt: true,
  revokedAt: true,
  createdAt: true,
});

export type ConsentDto = z.infer<typeof consentDto>;
