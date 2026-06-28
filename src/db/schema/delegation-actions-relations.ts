import { relations } from 'drizzle-orm';
import { delegationActions } from './delegation-actions';
import { agentAccesses } from './agent-accesses';

export const delegationActionsRelations = relations(delegationActions, helpers => ({
  delegation: helpers.one(agentAccesses, {
    relationName: 'AgentAccessToDelegationAction',
    fields: [delegationActions.delegationId],
    references: [agentAccesses.id],
  }),
}));
