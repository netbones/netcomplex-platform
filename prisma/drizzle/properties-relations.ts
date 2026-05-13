import { relations } from 'drizzle-orm';
import { properties } from './properties';
import { users } from './users';
import { households } from './households';
import { agentAccesses } from './agent-accesses';
import { propertyListings } from './property-listings';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { propertiesTopremiumSeats } from './properties-topremium-seats';
import { bookings } from './bookings';
import { maintenanceRequests } from './maintenance-requests';

export const propertiesRelations = relations(properties, (helpers) => ({ owner: helpers.one(users, { relationName: 'PropertyOwner', fields: [ properties.ownerId ], references: [ users.id ] }), households: helpers.many(households, { relationName: 'HouseholdToProperty' }), agentAccess: helpers.many(agentAccesses, { relationName: 'PropertyToagentAccess' }), propertyListing: helpers.many(propertyListings, { relationName: 'PropertyTopropertyListing' }), soloSeat: helpers.many(soloSeats, { relationName: 'PropertyTosoloSeat' }), standardSeat: helpers.many(standardSeats, { relationName: 'PropertyTostandardSeat' }), premiumSeat: helpers.many(propertiesTopremiumSeats), Booking: helpers.many(bookings, { relationName: 'BookingToProperty' }), MaintenanceRequest: helpers.many(maintenanceRequests, { relationName: 'MaintenanceRequestToProperty' }) }));