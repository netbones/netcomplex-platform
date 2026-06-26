import { relations } from 'drizzle-orm';
import { disputeMessages } from './dispute-messages';
import { disputeCases } from './dispute-cases';
import { users } from './users';
import { disputeMessageVersions } from './dispute-message-versions';

export const disputeMessagesRelations = relations(disputeMessages, helpers => ({
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
