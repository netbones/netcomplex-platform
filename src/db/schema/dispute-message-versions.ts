import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const disputeMessageVersions = pgTable('DisputeMessageVersion', {
  id: text('id').primaryKey(),
  messageId: text('messageId').notNull(),
  originalContent: text('originalContent').notNull(),
  editedAt: timestamp('editedAt', { mode: 'date', precision: 3 }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
