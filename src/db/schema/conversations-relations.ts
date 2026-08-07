import { relations } from 'drizzle-orm';
import { conversations } from './conversations';
import { tenants } from './tenants';
import { conversationParticipants } from './conversation-participants';
import { messages } from './messages';

export const conversationsRelations = relations(conversations, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'ConversationToTenant',
    fields: [conversations.tenantId],
    references: [tenants.id],
  }),
  ConversationParticipant: helpers.many(conversationParticipants, {
    relationName: 'ConversationToConversationParticipant',
  }),
  Message: helpers.many(messages, { relationName: 'ConversationToMessage' }),
}));
