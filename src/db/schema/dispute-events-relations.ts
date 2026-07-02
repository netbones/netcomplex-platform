import { relations } from 'drizzle-orm';
import { disputeEvents } from './dispute-events';
import { users } from './users';
import { disputeCases } from './dispute-cases';

export const disputeEventsRelations = relations(disputeEvents, helpers => ({
  actor: helpers.one(users, {
    relationName: 'DisputeEventActor',
    fields: [disputeEvents.actorId],
    references: [users.id],
  }),
  dispute: helpers.one(disputeCases, {
    relationName: 'DisputeCaseToDisputeEvent',
    fields: [disputeEvents.disputeId],
    references: [disputeCases.id],
  }),
}));
