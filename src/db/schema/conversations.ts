import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { conversationTypeEnum } from './conversation-type-enum';

export const conversations = pgTable('Conversation', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  name: text('name'),
  type: conversationTypeEnum('type').default('DIRECT').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  capabilities: jsonb('capabilities'),
});
