import { relations } from 'drizzle-orm';
import { gates } from './gates';
import { tenants } from './tenants';
import { accessRequests } from './access-requests';
import { accessEvents } from './access-events';

export const gatesRelations = relations(gates, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'GateToTenant',
    fields: [gates.tenantId],
    references: [tenants.id],
  }),
  accessRequests: helpers.many(accessRequests, { relationName: 'AccessRequestToGate' }),
  accessEvents: helpers.many(accessEvents, { relationName: 'AccessEventToGate' }),
}));
