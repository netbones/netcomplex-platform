import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const disputeMessages = pgTable('DisputeMessage', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  disputeId: text('disputeId').notNull(),
  senderId: text('senderId').notNull(),
  content: text('content').notNull(),
  isInternal: boolean('isInternal').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  editedAt: timestamp('editedAt', { mode: 'date', precision: 3 }),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
