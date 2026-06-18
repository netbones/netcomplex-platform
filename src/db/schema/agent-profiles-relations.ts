import { relations } from 'drizzle-orm';
import { agentProfiles } from './agent-profiles';
import { users } from './users';

export const agentProfilesRelations = relations(agentProfiles, helpers => ({
  user: helpers.one(users, {
    relationName: 'AgentProfileTouser',
    fields: [agentProfiles.agentId],
    references: [users.id],
  }),
}));
