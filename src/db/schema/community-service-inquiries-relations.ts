import { relations } from 'drizzle-orm';
import { communityServiceInquiries } from './community-service-inquiries';
import { tenants } from './tenants';
import { users } from './users';
import { communityServiceListings } from './community-service-listings';

export const communityServiceInquiriesRelations = relations(communityServiceInquiries, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'CommunityServiceInquiryToTenant',
    fields: [communityServiceInquiries.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'CommunityServiceInquiryTouser',
    fields: [communityServiceInquiries.inquirerId],
    references: [users.id],
  }),
  communityServiceListing: helpers.one(communityServiceListings, {
    relationName: 'CommunityServiceInquiryToCommunityServiceListing',
    fields: [communityServiceInquiries.listingId],
    references: [communityServiceListings.id],
  }),
}));
