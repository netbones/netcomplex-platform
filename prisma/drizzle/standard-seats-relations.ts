import { relations } from 'drizzle-orm';
import { standardSeats } from './standard-seats';
import { properties } from './properties';
import { users } from './users';

export const standardSeatsRelations = relations(standardSeats, helpers => ({
  property: helpers.one(properties, {
    relationName: 'PropertyTostandardSeat',
    fields: [standardSeats.propertyId],
    references: [properties.id],
  }),
  user: helpers.one(users, {
    relationName: 'standardSeatTouser',
    fields: [standardSeats.userId],
    references: [users.id],
  }),
}));
