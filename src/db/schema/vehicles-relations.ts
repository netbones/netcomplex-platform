import { relations } from 'drizzle-orm';
import { vehicles } from './vehicles';
import { tenants } from './tenants';
import { propertyJoinRequests } from './property-join-requests';
import { profiles } from './profiles';
import { standardSeats } from './standard-seats';

export const vehiclesRelations = relations(vehicles, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'TenantToVehicle',
    fields: [vehicles.tenantId],
    references: [tenants.id],
  }),
  joinRequest: helpers.one(propertyJoinRequests, {
    relationName: 'PropertyJoinRequestToVehicle',
    fields: [vehicles.joinRequestId],
    references: [propertyJoinRequests.id],
  }),
  profile: helpers.one(profiles, {
    relationName: 'ProfileToVehicle',
    fields: [vehicles.profileId],
    references: [profiles.id],
  }),
  standardSeat: helpers.one(standardSeats, {
    relationName: 'StandardSeatToVehicle',
    fields: [vehicles.standardSeatId],
    references: [standardSeats.id],
  }),
}));
