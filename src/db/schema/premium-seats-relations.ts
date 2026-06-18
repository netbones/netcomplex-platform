import { relations } from 'drizzle-orm';
import { premiumSeats } from './premium-seats';
import { users } from './users';
import { propertyPremiumSeats } from './property-premium-seats';

export const premiumSeatsRelations = relations(premiumSeats, helpers => ({
  user: helpers.one(users, {
    relationName: 'PremiumSeatTouser',
    fields: [premiumSeats.userId],
    references: [users.id],
  }),
  propertyPremiumSeats: helpers.many(propertyPremiumSeats, {
    relationName: 'PremiumSeatToPropertyPremiumSeat',
  }),
}));
