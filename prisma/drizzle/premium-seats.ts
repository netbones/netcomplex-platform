import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const premiumSeats = pgTable('premiumSeat', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  portfolioName: text('portfolioName'),
  subscriptionTier: text('subscriptionTier').default('basic').notNull(),
  maxProperties: integer('maxProperties').default(5).notNull(),
  platformAddress: text('platformAddress').notNull(),
  organizationId: text('organizationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  messageRetentionDays: integer('messageRetentionDays').default(30).notNull(),
  tier: text('tier').default('foundation').notNull(),
});
