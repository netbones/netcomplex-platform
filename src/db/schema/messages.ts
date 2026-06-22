import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { messageTypeEnum } from './message-type-enum';

export const messages = pgTable('Message', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  conversationId: text('conversationId').notNull(),
  senderId: text('senderId').notNull(),
  content: text('content').notNull(),
  type: messageTypeEnum('type').default('TEXT').notNull(),
  messageVersion: integer('messageVersion').default(1).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  mediaUrl: text('mediaUrl'),
});
