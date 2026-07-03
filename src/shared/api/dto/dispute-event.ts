import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { disputeEvents } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const disputeEventDto = createSelectSchema(disputeEvents, {
  createdAt: dateSch,
}).pick({
  id: true,
  disputeId: true,
  actorId: true,
  eventType: true,
  fromStatus: true,
  toStatus: true,
  note: true,
  metadata: true,
  createdAt: true,
});

export type DisputeEventDto = z.infer<typeof disputeEventDto>;
