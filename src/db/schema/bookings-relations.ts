import { relations } from 'drizzle-orm';
import { bookings } from './bookings';
import { users } from './users';
import { properties } from './properties';

export const bookingsRelations = relations(bookings, helpers => ({
  user: helpers.one(users, {
    relationName: 'BookingTouser',
    fields: [bookings.userId],
    references: [users.id],
  }),
  property: helpers.one(properties, {
    relationName: 'BookingToProperty',
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
}));
