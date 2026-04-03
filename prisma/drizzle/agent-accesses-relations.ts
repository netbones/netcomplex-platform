import { relations } from 'drizzle-orm';
import { agentAccesses } from './agent-accesses';
import { users } from './users';
import { households } from './households';

export const agentAccessesRelations = relations(agentAccesses, (helpers) => ({ user_agentAccess_agentIdTouser: helpers.one(users, { relationName: 'agentAccess_agentIdTouser', fields: [ agentAccesses.agentId ], references: [ users.id ] }), user_agentAccess_grantedByIdTouser: helpers.one(users, { relationName: 'agentAccess_grantedByIdTouser', fields: [ agentAccesses.grantedById ], references: [ users.id ] }), household: helpers.one(households, { relationName: 'agentAccessTohousehold', fields: [ agentAccesses.householdId ], references: [ households.id ] }) }));