import { relations } from 'drizzle-orm';
import { addresses } from './addresses';
import { addressEndpoints } from './address-endpoints';
import { handles } from './handles';
import { premiumSeats } from './premium-seats';
import { profiles } from './profiles';
import { properties } from './properties';
import { serviceProviders } from './service-providers';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';

export const addressesRelations = relations(addresses, helpers => ({
  canonicalAddress: helpers.one(addresses, {
    relationName: 'AddressCanonical',
    fields: [addresses.canonicalAddressId],
    references: [addresses.id],
  }),
  aliases: helpers.many(addresses, { relationName: 'AddressCanonical' }),
  endpoints: helpers.many(addressEndpoints, { relationName: 'AddressToAddressEndpoint' }),
  handles: helpers.many(handles, { relationName: 'AddressToHandle' }),
  premiumSeats: helpers.many(premiumSeats, { relationName: 'AddressToPremiumSeat' }),
  profiles: helpers.many(profiles, { relationName: 'AddressToProfile' }),
  properties: helpers.many(properties, { relationName: 'AddressToProperty' }),
  serviceProviders: helpers.many(serviceProviders, { relationName: 'AddressToServiceProvider' }),
  soloSeats: helpers.many(soloSeats, { relationName: 'AddressToSoloSeat' }),
  standardSeats: helpers.many(standardSeats, { relationName: 'AddressToStandardSeat' }),
}));
