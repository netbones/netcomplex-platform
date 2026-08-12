import { relations } from 'drizzle-orm';
import { amenities } from './amenities';
import { tenants } from './tenants';
import { bookings } from './bookings';

export const amenitiesRelations = relations(amenities, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'AmenityToTenant',
    fields: [amenities.tenantId],
    references: [tenants.id],
  }),
  bookings: helpers.many(bookings, { relationName: 'AmenityToBooking' }),
}));
