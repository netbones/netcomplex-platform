import { relations } from 'drizzle-orm';
import { providerReputations } from './provider-reputations';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';

export const providerReputationsRelations = relations(providerReputations, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'ProviderReputationToTenant', fields: [ providerReputations.tenantId ], references: [ tenants.id ] }), provider: helpers.one(serviceProviders, { relationName: 'ProviderReputationToServiceProvider', fields: [ providerReputations.providerId ], references: [ serviceProviders.id ] }) }));