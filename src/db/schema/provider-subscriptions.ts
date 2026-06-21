import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { subscriptionStatusEnum } from './subscription-status-enum';
import { paymentGatewayEnum } from './payment-gateway-enum';

export const providerSubscriptions = pgTable('provider_subscriptions', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  tierId: text('tier_id').notNull(),
  status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
  startDate: timestamp('start_date', { mode: 'date', precision: 3 }).notNull(),
  endDate: timestamp('end_date', { mode: 'date', precision: 3 }),
  nextBillingDate: timestamp('next_billing_date', { mode: 'date', precision: 3 }),
  price: decimal('price', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  paymentGateway: paymentGatewayEnum('payment_gateway'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull(),
});
