import { relations } from 'drizzle-orm';
import { bookings } from './bookings';
import { users } from './users';

export const bookingsRelations = relations(bookings, (helpers) => ({ user: helpers.one(users, { relationName: 'BookingTouser', fields: [ bookings.userId ], references: [ users.id ] }) }));