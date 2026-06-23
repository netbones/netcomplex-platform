import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { providerVerificationStatusEnum } from './provider-verification-status-enum';

export const providerVerifications = pgTable('provider_verifications', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenantId').notNull(),
  status: providerVerificationStatusEnum('status').default('PENDING').notNull(),
  notes: text('notes'),
  dueDiligenceItems: jsonb('due_diligence_items')
    .$type<Array<{ key: string; status: string; notes?: string }>>()
    .default([]),
  startDate: timestamp('startDate', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }),
  verificationThreshold: integer('verification_threshold').default(300).notNull(),
  probationThreshold: integer('probation_threshold').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull(),
});
