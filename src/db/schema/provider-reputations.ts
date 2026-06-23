import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const providerReputations = pgTable('provider_reputation', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  totalScore: integer('total_score').default(0).notNull(),
  responseTimeScore: integer('response_time_score'),
  qualityScore: integer('quality_score'),
  reviewScore: integer('review_score'),
  complianceScore: integer('compliance_score'),
  engagementScore: integer('engagement_score'),
  lastCalculatedAt: timestamp('last_calculated_at', { mode: 'date', precision: 3 }),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).notNull(),
});
