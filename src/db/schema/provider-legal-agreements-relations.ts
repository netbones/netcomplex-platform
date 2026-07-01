import { relations } from 'drizzle-orm';
import { providerLegalAgreements } from './provider-legal-agreements';
import { serviceProviders } from './service-providers';

export const providerLegalAgreementsRelations = relations(providerLegalAgreements, (helpers) => ({ provider: helpers.one(serviceProviders, { relationName: 'ProviderLegalAgreementToServiceProvider', fields: [ providerLegalAgreements.providerId ], references: [ serviceProviders.id ] }) }));