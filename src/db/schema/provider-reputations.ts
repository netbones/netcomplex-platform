import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const providerReputations = pgTable('ProviderReputation', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull(),
  tenantId: text('tenantId').notNull(),
  totalScore: integer('totalScore').default(0).notNull(),
  responseTimeScore: integer('responseTimeScore'),
  qualityScore: integer('qualityScore'),
  reviewScore: integer('reviewScore'),
  complianceScore: integer('complianceScore'),
  engagementScore: integer('engagementScore'),
  lastCalculatedAt: timestamp('lastCalculatedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
