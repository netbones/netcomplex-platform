import { relations } from 'drizzle-orm';
import { soloSeats } from './solo-seats';
import { properties } from './properties';
import { users } from './users';

export const soloSeatsRelations = relations(soloSeats, helpers => ({
  property: helpers.one(properties, {
    relationName: 'PropertyToSoloSeat',
    fields: [soloSeats.propertyId],
    references: [properties.id],
  }),
  user: helpers.one(users, {
    relationName: 'SoloSeatTouser',
    fields: [soloSeats.userId],
    references: [users.id],
  }),
}));
