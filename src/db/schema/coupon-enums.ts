import { pgEnum } from 'drizzle-orm/pg-core';

export const couponDiscountTypeEnum = pgEnum('CouponDiscountType', ['PERCENTAGE', 'FIXED']);
