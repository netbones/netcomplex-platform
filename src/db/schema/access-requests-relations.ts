import { relations } from 'drizzle-orm';
import { accessRequests } from './access-requests';
import { tenants } from './tenants';
import { properties } from './properties';
import { gates } from './gates';
import { users } from './users';
import { accessEvents } from './access-events';

export const accessRequestsRelations = relations(accessRequests, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'AccessRequestToTenant',
    fields: [accessRequests.tenantId],
    references: [tenants.id],
  }),
  property: helpers.one(properties, {
    relationName: 'AccessRequestToProperty',
    fields: [accessRequests.propertyId],
    references: [properties.id],
  }),
  gate: helpers.one(gates, {
    relationName: 'AccessRequestToGate',
    fields: [accessRequests.gateId],
    references: [gates.id],
  }),
  respondedBy: helpers.one(users, {
    relationName: 'AccessRequestRespondedBy',
    fields: [accessRequests.respondedByUserId],
    references: [users.id],
  }),
  accessEvents: helpers.many(accessEvents, { relationName: 'AccessEventToAccessRequest' }),
}));
