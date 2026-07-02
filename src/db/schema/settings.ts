import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const settings = pgTable('Setting', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  schemaVersion: integer('schemaVersion').default(1).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
