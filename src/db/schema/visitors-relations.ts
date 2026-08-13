import { relations } from 'drizzle-orm';
import { visitors } from './visitors';
import { tenants } from './tenants';
import { properties } from './properties';
import { users } from './users';
import { accessCodes } from './access-codes';
import { accessEvents } from './access-events';

export const visitorsRelations = relations(visitors, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'TenantToVisitor',
    fields: [visitors.tenantId],
    references: [tenants.id],
  }),
  property: helpers.one(properties, {
    relationName: 'PropertyToVisitor',
    fields: [visitors.propertyId],
    references: [properties.id],
  }),
  requestedBy: helpers.one(users, {
    relationName: 'VisitorRequestedBy',
    fields: [visitors.requestedByUserId],
    references: [users.id],
  }),
  accessCodes: helpers.many(accessCodes, { relationName: 'AccessCodeToVisitor' }),
  accessEvents: helpers.many(accessEvents, { relationName: 'AccessEventToVisitor' }),
}));
