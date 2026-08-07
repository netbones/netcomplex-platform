import { relations } from 'drizzle-orm';
import { billingPlans } from './billing-plans';
import { tenants } from './tenants';
import { coupons } from './coupons';
import { tenantSubscriptions } from './tenant-subscriptions';

export const billingPlansRelations = relations(billingPlans, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'BillingPlanToTenant',
    fields: [billingPlans.tenantId],
    references: [tenants.id],
  }),
  coupons: helpers.many(coupons, { relationName: 'BillingPlanToCoupon' }),
  tenantSubscriptions: helpers.many(tenantSubscriptions, {
    relationName: 'BillingPlanToTenantSubscription',
  }),
}));
