import { relations } from 'drizzle-orm';
import { providerSubscriptions } from './provider-subscriptions';
import { serviceProviders } from './service-providers';
import { subscriptionTiers } from './subscription-tiers';
import { paymentTransactions } from './payment-transactions';
import { providerCharges } from './provider-charges';
import { providerInvoices } from './provider-invoices';

export const providerSubscriptionsRelations = relations(providerSubscriptions, (helpers) => ({ provider: helpers.one(serviceProviders, { relationName: 'ProviderSubscriptionToServiceProvider', fields: [ providerSubscriptions.providerId ], references: [ serviceProviders.id ] }), tier: helpers.one(subscriptionTiers, { relationName: 'ProviderSubscriptionToSubscriptionTier', fields: [ providerSubscriptions.tierId ], references: [ subscriptionTiers.id ] }), transactions: helpers.many(paymentTransactions, { relationName: 'PaymentTransactionToProviderSubscription' }), charges: helpers.many(providerCharges, { relationName: 'ProviderChargeToProviderSubscription' }), invoices: helpers.many(providerInvoices, { relationName: 'ProviderInvoiceToProviderSubscription' }) }));