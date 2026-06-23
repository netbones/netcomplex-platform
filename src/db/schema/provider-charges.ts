import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { providerChargeStatusEnum } from './provider-charge-status-enum';
import { paymentGatewayEnum } from './payment-gateway-enum';

export const providerCharges = pgTable('ProviderCharge', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull(),
  tenantId: text('tenantId').notNull(),
  subscriptionId: text('subscriptionId').notNull(),
  transactionId: text('transactionId'),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  status: providerChargeStatusEnum('status').default('PENDING').notNull(),
  gateway: paymentGatewayEnum('gateway'),
  externalRef: text('externalRef'),
  dueDate: timestamp('dueDate', { mode: 'date', precision: 3 }).notNull(),
  paidAt: timestamp('paidAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
