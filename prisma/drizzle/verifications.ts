import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId'),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
