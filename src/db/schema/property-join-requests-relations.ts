import { relations } from 'drizzle-orm';
import { propertyJoinRequests } from './property-join-requests';
import { tenants } from './tenants';
import { properties } from './properties';
import { vehicles } from './vehicles';

export const propertyJoinRequestsRelations = relations(propertyJoinRequests, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'PropertyJoinRequestToTenant',
    fields: [propertyJoinRequests.tenantId],
    references: [tenants.id],
  }),
  property: helpers.one(properties, {
    relationName: 'PropertyToPropertyJoinRequest',
    fields: [propertyJoinRequests.propertyId],
    references: [properties.id],
  }),
  vehicles: helpers.many(vehicles, { relationName: 'PropertyJoinRequestToVehicle' }),
}));
