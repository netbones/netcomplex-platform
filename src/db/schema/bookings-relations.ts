import { relations } from 'drizzle-orm';
import { bookings } from './bookings';
import { properties } from './properties';
import { tenants } from './tenants';
import { users } from './users';

export const bookingsRelations = relations(bookings, helpers => ({
  property: helpers.one(properties, {
    relationName: 'BookingToProperty',
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'BookingToTenant',
    fields: [bookings.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'BookingTouser',
    fields: [bookings.userId],
    references: [users.id],
  }),
}));
