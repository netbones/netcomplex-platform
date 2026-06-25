import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { billingEventTypeEnum } from './billing-event-type-enum';

export const billingEvents = pgTable('BillingEvent', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  subscriptionId: text('subscriptionId'),
  planId: text('planId'),
  eventType: billingEventTypeEnum('eventType').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
