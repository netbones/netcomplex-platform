import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const externalSurveys = pgTable('ExternalSurvey', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  externalId: text('externalId').notNull(),
  embedUrl: text('embedUrl').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
