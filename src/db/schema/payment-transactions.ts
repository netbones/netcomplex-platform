import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { transactionStatusEnum } from './transaction-status-enum';
import { paymentGatewayEnum } from './payment-gateway-enum';

export const paymentTransactions = pgTable('payment_transactions', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  amount: decimal('amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  platformFee: decimal('platform_fee', { precision: 65, scale: 30 }).notNull(),
  processorFee: decimal('processor_fee', { precision: 65, scale: 30 }).notNull(),
  netAmount: decimal('net_amount', { precision: 65, scale: 30 }).notNull(),
  status: transactionStatusEnum('status').default('PENDING').notNull(),
  gateway: paymentGatewayEnum('gateway').notNull(),
  externalRef: text('external_ref进项'),
  invoiceUrl: text('invoice_url'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
