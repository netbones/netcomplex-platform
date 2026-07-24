import { relations } from 'drizzle-orm';
import { providerLegalAgreements } from './provider-legal-agreements';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';

export const providerLegalAgreementsRelations = relations(providerLegalAgreements, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'ProviderLegalAgreementToTenant', fields: [ providerLegalAgreements.tenantId ], references: [ tenants.id ] }), provider: helpers.one(serviceProviders, { relationName: 'ProviderLegalAgreementToServiceProvider', fields: [ providerLegalAgreements.providerId ], references: [ serviceProviders.id ] }) }));