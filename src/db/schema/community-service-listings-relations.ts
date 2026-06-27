import { relations } from 'drizzle-orm';
import { communityServiceListings } from './community-service-listings';
import { communityServiceInquiries } from './community-service-inquiries';
import { users } from './users';
import { communityServiceReviews } from './community-service-reviews';
import { serviceBookings } from './service-bookings';

export const communityServiceListingsRelations = relations(communityServiceListings, helpers => ({
  communityServiceInquiry: helpers.many(communityServiceInquiries, {
    relationName: 'CommunityServiceInquiryToCommunityServiceListing',
  }),
  user: helpers.one(users, {
    relationName: 'CommunityServiceListingTouser',
    fields: [communityServiceListings.providerId],
    references: [users.id],
  }),
  communityServiceReview: helpers.many(communityServiceReviews, {
    relationName: 'CommunityServiceListingToCommunityServiceReview',
  }),
  serviceBooking: helpers.many(serviceBookings, { relationName: 'ServiceBookingToListing' }),
}));
