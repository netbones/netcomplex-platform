import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { providerDueDiligenceStatusEnum } from './provider-due-diligence-status-enum';

export const providerDueDiligenceWorkflows = pgTable('ProviderDueDiligenceWorkflow', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull(),
  tenantId: text('tenantId').notNull(),
  status: providerDueDiligenceStatusEnum('status').default('PENDING_REVIEW').notNull(),
  assignedTo: text('assignedTo'),
  submittedAt: timestamp('submittedAt', { mode: 'date', precision: 3 }),
  startedAt: timestamp('startedAt', { mode: 'date', precision: 3 }),
  completedAt: timestamp('completedAt', { mode: 'date', precision: 3 }),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
