import { relations } from 'drizzle-orm';
import { premiumSeats } from './premium-seats';
import { users } from './users';
import { propertiesTopremiumSeats } from './properties-topremium-seats';

export const premiumSeatsRelations = relations(premiumSeats, (helpers) => ({ user: helpers.one(users, { relationName: 'premiumSeatTouser', fields: [ premiumSeats.userId ], references: [ users.id ] }), properties: helpers.many(propertiesTopremiumSeats) }));