import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { bursaryStatusEnum } from './bursary-status-enum';

export const bursaries = pgTable('Bursary', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  title: text('title').notNull(),
  funder: text('funder').notNull(),
  fieldId: text('fieldId').notNull(),
  amount: text('amount').notNull(),
  description: text('description').notNull(),
  applyUrl: text('applyUrl'),
  deadline: timestamp('deadline', { mode: 'date', precision: 3 }).notNull(),
  status: bursaryStatusEnum('status').default('DRAFT').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
