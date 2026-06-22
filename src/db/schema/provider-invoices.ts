import { pgTable, text, decimal, timestamp, jsonb } from 'drizzle-orm/pg-core';

import { invoiceStatusEnum } from './invoice-status-enum';

export const providerInvoices = pgTable('provider_invoices', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  transactionId: text('transaction_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  items: jsonb('items').notNull(),
  total: decimal('total', { precision: 65, scale: 30 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 65, scale: 30 }).notNull(),
  processorFee: decimal('processor_fee', { precision: 65, scale: 30 }).notNull(),
  netAmount: decimal('net_amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  status: invoiceStatusEnum('status').default('PENDING').notNull(),
  paidAt: timestamp('paid_at', { mode: 'date', precision: 3 }),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull(),
});
