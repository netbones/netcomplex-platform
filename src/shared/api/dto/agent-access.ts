import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { agentAccesses } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const agentAccessDto = createSelectSchema(agentAccesses, {
  startedAt: dateSch,
  expiresAt: dateSch,
  acceptedAt: nullDate,
  rejectedAt: nullDate,
  revokedAt: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
}).pick({
  id: true,
  agentId: true,
  propertyId: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
});

export type AgentAccessDto = z.infer<typeof agentAccessDto>;
