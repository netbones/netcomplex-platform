import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { walletStatusEnum } from './wallet-status-enum';

export const dWallets = pgTable('DWallet', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  balance: decimal('balance', { precision: 65, scale: 30 }).default('0').notNull(),
  currency: text('currency').default('ZAR').notNull(),
  lifetimeEarned: decimal('lifetimeEarned', { precision: 65, scale: 30 }).default('0').notNull(),
  lifetimePaid: decimal('lifetimePaid', { precision: 65, scale: 30 }).default('0').notNull(),
  status: walletStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
