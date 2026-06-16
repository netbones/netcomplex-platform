import { relations } from 'drizzle-orm';
import { propertiesTopremiumSeats } from './properties-topremium-seats';
import { properties } from './properties';
import { premiumSeats } from './premium-seats';

export const propertiesTopremiumSeatsRelations = relations(propertiesTopremiumSeats, (helpers) => ({ property: helpers.one(properties, { fields: [ propertiesTopremiumSeats.A ], references: [ properties.id ] }), premiumSeat: helpers.one(premiumSeats, { fields: [ propertiesTopremiumSeats.B ], references: [ premiumSeats.id ] }) }));