import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const requestNotes = pgTable('RequestNote', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  requestId: text('requestId').notNull(),
  userId: text('userId').notNull(),
  content: text('content').notNull(),
  isInternal: boolean('isInternal').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});

export const requestHistories = pgTable('RequestHistory', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  requestId: text('requestId').notNull(),
  userId: text('userId').notNull(),
  field: text('field').notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  comment: text('comment'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
