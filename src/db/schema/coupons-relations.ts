import { relations } from 'drizzle-orm';
import { coupons } from './coupons';
import { billingPlans } from './billing-plans';
import { couponRedemptions } from './coupon-redemptions';

export const couponsRelations = relations(coupons, helpers => ({
  plan: helpers.one(billingPlans, {
    relationName: 'BillingPlanToCoupon',
    fields: [coupons.planId],
    references: [billingPlans.id],
  }),
  redemptions: helpers.many(couponRedemptions, { relationName: 'CouponToCouponRedemption' }),
}));
