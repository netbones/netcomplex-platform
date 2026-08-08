import { relations } from 'drizzle-orm';
import { agentReviews } from './agent-reviews';
import { tenants } from './tenants';
import { agentProfiles } from './agent-profiles';
import { users } from './users';

export const agentReviewsRelations = relations(agentReviews, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'AgentReviewToTenant',
    fields: [agentReviews.tenantId],
    references: [tenants.id],
  }),
  agentProfile: helpers.one(agentProfiles, {
    relationName: 'AgentProfileToAgentReview',
    fields: [agentReviews.agentProfileId],
    references: [agentProfiles.id],
  }),
  reviewer: helpers.one(users, {
    relationName: 'AgentReview_reviewerToUser',
    fields: [agentReviews.reviewerId],
    references: [users.id],
  }),
}));
