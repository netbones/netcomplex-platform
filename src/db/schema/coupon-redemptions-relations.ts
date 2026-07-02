import { relations } from 'drizzle-orm';
import { couponRedemptions } from './coupon-redemptions';
import { tenants } from './tenants';
import { coupons } from './coupons';

export const couponRedemptionsRelations = relations(couponRedemptions, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'CouponRedemptionToTenant',
    fields: [couponRedemptions.tenantId],
    references: [tenants.id],
  }),
  coupon: helpers.one(coupons, {
    relationName: 'CouponToCouponRedemption',
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
}));
