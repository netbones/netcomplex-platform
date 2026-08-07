import { relations } from 'drizzle-orm';
import { agentTokens } from './agent-tokens';
import { tenants } from './tenants';
import { agentAccesses } from './agent-accesses';
import { users } from './users';

export const agentTokensRelations = relations(agentTokens, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'AgentTokenToTenant',
    fields: [agentTokens.tenantId],
    references: [tenants.id],
  }),
  access: helpers.one(agentAccesses, {
    relationName: 'AgentAccessToAgentToken',
    fields: [agentTokens.accessId],
    references: [agentAccesses.id],
  }),
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
}));
