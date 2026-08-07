import { pgTable, text, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';

export const dataRevenueStreams = pgTable('DataRevenueStream', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  residentSharePct: decimal('residentSharePct', { precision: 65, scale: 30 }).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
