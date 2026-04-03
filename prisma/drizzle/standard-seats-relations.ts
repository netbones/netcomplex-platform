import { relations } from 'drizzle-orm';
import { standardSeats } from './standard-seats';
import { households } from './households';
import { users } from './users';

export const standardSeatsRelations = relations(standardSeats, helpers => ({
  household: helpers.one(households, {
    relationName: 'householdTostandardSeat',
    fields: [standardSeats.householdId],
    references: [households.id],
  }),
  user: helpers.one(users, {
    relationName: 'standardSeatTouser',
    fields: [standardSeats.userId],
    references: [users.id],
  }),
}));
