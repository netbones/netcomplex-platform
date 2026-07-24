import { relations } from 'drizzle-orm';
import { soloSeats } from './solo-seats';
import { addresses } from './addresses';
import { properties } from './properties';
import { tenants } from './tenants';
import { users } from './users';

export const soloSeatsRelations = relations(soloSeats, (helpers) => ({ address: helpers.one(addresses, { relationName: 'AddressToSoloSeat', fields: [ soloSeats.addressId ], references: [ addresses.id ] }), property: helpers.one(properties, { relationName: 'PropertyToSoloSeat', fields: [ soloSeats.propertyId ], references: [ properties.id ] }), Tenant: helpers.one(tenants, { relationName: 'SoloSeatToTenant', fields: [ soloSeats.tenantId ], references: [ tenants.id ] }), user: helpers.one(users, { relationName: 'SoloSeatTouser', fields: [ soloSeats.userId ], references: [ users.id ] }) }));