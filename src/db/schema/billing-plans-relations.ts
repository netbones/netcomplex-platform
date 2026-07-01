import { relations } from 'drizzle-orm';
import { billingPlans } from './billing-plans';
import { tenantSubscriptions } from './tenant-subscriptions';
import { coupons } from './coupons';

export const billingPlansRelations = relations(billingPlans, (helpers) => ({ tenantSubscriptions: helpers.many(tenantSubscriptions, { relationName: 'BillingPlanToTenantSubscription' }), coupons: helpers.many(coupons, { relationName: 'BillingPlanToCoupon' }) }));