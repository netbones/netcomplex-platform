import { pgEnum } from 'drizzle-orm/pg-core';

export const billingPlanIntervalEnum = pgEnum('BillingPlanInterval', ['MONTHLY', 'ANNUAL']);