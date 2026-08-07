import { relations } from 'drizzle-orm';
import { propertyPremiumSeats } from './property-premium-seats';
import { premiumSeats } from './premium-seats';
import { properties } from './properties';
import { tenants } from './tenants';

export const propertyPremiumSeatsRelations = relations(propertyPremiumSeats, helpers => ({
  premiumSeat: helpers.one(premiumSeats, {
    relationName: 'PremiumSeatToPropertyPremiumSeat',
    fields: [propertyPremiumSeats.premiumSeatId],
    references: [premiumSeats.id],
  }),
  property: helpers.one(properties, {
    relationName: 'PropertyToPropertyPremiumSeat',
    fields: [propertyPremiumSeats.propertyId],
    references: [properties.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'PropertyPremiumSeatToTenant',
    fields: [propertyPremiumSeats.tenantId],
    references: [tenants.id],
  }),
}));
