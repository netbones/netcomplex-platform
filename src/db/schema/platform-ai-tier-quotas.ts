import { pgTable, text, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { tierEnum } from './tier-enum';
import { aiOveragePolicyEnum } from './ai-overage-policy-enum';

export const platformAiTierQuotas = pgTable('PlatformAiTierQuota', {
  id: text('id').primaryKey(),
  tier: tierEnum('tier').notNull(),
  monthlyTokens: integer('monthlyTokens').notNull(),
  overagePolicy: aiOveragePolicyEnum('overagePolicy').default('HARD_STOP').notNull(),
  overageTokens: integer('overageTokens').default(0).notNull(),
  overagePriceZAR: decimal('overagePriceZAR', { precision: 65, scale: 30 }).default('0').notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  updatedById: text('updatedById'),
});
