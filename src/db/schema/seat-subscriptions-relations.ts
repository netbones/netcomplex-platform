import { relations } from 'drizzle-orm';
import { seatSubscriptions } from './seat-subscriptions';
import { tenants } from './tenants';
import { users } from './users';
import { soloSeats } from './solo-seats';
import { premiumSeats } from './premium-seats';
import { seatPlans } from './seat-plans';
import { paymentTransactions } from './payment-transactions';

export const seatSubscriptionsRelations = relations(seatSubscriptions, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'SeatSubscriptionToTenant',
    fields: [seatSubscriptions.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'SeatSubscriptionTouser',
    fields: [seatSubscriptions.userId],
    references: [users.id],
  }),
  soloSeat: helpers.one(soloSeats, {
    relationName: 'SeatSubscriptionToSoloSeat',
    fields: [seatSubscriptions.soloSeatId],
    references: [soloSeats.id],
  }),
  premiumSeat: helpers.one(premiumSeats, {
    relationName: 'PremiumSeatToSeatSubscription',
    fields: [seatSubscriptions.premiumSeatId],
    references: [premiumSeats.id],
  }),
  plan: helpers.one(seatPlans, {
    relationName: 'SeatPlanToSeatSubscription',
    fields: [seatSubscriptions.planId],
    references: [seatPlans.id],
  }),
  transactions: helpers.many(paymentTransactions, {
    relationName: 'PaymentTransactionToSeatSubscription',
  }),
}));
