import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const providerDueDiligenceEvents = pgTable('ProviderDueDiligenceEvent', {
  id: text('id').primaryKey(),
  workflowId: text('workflowId').notNull(),
  action: text('action').notNull(),
  actorId: text('actorId').notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
