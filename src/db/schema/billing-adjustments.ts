import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { billingAdjustmentTypeEnum } from './billing-adjustment-type-enum';

export const billingAdjustments = pgTable('BillingAdjustment', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  subscriptionId: text('subscriptionId'),
  invoiceId: text('invoiceId'),
  type: billingAdjustmentTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  reason: text('reason'),
  appliedAt: timestamp('appliedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
