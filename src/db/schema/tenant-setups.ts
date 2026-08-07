import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const tenantSetups = pgTable('TenantSetup', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  completionPercent: integer('completionPercent').default(0).notNull(),
  completedSections: text('completedSections').array().default([]).notNull(),
  launchedAt: timestamp('launchedAt', { mode: 'date', precision: 3 }),
  lastViewedAt: timestamp('lastViewedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
