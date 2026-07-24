import { relations } from 'drizzle-orm';
import { disputeEvents } from './dispute-events';
import { tenants } from './tenants';
import { users } from './users';
import { disputeCases } from './dispute-cases';

export const disputeEventsRelations = relations(disputeEvents, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'DisputeEventToTenant', fields: [ disputeEvents.tenantId ], references: [ tenants.id ] }), actor: helpers.one(users, { relationName: 'DisputeEventActor', fields: [ disputeEvents.actorId ], references: [ users.id ] }), dispute: helpers.one(disputeCases, { relationName: 'DisputeCaseToDisputeEvent', fields: [ disputeEvents.disputeId ], references: [ disputeCases.id ] }) }));