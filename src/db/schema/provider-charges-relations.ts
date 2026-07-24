import { relations } from 'drizzle-orm';
import { providerCharges } from './provider-charges';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';
import { providerSubscriptions } from './provider-subscriptions';
import { paymentTransactions } from './payment-transactions';

export const providerChargesRelations = relations(providerCharges, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'ProviderChargeToTenant', fields: [ providerCharges.tenantId ], references: [ tenants.id ] }), provider: helpers.one(serviceProviders, { relationName: 'ProviderChargeToServiceProvider', fields: [ providerCharges.providerId ], references: [ serviceProviders.id ] }), subscription: helpers.one(providerSubscriptions, { relationName: 'ProviderChargeToProviderSubscription', fields: [ providerCharges.subscriptionId ], references: [ providerSubscriptions.id ] }), transaction: helpers.one(paymentTransactions, { relationName: 'PaymentTransactionToProviderCharge', fields: [ providerCharges.transactionId ], references: [ paymentTransactions.id ] }) }));