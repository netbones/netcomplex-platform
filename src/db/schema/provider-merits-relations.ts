import { relations } from 'drizzle-orm';
import { providerMerits } from './provider-merits';
import { serviceProviders } from './service-providers';

export const providerMeritsRelations = relations(providerMerits, helpers => ({
  provider: helpers.one(serviceProviders, {
    relationName: 'ProviderMeritToServiceProvider',
    fields: [providerMerits.providerId],
    references: [serviceProviders.id],
  }),
}));
