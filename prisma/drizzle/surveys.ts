import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { surveyTypeEnum } from './survey-type-enum';
import { surveyStatusEnum } from './survey-status-enum';

export const surveys = pgTable('Survey', { id: text('id').primaryKey(), title: text('title').notNull(), description: text('description'), type: surveyTypeEnum('type').default('INTERNAL').notNull(), status: surveyStatusEnum('status').default('DRAFT').notNull(), startDate: timestamp('startDate', { mode: 'date', precision: 3 }), endDate: timestamp('endDate', { mode: 'date', precision: 3 }), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(), updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull() });