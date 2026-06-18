import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const members = pgTable('member', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  organizationId: text('organizationId').notNull(),
  userId: text('userId').notNull(),
  role: text('role').default('member').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
