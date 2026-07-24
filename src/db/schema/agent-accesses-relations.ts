import { relations } from 'drizzle-orm';
import { agentAccesses } from './agent-accesses';
import { tenants } from './tenants';
import { users } from './users';
import { properties } from './properties';
import { agentTokens } from './agent-tokens';
import { delegationActions } from './delegation-actions';

export const agentAccessesRelations = relations(agentAccesses, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'AgentAccessToTenant', fields: [ agentAccesses.tenantId ], references: [ tenants.id ] }), user_agentAccess_agentIdTouser: helpers.one(users, { relationName: 'agentAccess_agentIdTouser', fields: [ agentAccesses.agentId ], references: [ users.id ] }), user_agentAccess_grantedByIdTouser: helpers.one(users, { relationName: 'agentAccess_grantedByIdTouser', fields: [ agentAccesses.grantedById ], references: [ users.id ] }), property: helpers.one(properties, { relationName: 'AgentAccessToProperty', fields: [ agentAccesses.propertyId ], references: [ properties.id ] }), agentTokens: helpers.many(agentTokens, { relationName: 'AgentAccessToAgentToken' }), delegationActions: helpers.many(delegationActions, { relationName: 'AgentAccessToDelegationAction' }) }));