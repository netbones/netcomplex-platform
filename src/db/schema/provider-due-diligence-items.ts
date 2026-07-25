import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { dueDiligenceItemStatusEnum } from './due-diligence-item-status-enum';

export const providerDueDiligenceItems = pgTable('ProviderDueDiligenceItem', {
  id: text('id').primaryKey(),
  workflowId: text('workflowId').notNull(),
  itemKey: text('itemKey').notNull(),
  status: dueDiligenceItemStatusEnum('status').default('PENDING').notNull(),
  notes: text('notes'),
  reviewedBy: text('reviewedBy'),
  reviewedAt: timestamp('reviewedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
