import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';

export const revenueRecords = pgTable('revenue_records', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  providerId: text('provider_id').notNull(),
  transactionId: text('transaction_id').notNull(),
  grossAmount: decimal('gross_amount', { precision: 65, scale: 30 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 65, scale: 30 }).notNull(),
  processorFee: decimal('processor_fee', { precision: 65, scale: 30 }).notNull(),
  netAmount: decimal('net_amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  period: text('period').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
