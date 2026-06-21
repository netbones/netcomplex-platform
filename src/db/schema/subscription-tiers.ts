import { pgTable, text, decimal, integer, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

export const subscriptionTiers = pgTable('subscription_tiers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  maxListings: integer('max_listings'),
  features: jsonb('features'),
  platformFeePercent: decimal('platform_fee_percent', { precision: 65, scale: 30 })
    .default('8')
    .notNull(),
  verificationRequired: boolean('verification_required').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
