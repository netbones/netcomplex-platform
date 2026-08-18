import { relations } from 'drizzle-orm';
import { seatPlans } from './seat-plans';
import { tenants } from './tenants';
import { seatSubscriptions } from './seat-subscriptions';

export const seatPlansRelations = relations(seatPlans, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'SeatPlanToTenant',
    fields: [seatPlans.tenantId],
    references: [tenants.id],
  }),
  subscriptions: helpers.many(seatSubscriptions, {
    relationName: 'SeatPlanToSeatSubscription',
  }),
}));
