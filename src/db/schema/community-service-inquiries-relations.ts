import { relations } from 'drizzle-orm';
import { communityServiceInquiries } from './community-service-inquiries';
import { users } from './users';
import { communityServiceListings } from './community-service-listings';

export const communityServiceInquiriesRelations = relations(communityServiceInquiries, helpers => ({
  user: helpers.one(users, {
    relationName: 'communityServiceInquiryTouser',
    fields: [communityServiceInquiries.inquirerId],
    references: [users.id],
  }),
  communityServiceListing: helpers.one(communityServiceListings, {
    relationName: 'communityServiceInquiryTocommunityServiceListing',
    fields: [communityServiceInquiries.listingId],
    references: [communityServiceListings.id],
  }),
}));
