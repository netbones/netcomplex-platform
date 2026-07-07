import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { seatStatusEnum } from './seat-status-enum';

export const premiumSeats = pgTable('PremiumSeat', {
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
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  messageRetentionDays: integer('messageRetentionDays').default(30).notNull(),
  tier: text('tier').default('core').notNull(),
  archivedAt: timestamp('archivedAt', { mode: 'date', precision: 3 }),
  status: seatStatusEnum('status').default('ACTIVE').notNull(),
  addressId: text('addressId'),
});
