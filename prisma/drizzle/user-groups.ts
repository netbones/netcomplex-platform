import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { groupRoleEnum } from './group-role-enum';

export const userGroups = pgTable('UserGroup', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), userId: text('userId').notNull(), groupId: text('groupId').notNull(), role: groupRoleEnum('role').default('MEMBER').notNull(), joinedAt: timestamp('joinedAt', { mode: 'date', precision: 3 }).defaultNow().notNull() });