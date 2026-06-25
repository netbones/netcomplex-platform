import { pgEnum } from 'drizzle-orm/pg-core';

export const billingPlanIntervalEnum = pgEnum('BillingPlanInterval', ['MONTHLY', 'ANNUAL']);
export const tenantSubscriptionStatusEnum = pgEnum('TenantSubscriptionStatus', [
  'ACTIVE',
  'PENDING',
  'CANCELLED',
  'EXPIRED',
  'TRIALING',
  'PAST_DUE',
]);
