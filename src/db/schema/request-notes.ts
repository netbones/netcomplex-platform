import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const requestNotes = pgTable('RequestNote', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull(),
  userId: text('userId').notNull(),
  content: text('content').notNull(),
  isInternal: boolean('isInternal').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
