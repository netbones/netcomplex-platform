import { relations } from 'drizzle-orm';
import { households } from './households';
import { agentAccesses } from './agent-accesses';
import { profiles } from './profiles';
import { propertyListings } from './property-listings';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { householdsTopremiumSeats } from './households-topremium-seats';

export const householdsRelations = relations(households, (helpers) => ({ agentAccess: helpers.many(agentAccesses, { relationName: 'agentAccessTohousehold' }), profile: helpers.many(profiles, { relationName: 'householdToprofile' }), propertyListing: helpers.many(propertyListings, { relationName: 'householdTopropertyListing' }), soloSeat: helpers.many(soloSeats, { relationName: 'householdTosoloSeat' }), standardSeat: helpers.many(standardSeats, { relationName: 'householdTostandardSeat' }), premiumSeat: helpers.many(householdsTopremiumSeats) }));