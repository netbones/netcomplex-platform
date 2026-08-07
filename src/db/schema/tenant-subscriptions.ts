import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenantSubscriptionStatusEnum } from './tenant-subscription-status-enum';

export const tenantSubscriptions = pgTable('TenantSubscription', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  planId: text('planId').notNull(),
  status: tenantSubscriptionStatusEnum('status').default('PENDING').notNull(),
  startDate: timestamp('startDate', { mode: 'date', precision: 3 }),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }),
  nextBillingDate: timestamp('nextBillingDate', { mode: 'date', precision: 3 }),
  trialEndsAt: timestamp('trialEndsAt', { mode: 'date', precision: 3 }),
  convertedAt: timestamp('convertedAt', { mode: 'date', precision: 3 }),
  conversionSource: text('conversionSource'),
  cancelledAt: timestamp('cancelledAt', { mode: 'date', precision: 3 }),
  cancelReason: text('cancelReason'),
  tierManualOverride: boolean('tierManualOverride').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
