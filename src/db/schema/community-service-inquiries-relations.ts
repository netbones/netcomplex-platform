import { relations } from 'drizzle-orm';
import { communityServiceInquiries } from './community-service-inquiries';
import { users } from './users';
import { communityServiceListings } from './community-service-listings';

export const communityServiceInquiriesRelations = relations(communityServiceInquiries, (helpers) => ({ user: helpers.one(users, { relationName: 'CommunityServiceInquiryTouser', fields: [ communityServiceInquiries.inquirerId ], references: [ users.id ] }), communityServiceListing: helpers.one(communityServiceListings, { relationName: 'CommunityServiceInquiryToCommunityServiceListing', fields: [ communityServiceInquiries.listingId ], references: [ communityServiceListings.id ] }) }));