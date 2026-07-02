import { relations } from 'drizzle-orm';
import { disputeEvidences } from './dispute-evidences';
import { tenants } from './tenants';
import { disputeCases } from './dispute-cases';
import { users } from './users';

export const disputeEvidencesRelations = relations(disputeEvidences, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'DisputeEvidenceToTenant',
    fields: [disputeEvidences.tenantId],
    references: [tenants.id],
  }),
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
