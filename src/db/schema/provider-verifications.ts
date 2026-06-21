import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { providerVerificationStatusEnum } from './provider-verification-status-enum';

export const providerVerifications = pgTable('provider_verifications', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull(),
  tenantId: text('tenantId').notNull(),
  status: providerVerificationStatusEnum('status').default('PENDING').notNull(),
  notes: text('notes'),
  startDate: timestamp('startDate', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }),
  verificationThreshold: integer('verification_threshold').default(300).notNull(),
  probationThreshold: integer('probation_threshold').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull(),
});
