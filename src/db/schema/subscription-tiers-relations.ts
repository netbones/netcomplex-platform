import { relations } from 'drizzle-orm';
import { subscriptionTiers } from './subscription-tiers';
import { providerSubscriptions } from './provider-subscriptions';

export const subscriptionTiersRelations = relations(subscriptionTiers, helpers => ({
  subscriptions: helpers.many(providerSubscriptions, {
    relationName: 'ProviderSubscriptionToSubscriptionTier',
  }),
}));
