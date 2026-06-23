import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { providerMeritTypeEnum } from './provider-merit-type-enum';

export const providerMerits = pgTable('ProviderMerit', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull(),
  tenantId: text('tenantId').notNull(),
  meritType: providerMeritTypeEnum('meritType').notNull(),
  points: integer('points').notNull(),
  description: text('description'),
  referenceId: text('referenceId'),
  evidenceUrl: text('evidenceUrl'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
