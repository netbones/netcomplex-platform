import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { subscriptionStatusEnum } from './subscription-status-enum';
import { paymentGatewayEnum } from './payment-gateway-enum';

export const providerSubscriptions = pgTable('ProviderSubscription', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull(),
  tenantId: text('tenantId').notNull(),
  tierId: text('tierId').notNull(),
  status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
  startDate: timestamp('startDate', { mode: 'date', precision: 3 }).notNull(),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }),
  nextBillingDate: timestamp('nextBillingDate', { mode: 'date', precision: 3 }),
  price: decimal('price', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  paymentGateway: paymentGatewayEnum('paymentGateway'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
