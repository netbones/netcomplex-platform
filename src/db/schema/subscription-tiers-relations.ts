import { relations } from 'drizzle-orm';
import { subscriptionTiers } from './subscription-tiers';
import { tenants } from './tenants';
import { providerSubscriptions } from './provider-subscriptions';

export const subscriptionTiersRelations = relations(subscriptionTiers, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'SubscriptionTierToTenant',
    fields: [subscriptionTiers.tenantId],
    references: [tenants.id],
  }),
  subscriptions: helpers.many(providerSubscriptions, {
    relationName: 'ProviderSubscriptionToSubscriptionTier',
  }),
}));
