import { relations } from 'drizzle-orm';
import { coupons } from './coupons';
import { tenants } from './tenants';
import { billingPlans } from './billing-plans';
import { couponRedemptions } from './coupon-redemptions';

export const couponsRelations = relations(coupons, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'CouponToTenant', fields: [ coupons.tenantId ], references: [ tenants.id ] }), plan: helpers.one(billingPlans, { relationName: 'BillingPlanToCoupon', fields: [ coupons.planId ], references: [ billingPlans.id ] }), redemptions: helpers.many(couponRedemptions, { relationName: 'CouponToCouponRedemption' }) }));