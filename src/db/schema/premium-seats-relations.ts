import { relations } from 'drizzle-orm';
import { premiumSeats } from './premium-seats';
import { addresses } from './addresses';
import { tenants } from './tenants';
import { users } from './users';
import { propertyPremiumSeats } from './property-premium-seats';

export const premiumSeatsRelations = relations(premiumSeats, helpers => ({
  address: helpers.one(addresses, {
    relationName: 'AddressToPremiumSeat',
    fields: [premiumSeats.addressId],
    references: [addresses.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'PremiumSeatToTenant',
    fields: [premiumSeats.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'PremiumSeatTouser',
    fields: [premiumSeats.userId],
    references: [users.id],
  }),
  propertyPremiumSeats: helpers.many(propertyPremiumSeats, {
    relationName: 'PremiumSeatToPropertyPremiumSeat',
  }),
}));
