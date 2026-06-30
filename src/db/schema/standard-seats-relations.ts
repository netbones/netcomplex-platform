import { relations } from 'drizzle-orm';
import { standardSeats } from './standard-seats';
import { addresses } from './addresses';
import { properties } from './properties';
import { users } from './users';

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
  user: helpers.one(users, {
    relationName: 'StandardSeatTouser',
    fields: [standardSeats.userId],
    references: [users.id],
  }),
}));
