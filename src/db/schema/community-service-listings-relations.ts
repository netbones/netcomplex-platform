import { relations } from 'drizzle-orm';
import { communityServiceListings } from './community-service-listings';
import { communityServiceInquiries } from './community-service-inquiries';
import { users } from './users';
import { communityServiceReviews } from './community-service-reviews';

export const communityServiceListingsRelations = relations(communityServiceListings, helpers => ({
  communityServiceInquiry: helpers.many(communityServiceInquiries, {
    relationName: 'communityServiceInquiryTocommunityServiceListing',
  }),
  user: helpers.one(users, {
    relationName: 'communityServiceListingTouser',
    fields: [communityServiceListings.providerId],
    references: [users.id],
  }),
  communityServiceReview: helpers.many(communityServiceReviews, {
    relationName: 'communityServiceListingTocommunityServiceReview',
  }),
}));
