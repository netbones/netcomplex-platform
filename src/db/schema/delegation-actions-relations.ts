import { relations } from 'drizzle-orm';
import { delegationActions } from './delegation-actions';
import { tenants } from './tenants';
import { users } from './users';
import { agentAccesses } from './agent-accesses';

export const delegationActionsRelations = relations(delegationActions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'DelegationActionToTenant', fields: [ delegationActions.tenantId ], references: [ tenants.id ] }), actor: helpers.one(users, { relationName: 'DelegationActionTouser', fields: [ delegationActions.actorId ], references: [ users.id ] }), delegation: helpers.one(agentAccesses, { relationName: 'AgentAccessToDelegationAction', fields: [ delegationActions.delegationId ], references: [ agentAccesses.id ] }) }));