import { relations } from 'drizzle-orm';
import { accessEvents } from './access-events';
import { tenants } from './tenants';
import { gates } from './gates';
import { properties } from './properties';
import { visitors } from './visitors';
import { accessRequests } from './access-requests';
import { users } from './users';

export const accessEventsRelations = relations(accessEvents, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'AccessEventToTenant',
    fields: [accessEvents.tenantId],
    references: [tenants.id],
  }),
  gate: helpers.one(gates, {
    relationName: 'AccessEventToGate',
    fields: [accessEvents.gateId],
    references: [gates.id],
  }),
  property: helpers.one(properties, {
    relationName: 'AccessEventToProperty',
    fields: [accessEvents.propertyId],
    references: [properties.id],
  }),
  visitor: helpers.one(visitors, {
    relationName: 'AccessEventToVisitor',
    fields: [accessEvents.visitorId],
    references: [visitors.id],
  }),
  accessRequest: helpers.one(accessRequests, {
    relationName: 'AccessEventToAccessRequest',
    fields: [accessEvents.accessRequestId],
    references: [accessRequests.id],
  }),
  actorUser: helpers.one(users, {
    relationName: 'AccessEventActor',
    fields: [accessEvents.actorUserId],
    references: [users.id],
  }),
}));
