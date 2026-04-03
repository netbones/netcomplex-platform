import { relations } from 'drizzle-orm';
import { householdsTopremiumSeats } from './households-topremium-seats';
import { households } from './households';
import { premiumSeats } from './premium-seats';

export const householdsTopremiumSeatsRelations = relations(householdsTopremiumSeats, helpers => ({
  household: helpers.one(households, {
    fields: [householdsTopremiumSeats.A],
    references: [households.id],
  }),
  premiumSeat: helpers.one(premiumSeats, {
    fields: [householdsTopremiumSeats.B],
    references: [premiumSeats.id],
  }),
}));
