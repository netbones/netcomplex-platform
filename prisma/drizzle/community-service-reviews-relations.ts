import { relations } from 'drizzle-orm';
import { communityServiceReviews } from './community-service-reviews';
import { communityServiceListings } from './community-service-listings';
import { users } from './users';

export const communityServiceReviewsRelations = relations(communityServiceReviews, (helpers) => ({ communityServiceListing: helpers.one(communityServiceListings, { relationName: 'communityServiceListingTocommunityServiceReview', fields: [ communityServiceReviews.listingId ], references: [ communityServiceListings.id ] }), user: helpers.one(users, { relationName: 'communityServiceReviewTouser', fields: [ communityServiceReviews.reviewerId ], references: [ users.id ] }) }));