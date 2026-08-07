import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { groupRoleEnum } from './group-role-enum';

export const groupMembers = pgTable('GroupMember', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  groupId: text('groupId').notNull(),
  role: groupRoleEnum('role').default('MEMBER').notNull(),
  joinedAt: timestamp('joinedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
