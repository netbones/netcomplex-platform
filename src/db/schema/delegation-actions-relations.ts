import { relations } from 'drizzle-orm';
import { delegationActions } from './delegation-actions';
import { users } from './users';
import { agentAccesses } from './agent-accesses';

export const delegationActionsRelations = relations(delegationActions, helpers => ({
  actor: helpers.one(users, {
    relationName: 'DelegationActionTouser',
    fields: [delegationActions.actorId],
    references: [users.id],
  }),
  delegation: helpers.one(agentAccesses, {
    relationName: 'AgentAccessToDelegationAction',
    fields: [delegationActions.delegationId],
    references: [agentAccesses.id],
  }),
}));
