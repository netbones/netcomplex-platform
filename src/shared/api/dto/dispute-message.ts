import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { disputeMessages } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const disputeMessageDto = createSelectSchema(disputeMessages, {
  createdAt: dateSch,
  editedAt: nullDate,
}).pick({
  id: true,
  disputeId: true,
  senderId: true,
  content: true,
  isInternal: true,
  createdAt: true,
  editedAt: true,
});

export type DisputeMessageDto = z.infer<typeof disputeMessageDto>;
