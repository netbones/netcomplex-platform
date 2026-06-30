import { relations } from 'drizzle-orm';
import { addresses } from './addresses';
import { handles } from './handles';
import { addressEndpoints } from './address-endpoints';
import { standardSeats } from './standard-seats';
import { soloSeats } from './solo-seats';
import { premiumSeats } from './premium-seats';
import { profiles } from './profiles';
import { properties } from './properties';
import { serviceProviders } from './service-providers';

export const addressesRelations = relations(addresses, helpers => ({
  canonicalAddress: helpers.one(addresses, {
    relationName: 'AddressCanonical',
    fields: [addresses.canonicalAddressId],
    references: [addresses.id],
  }),
  aliases: helpers.many(addresses, { relationName: 'AddressCanonical' }),
  handles: helpers.many(handles, { relationName: 'AddressToHandle' }),
  endpoints: helpers.many(addressEndpoints, { relationName: 'AddressToAddressEndpoint' }),
  standardSeats: helpers.many(standardSeats, { relationName: 'AddressToStandardSeat' }),
  soloSeats: helpers.many(soloSeats, { relationName: 'AddressToSoloSeat' }),
  premiumSeats: helpers.many(premiumSeats, { relationName: 'AddressToPremiumSeat' }),
  profiles: helpers.many(profiles, { relationName: 'AddressToProfile' }),
  properties: helpers.many(properties, { relationName: 'AddressToProperty' }),
  serviceProviders: helpers.many(serviceProviders, { relationName: 'AddressToServiceProvider' }),
}));
