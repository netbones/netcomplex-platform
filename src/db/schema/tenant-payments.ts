import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { transactionStatusEnum } from './transaction-status-enum';
import { paymentGatewayEnum } from './payment-gateway-enum';

export const tenantPayments = pgTable('TenantPayment', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  subscriptionId: text('subscriptionId').notNull(),
  amount: decimal('amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  platformFee: decimal('platformFee', { precision: 65, scale: 30 }).default('0').notNull(),
  processorFee: decimal('processorFee', { precision: 65, scale: 30 }).default('0').notNull(),
  netAmount: decimal('netAmount', { precision: 65, scale: 30 }).default('0').notNull(),
  status: transactionStatusEnum('status').default('PENDING').notNull(),
  gateway: paymentGatewayEnum('gateway').notNull(),
  externalRef: text('externalRef'),
  invoiceUrl: text('invoiceUrl'),
  couponId: text('couponId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
