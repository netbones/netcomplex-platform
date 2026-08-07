import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { supportTargetEnum } from './support-target-enum';

export const supports = pgTable('Support', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  senderUserId: text('senderUserId').notNull(),
  recipientUserId: text('recipientUserId').notNull(),
  targetType: supportTargetEnum('targetType').notNull(),
  targetId: text('targetId').notNull(),
  chips: integer('chips').default(0).notNull(),
  message: text('message'),
  isAnonymous: boolean('isAnonymous').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
