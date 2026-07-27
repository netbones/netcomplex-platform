import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const identities = pgTable('identities', {
  id: text('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
