import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const providerLegalAgreements = pgTable('provider_legal_agreements', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  agreementType: text('agreement_type').notNull(),
  version: text('version').notNull(),
  acceptedAt: timestamp('accepted_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
