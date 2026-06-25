import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { payoutStatusEnum } from './payout-status-enum';

export const payoutRequests = pgTable('PayoutRequest', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  walletId: text('walletId').notNull(),
  userId: text('userId').notNull(),
  amount: decimal('amount', { precision: 65, scale: 30 }).notNull(),
  currency: text('currency').default('ZAR').notNull(),
  status: payoutStatusEnum('status').default('PENDING').notNull(),
  method: text('method'),
  bankReference: text('bankReference'),
  processedAt: timestamp('processedAt', { mode: 'date', precision: 3 }),
  processedBy: text('processedBy'),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
