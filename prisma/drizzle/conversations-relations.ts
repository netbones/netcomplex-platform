import { relations } from 'drizzle-orm';
import { conversations } from './conversations';
import { conversationParticipants } from './conversation-participants';
import { messages } from './messages';

export const conversationsRelations = relations(conversations, helpers => ({
  ConversationParticipant: helpers.many(conversationParticipants, {
    relationName: 'ConversationToConversationParticipant',
  }),
  Message: helpers.many(messages, { relationName: 'ConversationToMessage' }),
}));
