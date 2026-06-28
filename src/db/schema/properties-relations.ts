import { relations } from 'drizzle-orm';
import { properties } from './properties';
import { bookings } from './bookings';
import { households } from './households';
import { maintenanceRequests } from './maintenance-requests';
import { users } from './users';
import { agentAccesses } from './agent-accesses';
import { propertyListings } from './property-listings';
import { residentDelegations } from './resident-delegations';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { propertyPremiumSeats } from './property-premium-seats';

export const propertiesRelations = relations(properties, helpers => ({
  Booking: helpers.many(bookings, { relationName: 'BookingToProperty' }),
  households: helpers.many(households, { relationName: 'HouseholdToProperty' }),
  MaintenanceRequest: helpers.many(maintenanceRequests, {
    relationName: 'MaintenanceRequestToProperty',
  }),
  owner: helpers.one(users, {
    relationName: 'PropertyOwner',
    fields: [properties.ownerId],
    references: [users.id],
  }),
  agentAccess: helpers.many(agentAccesses, { relationName: 'AgentAccessToProperty' }),
  propertyListing: helpers.many(propertyListings, { relationName: 'PropertyToPropertyListing' }),
  residentDelegations: helpers.many(residentDelegations, {
    relationName: 'PropertyToResidentDelegation',
  }),
  soloSeat: helpers.many(soloSeats, { relationName: 'PropertyToSoloSeat' }),
  standardSeat: helpers.many(standardSeats, { relationName: 'PropertyToStandardSeat' }),
  PropertyPremiumSeat: helpers.many(propertyPremiumSeats, {
    relationName: 'PropertyToPropertyPremiumSeat',
  }),
}));
