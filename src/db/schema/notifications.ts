import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

// FUTURE: add requiresAck Boolean @default(false) and ackedAt DateTime? for governance notice acknowledgement (R4/R6)

export const notifications = pgTable('Notification', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
