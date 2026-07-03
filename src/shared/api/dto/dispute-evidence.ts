import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { disputeEvidences } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const disputeEvidenceDto = createSelectSchema(disputeEvidences, {
  createdAt: dateSch,
}).pick({
  id: true,
  disputeId: true,
  uploadedBy: true,
  fileUrl: true,
  fileType: true,
  fileName: true,
  description: true,
  createdAt: true,
});

export type DisputeEvidenceDto = z.infer<typeof disputeEvidenceDto>;
