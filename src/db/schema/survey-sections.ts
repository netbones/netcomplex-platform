import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const surveySections = pgTable('SurveySection', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  surveyId: text('surveyId').notNull(),
  title: text('title'),
  description: text('description'),
  image: text('image'),
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
