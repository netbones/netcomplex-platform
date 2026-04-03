import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const conversationParticipants = pgTable('ConversationParticipant', {
  id: text('id').primaryKey(),
  conversationId: text('conversationId').notNull(),
  userId: text('userId').notNull(),
  joinedAt: timestamp('joinedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  lastReadAt: timestamp('lastReadAt', { mode: 'date', precision: 3 }),
  lastReadMessageId: text('lastReadMessageId'),
});
