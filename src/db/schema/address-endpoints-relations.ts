import { relations } from 'drizzle-orm';
import { addressEndpoints } from './address-endpoints';
import { addresses } from './addresses';

export const addressEndpointsRelations = relations(addressEndpoints, (helpers) => ({ address: helpers.one(addresses, { relationName: 'AddressToAddressEndpoint', fields: [ addressEndpoints.addressId ], references: [ addresses.id ] }) }));