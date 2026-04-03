import { relations } from 'drizzle-orm';
import { messages } from './messages';
import { conversations } from './conversations';
import { users } from './users';

export const messagesRelations = relations(messages, helpers => ({
  Conversation: helpers.one(conversations, {
    relationName: 'ConversationToMessage',
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  user: helpers.one(users, {
    relationName: 'MessageTouser',
    fields: [messages.senderId],
    references: [users.id],
  }),
}));
