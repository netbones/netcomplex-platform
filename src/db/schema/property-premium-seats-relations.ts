import { relations } from 'drizzle-orm';
import { propertyPremiumSeats } from './property-premium-seats';
import { properties } from './properties';
import { premiumSeats } from './premium-seats';

export const propertyPremiumSeatsRelations = relations(propertyPremiumSeats, (helpers) => ({ property: helpers.one(properties, { relationName: 'PropertyToPropertyPremiumSeat', fields: [ propertyPremiumSeats.propertyId ], references: [ properties.id ] }), premiumSeat: helpers.one(premiumSeats, { relationName: 'PremiumSeatToPropertyPremiumSeat', fields: [ propertyPremiumSeats.premiumSeatId ], references: [ premiumSeats.id ] }) }));