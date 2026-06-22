import { relations } from 'drizzle-orm';
import { providerCredits } from './provider-credits';
import { serviceProviders } from './service-providers';

export const providerCreditsRelations = relations(providerCredits, helpers => ({
  provider: helpers.one(serviceProviders, {
    relationName: 'ProviderCreditToServiceProvider',
    fields: [providerCredits.providerId],
    references: [serviceProviders.id],
  }),
}));
