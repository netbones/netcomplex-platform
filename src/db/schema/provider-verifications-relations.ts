import { relations } from 'drizzle-orm';
import { providerVerifications } from './provider-verifications';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';

export const providerVerificationsRelations = relations(providerVerifications, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'ProviderVerificationToTenant',
    fields: [providerVerifications.tenantId],
    references: [tenants.id],
  }),
  provider: helpers.one(serviceProviders, {
    relationName: 'ProviderVerificationToServiceProvider',
    fields: [providerVerifications.providerId],
    references: [serviceProviders.id],
  }),
}));
