import { relations } from 'drizzle-orm';
import { disputeEvents } from './dispute-events';
import { disputeCases } from './dispute-cases';
import { users } from './users';

export const disputeEventsRelations = relations(disputeEvents, (helpers) => ({ dispute: helpers.one(disputeCases, { relationName: 'DisputeCaseToDisputeEvent', fields: [ disputeEvents.disputeId ], references: [ disputeCases.id ] }), actor: helpers.one(users, { relationName: 'DisputeEventActor', fields: [ disputeEvents.actorId ], references: [ users.id ] }) }));