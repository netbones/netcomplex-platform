import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const tenantFeatureFlags = pgTable('TenantFeatureFlag', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  featureKey: text('featureKey').notNull(),
  enabled: boolean('enabled').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }),
});
