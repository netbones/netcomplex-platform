import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const responses = pgTable('Response', {
  id: text('id').primaryKey(),
  surveyId: text('surveyId').notNull(),
  userId: text('userId'),
  answers: jsonb('answers').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
