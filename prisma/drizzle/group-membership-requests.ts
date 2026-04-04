import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { membershipStatusEnum } from './membership-status-enum';

export const groupMembershipRequests = pgTable('GroupMembershipRequest', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  groupId: text('groupId').notNull(),
  status: membershipStatusEnum('status').default('PENDING').notNull(),
  message: text('message'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
