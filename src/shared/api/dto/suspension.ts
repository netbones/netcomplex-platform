import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { platformSuspensions } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const suspensionDto = createSelectSchema(platformSuspensions, {
  startDate: dateSch,
  endDate: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
}).pick({
  id: true,
  tenantId: true,
  userId: true,
  suspensionType: true,
  reason: true,
  description: true,
  startDate: true,
  endDate: true,
  isPermanent: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
});

export type SuspensionDto = z.infer<typeof suspensionDto>;
