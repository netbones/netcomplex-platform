import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const bursaryFields = pgTable('BursaryField', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  value: text('value').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
