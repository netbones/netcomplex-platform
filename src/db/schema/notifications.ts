import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { notificationTypeEnum } from './notification-type-enum';

export const notifications = pgTable('Notification', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  senderId: text('senderId'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').default('info').notNull(),
  category: text('category'),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  readAt: timestamp('readAt', { mode: 'date', precision: 3 }),
  deliveryStatus: text('deliveryStatus').default('PENDING').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
