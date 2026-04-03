import { pgTable, text, boolean, integer } from 'drizzle-orm/pg-core';
import { questionTypeEnum } from './question-type-enum';

export const questions = pgTable('Question', {
  id: text('id').primaryKey(),
  surveyId: text('surveyId').notNull(),
  text: text('text').notNull(),
  type: questionTypeEnum('type').notNull(),
  options: text('options').array().notNull(),
  required: boolean('required').default(false).notNull(),
  order: integer('order').default(0).notNull(),
});
