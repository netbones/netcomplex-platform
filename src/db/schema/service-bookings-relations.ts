import { relations } from 'drizzle-orm';
import { serviceBookings } from './service-bookings';
import { communityServiceListings } from './community-service-listings';
import { serviceProviders } from './service-providers';
import { tenants } from './tenants';
import { users } from './users';

export const serviceBookingsRelations = relations(serviceBookings, (helpers) => ({ listing: helpers.one(communityServiceListings, { relationName: 'ServiceBookingToListing', fields: [ serviceBookings.listingId ], references: [ communityServiceListings.id ] }), provider: helpers.one(serviceProviders, { relationName: 'ServiceBookingToProvider', fields: [ serviceBookings.providerId ], references: [ serviceProviders.id ] }), Tenant: helpers.one(tenants, { relationName: 'ServiceBookingToTenant', fields: [ serviceBookings.tenantId ], references: [ tenants.id ] }), user: helpers.one(users, { relationName: 'ServiceBookingToUser', fields: [ serviceBookings.userId ], references: [ users.id ] }) }));