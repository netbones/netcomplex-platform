import { relations } from 'drizzle-orm';
import { providerMerits } from './provider-merits';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';

export const providerMeritsRelations = relations(providerMerits, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'ProviderMeritToTenant', fields: [ providerMerits.tenantId ], references: [ tenants.id ] }), provider: helpers.one(serviceProviders, { relationName: 'ProviderMeritToServiceProvider', fields: [ providerMerits.providerId ], references: [ serviceProviders.id ] }) }));