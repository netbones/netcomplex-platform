import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const assistSessions = pgTable('AssistSession', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  staffId: text('staffId').notNull(),
  scope: text('scope').default('metadata').notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  revokedAt: timestamp('revokedAt', { mode: 'date', precision: 3 }),
  revokedBy: text('revokedBy'),
  notes: text('notes'),
});
