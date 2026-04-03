import { relations } from 'drizzle-orm';
import { conversationParticipants } from './conversation-participants';
import { conversations } from './conversations';
import { users } from './users';

export const conversationParticipantsRelations = relations(conversationParticipants, helpers => ({
  Conversation: helpers.one(conversations, {
    relationName: 'ConversationToConversationParticipant',
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: helpers.one(users, {
    relationName: 'ConversationParticipantTouser',
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));
