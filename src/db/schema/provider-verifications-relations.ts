import { relations } from 'drizzle-orm';
import { providerVerifications } from './provider-verifications';
import { serviceProviders } from './service-providers';

export const providerVerificationsRelations = relations(providerVerifications, helpers => ({
  provider: helpers.one(serviceProviders, {
    relationName: 'ProviderVerificationToServiceProvider',
    fields: [providerVerifications.providerId],
    references: [serviceProviders.id],
  }),
}));
