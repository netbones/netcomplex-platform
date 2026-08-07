import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const requestHistories = pgTable('RequestHistory', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull(),
  userId: text('userId').notNull(),
  field: text('field').notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  comment: text('comment'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
