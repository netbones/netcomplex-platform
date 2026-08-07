import { relations } from 'drizzle-orm';
import { disputeMessages } from './dispute-messages';
import { tenants } from './tenants';
import { disputeCases } from './dispute-cases';
import { users } from './users';
import { disputeMessageVersions } from './dispute-message-versions';

export const disputeMessagesRelations = relations(disputeMessages, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'DisputeMessageToTenant',
    fields: [disputeMessages.tenantId],
    references: [tenants.id],
  }),
  dispute: helpers.one(disputeCases, {
    relationName: 'DisputeCaseToDisputeMessage',
    fields: [disputeMessages.disputeId],
    references: [disputeCases.id],
  }),
  sender: helpers.one(users, {
    relationName: 'DisputeMessageSender',
    fields: [disputeMessages.senderId],
    references: [users.id],
  }),
  versions: helpers.many(disputeMessageVersions, {
    relationName: 'DisputeMessageToDisputeMessageVersion',
  }),
}));
