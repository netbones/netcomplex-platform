import { relations } from 'drizzle-orm';
import { disputeCases } from './dispute-cases';
import { users } from './users';
import { disputeEvidences } from './dispute-evidences';
import { disputeEvents } from './dispute-events';
import { disputeMessages } from './dispute-messages';
import { disputeNotifications } from './dispute-notifications';

export const disputeCasesRelations = relations(disputeCases, helpers => ({
  complainant: helpers.one(users, {
    relationName: 'DisputeComplainant',
    fields: [disputeCases.complainantId],
    references: [users.id],
  }),
  respondent: helpers.one(users, {
    relationName: 'DisputeRespondent',
    fields: [disputeCases.respondentId],
    references: [users.id],
  }),
  assignedModerator: helpers.one(users, {
    relationName: 'DisputeModerator',
    fields: [disputeCases.assignedModeratorId],
    references: [users.id],
  }),
  closedBy: helpers.one(users, {
    relationName: 'DisputeClosedBy',
    fields: [disputeCases.closedById],
    references: [users.id],
  }),
  evidence: helpers.many(disputeEvidences, { relationName: 'DisputeCaseToDisputeEvidence' }),
  events: helpers.many(disputeEvents, { relationName: 'DisputeCaseToDisputeEvent' }),
  mediationThread: helpers.many(disputeMessages, { relationName: 'DisputeCaseToDisputeMessage' }),
  notifications: helpers.many(disputeNotifications, {
    relationName: 'DisputeCaseToDisputeNotification',
  }),
}));
