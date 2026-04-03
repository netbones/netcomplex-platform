import { relations } from 'drizzle-orm';
import { premiumSeats } from './premium-seats';
import { users } from './users';
import { householdsTopremiumSeats } from './households-topremium-seats';

export const premiumSeatsRelations = relations(premiumSeats, (helpers) => ({ user: helpers.one(users, { relationName: 'premiumSeatTouser', fields: [ premiumSeats.userId ], references: [ users.id ] }), household: helpers.many(householdsTopremiumSeats) }));