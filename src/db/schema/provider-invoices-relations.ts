import { relations } from 'drizzle-orm';
import { providerInvoices } from './provider-invoices';
import { serviceProviders } from './service-providers';
import { providerSubscriptions } from './provider-subscriptions';
import { paymentTransactions } from './payment-transactions';

export const providerInvoicesRelations = relations(providerInvoices, (helpers) => ({ provider: helpers.one(serviceProviders, { relationName: 'ProviderInvoiceToServiceProvider', fields: [ providerInvoices.providerId ], references: [ serviceProviders.id ] }), subscription: helpers.one(providerSubscriptions, { relationName: 'ProviderInvoiceToProviderSubscription', fields: [ providerInvoices.subscriptionId ], references: [ providerSubscriptions.id ] }), transaction: helpers.one(paymentTransactions, { relationName: 'PaymentTransactionToProviderInvoice', fields: [ providerInvoices.transactionId ], references: [ paymentTransactions.id ] }) }));