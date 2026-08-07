import { pgTable, text, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { aiUsageStatusEnum } from './ai-usage-status-enum';

export const tenantAiUsages = pgTable('TenantAiUsage', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  billingMonth: text('billingMonth').notNull(),
  tokensAllotted: integer('tokensAllotted').notNull(),
  tokensUsed: integer('tokensUsed').default(0).notNull(),
  overageTokens: integer('overageTokens').default(0).notNull(),
  overageCostZAR: decimal('overageCostZAR', { precision: 65, scale: 30 }).default('0').notNull(),
  status: aiUsageStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
