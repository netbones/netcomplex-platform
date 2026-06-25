import { relations } from 'drizzle-orm';
import { couponRedemptions } from './coupon-redemptions';
import { coupons } from './coupons';

export const couponRedemptionsRelations = relations(couponRedemptions, helpers => ({
  coupon: helpers.one(coupons, {
    relationName: 'CouponToCouponRedemption',
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
}));
