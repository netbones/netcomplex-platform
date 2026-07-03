import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { disputeCases } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const disputeCaseDto = createSelectSchema(disputeCases, {
  intakeCompletedAt: nullDate,
  coolingOffEndsAt: nullDate,
  submittedAt: nullDate,
  mediationOfferedAt: nullDate,
  mediationAcceptedAt: nullDate,
  rulingIssuedAt: nullDate,
  csosEscalatedAt: nullDate,
  csosClosedAt: nullDate,
  resolvedAt: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
}).pick({
  id: true,
  tenantId: true,
  referenceNumber: true,
  complainantId: true,
  respondentId: true,
  respondentType: true,
  category: true,
  subcategory: true,
  title: true,
  description: true,
  desiredOutcome: true,
  severity: true,
  status: true,
  intakeCompletedAt: true,
  coolingOffEndsAt: true,
  submittedAt: true,
  assignedModeratorId: true,
  mediationOfferedAt: true,
  mediationAcceptedAt: true,
  rulingIssuedAt: true,
  rulingDescription: true,
  csosReferenceNumber: true,
  csosEscalatedAt: true,
  csosClosedAt: true,
  resolvedAt: true,
  closedById: true,
  closedReason: true,
  isConfidential: true,
  createdAt: true,
  updatedAt: true,
});

export type DisputeCaseDto = z.infer<typeof disputeCaseDto>;
