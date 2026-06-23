import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { providerMeritTypeEnum } from './provider-merit-type-enum';

export const providerMerits = pgTable('provider_merits', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  meritType: providerMeritTypeEnum('merit_type').notNull(),
  points: integer('points').notNull(),
  description: text('description'),
  referenceId: text('reference_id'),
  evidenceUrl: text('evidence_url'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
