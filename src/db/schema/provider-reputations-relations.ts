import { relations } from 'drizzle-orm';
import { providerReputations } from './provider-reputations';
import { serviceProviders } from './service-providers';

export const providerReputationsRelations = relations(providerReputations, (helpers) => ({ provider: helpers.one(serviceProviders, { relationName: 'ProviderReputationToServiceProvider', fields: [ providerReputations.providerId ], references: [ serviceProviders.id ] }) }));