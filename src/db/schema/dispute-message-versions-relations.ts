import { relations } from 'drizzle-orm';
import { disputeMessageVersions } from './dispute-message-versions';
import { disputeMessages } from './dispute-messages';

export const disputeMessageVersionsRelations = relations(disputeMessageVersions, helpers => ({
  message: helpers.one(disputeMessages, {
    relationName: 'DisputeMessageToDisputeMessageVersion',
    fields: [disputeMessageVersions.messageId],
    references: [disputeMessages.id],
  }),
}));
