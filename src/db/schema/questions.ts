import { pgTable, text, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { questionTypeEnum } from './question-type-enum';

export const questions = pgTable('Question', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  surveyId: text('surveyId').notNull(),
  sectionId: text('sectionId'),
  text: text('text').notNull(),
  type: questionTypeEnum('type').notNull(),
  options: text('options').array().notNull(),
  required: boolean('required').default(false).notNull(),
  order: integer('order').default(0).notNull(),
  config: jsonb('config').default({}).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
