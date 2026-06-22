import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { providerChargeStatusEnum } from './provider-charge-status-enum';
import { paymentGatewayEnum } from './payment-gateway-enum';

export const providerCharges = pgTable('provider_charges', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  transactionId: text('transaction_id'),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  status: providerChargeStatusEnum('status').default('PENDING').notNull(),
  gateway: paymentGatewayEnum('gateway'),
  externalRef: text('external_ref'),
  dueDate: timestamp('due_date', { mode: 'date', precision: 3 }).notNull(),
  paidAt: timestamp('paid_at', { mode: 'date', precision: 3 }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull(),
});
