import { relations } from 'drizzle-orm';
import { communityServiceReviews } from './community-service-reviews';
import { tenants } from './tenants';
import { communityServiceListings } from './community-service-listings';
import { users } from './users';

export const communityServiceReviewsRelations = relations(communityServiceReviews, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'CommunityServiceReviewToTenant',
    fields: [communityServiceReviews.tenantId],
    references: [tenants.id],
  }),
  communityServiceListing: helpers.one(communityServiceListings, {
    relationName: 'CommunityServiceListingToCommunityServiceReview',
    fields: [communityServiceReviews.listingId],
    references: [communityServiceListings.id],
  }),
  user: helpers.one(users, {
    relationName: 'CommunityServiceReviewTouser',
    fields: [communityServiceReviews.reviewerId],
    references: [users.id],
  }),
}));
