import { relations } from 'drizzle-orm';
import { delegationActions } from './delegation-actions';
import { agentAccesses } from './agent-accesses';
import { users } from './users';

export const delegationActionsRelations = relations(delegationActions, helpers => ({
  delegation: helpers.one(agentAccesses, {
    relationName: 'AgentAccessToDelegationAction',
    fields: [delegationActions.delegationId],
    references: [agentAccesses.id],
  }),
  actor: helpers.one(users, {
    relationName: 'DelegationActionTouser',
    fields: [delegationActions.actorId],
    references: [users.id],
  }),
}));
