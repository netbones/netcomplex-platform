import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const contentVersions = pgTable('ContentVersion', {
  id: text('id').primaryKey(),
  contentId: text('contentId').notNull(),
  version: integer('version').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  userId: text('userId'),
  changeSummary: text('changeSummary'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
