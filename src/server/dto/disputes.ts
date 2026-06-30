import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { disputeCases } from '@/db/schema/dispute-cases';
import { disputeEvents } from '@/db/schema/dispute-events';
import { disputeEvidences } from '@/db/schema/dispute-evidences';
import { disputeMessages } from '@/db/schema/dispute-messages';

const dateSchema = z.date().transform(d => d.toISOString());

export const disputeCaseDto = createSelectSchema(disputeCases, {
  intakeCompletedAt: dateSchema.nullable(),
  coolingOffEndsAt: dateSchema.nullable(),
  submittedAt: dateSchema.nullable(),
  mediationOfferedAt: dateSchema.nullable(),
  mediationAcceptedAt: dateSchema.nullable(),
  rulingIssuedAt: dateSchema.nullable(),
  csosEscalatedAt: dateSchema.nullable(),
  csosClosedAt: dateSchema.nullable(),
  resolvedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
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

export const disputeEventDto = createSelectSchema(disputeEvents, {
  createdAt: dateSchema,
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

export const disputeEvidenceDto = createSelectSchema(disputeEvidences, {
  createdAt: dateSchema,
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

export const disputeMessageDto = createSelectSchema(disputeMessages, {
  createdAt: dateSchema,
  editedAt: dateSchema.nullable(),
}).pick({
  id: true,
  disputeId: true,
  senderId: true,
  content: true,
  isInternal: true,
  createdAt: true,
  editedAt: true,
});

export type DisputeCaseDto = z.infer<typeof disputeCaseDto>;
export type DisputeEventDto = z.infer<typeof disputeEventDto>;
export type DisputeEvidenceDto = z.infer<typeof disputeEvidenceDto>;
export type DisputeMessageDto = z.infer<typeof disputeMessageDto>;
