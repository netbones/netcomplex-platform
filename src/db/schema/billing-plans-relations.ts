import { relations } from 'drizzle-orm';
import { billingPlans } from './billing-plans';
import { coupons } from './coupons';
import { tenantSubscriptions } from './tenant-subscriptions';

export const billingPlansRelations = relations(billingPlans, helpers => ({
  coupons: helpers.many(coupons, { relationName: 'BillingPlanToCoupon' }),
  tenantSubscriptions: helpers.many(tenantSubscriptions, {
    relationName: 'BillingPlanToTenantSubscription',
  }),
}));
