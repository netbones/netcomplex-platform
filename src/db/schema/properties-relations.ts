import { relations } from 'drizzle-orm';
import { properties } from './properties';
import { agentAccesses } from './agent-accesses';
import { bookings } from './bookings';
import { households } from './households';
import { maintenanceRequests } from './maintenance-requests';
import { addresses } from './addresses';
import { users } from './users';
import { tenants } from './tenants';
import { propertyListings } from './property-listings';
import { propertyPremiumSeats } from './property-premium-seats';
import { residentDelegations } from './resident-delegations';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { securityAlerts } from './security-alerts';

export const propertiesRelations = relations(properties, helpers => ({
  agentAccess: helpers.many(agentAccesses, { relationName: 'AgentAccessToProperty' }),
  Booking: helpers.many(bookings, { relationName: 'BookingToProperty' }),
  households: helpers.many(households, { relationName: 'HouseholdToProperty' }),
  MaintenanceRequest: helpers.many(maintenanceRequests, {
    relationName: 'MaintenanceRequestToProperty',
  }),
  address: helpers.one(addresses, {
    relationName: 'AddressToProperty',
    fields: [properties.addressId],
    references: [addresses.id],
  }),
  owner: helpers.one(users, {
    relationName: 'PropertyOwner',
    fields: [properties.ownerId],
    references: [users.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'PropertyToTenant',
    fields: [properties.tenantId],
    references: [tenants.id],
  }),
  propertyListing: helpers.many(propertyListings, { relationName: 'PropertyToPropertyListing' }),
  PropertyPremiumSeat: helpers.many(propertyPremiumSeats, {
    relationName: 'PropertyToPropertyPremiumSeat',
  }),
  residentDelegations: helpers.many(residentDelegations, {
    relationName: 'PropertyToResidentDelegation',
  }),
  soloSeat: helpers.many(soloSeats, { relationName: 'PropertyToSoloSeat' }),
  standardSeat: helpers.many(standardSeats, { relationName: 'PropertyToStandardSeat' }),
  SecurityAlert: helpers.many(securityAlerts, { relationName: 'PropertyToSecurityAlert' }),
}));
