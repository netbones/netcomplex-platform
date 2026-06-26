import { relations } from 'drizzle-orm';
import { disputeEvidences } from './dispute-evidences';
import { disputeCases } from './dispute-cases';
import { users } from './users';

export const disputeEvidencesRelations = relations(disputeEvidences, helpers => ({
  dispute: helpers.one(disputeCases, {
    relationName: 'DisputeCaseToDisputeEvidence',
    fields: [disputeEvidences.disputeId],
    references: [disputeCases.id],
  }),
  uploader: helpers.one(users, {
    relationName: 'DisputeEvidenceUploader',
    fields: [disputeEvidences.uploadedBy],
    references: [users.id],
  }),
}));
