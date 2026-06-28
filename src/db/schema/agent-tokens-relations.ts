import { relations } from 'drizzle-orm';
import { agentTokens } from './agent-tokens';
import { users } from './users';
import { agentAccesses } from './agent-accesses';

export const agentTokensRelations = relations(agentTokens, helpers => ({
  agent: helpers.one(users, {
    relationName: 'agentToken_agentIdTouser',
    fields: [agentTokens.agentId],
    references: [users.id],
  }),
  issuedBy: helpers.one(users, {
    relationName: 'agentToken_issuedByIdTouser',
    fields: [agentTokens.issuedById],
    references: [users.id],
  }),
  access: helpers.one(agentAccesses, {
    relationName: 'AgentAccessToAgentToken',
    fields: [agentTokens.accessId],
    references: [agentAccesses.id],
  }),
}));
