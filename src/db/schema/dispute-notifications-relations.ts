import { relations } from 'drizzle-orm';
import { disputeNotifications } from './dispute-notifications';
import { disputeCases } from './dispute-cases';
import { users } from './users';

export const disputeNotificationsRelations = relations(disputeNotifications, helpers => ({
  dispute: helpers.one(disputeCases, {
    relationName: 'DisputeCaseToDisputeNotification',
    fields: [disputeNotifications.disputeId],
    references: [disputeCases.id],
  }),
  user: helpers.one(users, {
    relationName: 'DisputeNotificationUser',
    fields: [disputeNotifications.userId],
    references: [users.id],
  }),
}));
