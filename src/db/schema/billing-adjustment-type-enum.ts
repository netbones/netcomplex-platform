import { pgEnum } from 'drizzle-orm/pg-core';

export const billingAdjustmentTypeEnum = pgEnum('BillingAdjustmentType', ['CREDIT', 'DEBIT', 'DISCOUNT']);