import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { residentFilterEnum } from './resident-filter-enum';
import { roleEnum } from './role-enum';

export const announcements = pgTable('Announcement', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  author: text('author').notNull(),
  priority: text('priority').default('normal').notNull(),
  targetFilter: residentFilterEnum('targetFilter').default('ALL').notNull(),
  targetRoles: roleEnum('targetRoles').array().notNull(),
  resourceId: text('resourceId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }),
});
