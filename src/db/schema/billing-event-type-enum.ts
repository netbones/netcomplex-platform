import { pgEnum } from 'drizzle-orm/pg-core';

export const billingEventTypeEnum = pgEnum('BillingEventType', ['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_RENEWED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PLAN_UPGRADED', 'PLAN_DOWNGRADED', 'AI_OVERAGE_CHARGED']);