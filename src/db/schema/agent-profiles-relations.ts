import { relations } from 'drizzle-orm';
import { agentProfiles } from './agent-profiles';
import { tenants } from './tenants';
import { users } from './users';
import { agentReviews } from './agent-reviews';

export const agentProfilesRelations = relations(agentProfiles, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'AgentProfileToTenant',
    fields: [agentProfiles.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'AgentProfileTouser',
    fields: [agentProfiles.agentId],
    references: [users.id],
  }),
  reviews: helpers.many(agentReviews, { relationName: 'AgentProfileToAgentReview' }),
}));
