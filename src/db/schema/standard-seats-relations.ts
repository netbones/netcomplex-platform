import { relations } from 'drizzle-orm';
import { standardSeats } from './standard-seats';
import { addresses } from './addresses';
import { properties } from './properties';
import { tenants } from './tenants';
import { users } from './users';
import { vehicles } from './vehicles';

export const standardSeatsRelations = relations(standardSeats, helpers => ({
  address: helpers.one(addresses, {
    relationName: 'AddressToStandardSeat',
    fields: [standardSeats.addressId],
    references: [addresses.id],
  }),
  property: helpers.one(properties, {
    relationName: 'PropertyToStandardSeat',
    fields: [standardSeats.propertyId],
    references: [properties.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'StandardSeatToTenant',
    fields: [standardSeats.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'StandardSeatTouser',
    fields: [standardSeats.userId],
    references: [users.id],
  }),
  vehicles: helpers.many(vehicles, { relationName: 'StandardSeatToVehicle' }),
}));
