import { relations } from 'drizzle-orm';
import { paymentTransactions } from './payment-transactions';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';
import { providerSubscriptions } from './provider-subscriptions';
import { providerCharges } from './provider-charges';
import { providerInvoices } from './provider-invoices';
import { revenueRecords } from './revenue-records';

export const paymentTransactionsRelations = relations(paymentTransactions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'PaymentTransactionToTenant', fields: [ paymentTransactions.tenantId ], references: [ tenants.id ] }), provider: helpers.one(serviceProviders, { relationName: 'PaymentTransactionToServiceProvider', fields: [ paymentTransactions.providerId ], references: [ serviceProviders.id ] }), subscription: helpers.one(providerSubscriptions, { relationName: 'PaymentTransactionToProviderSubscription', fields: [ paymentTransactions.subscriptionId ], references: [ providerSubscriptions.id ] }), charges: helpers.many(providerCharges, { relationName: 'PaymentTransactionToProviderCharge' }), invoices: helpers.many(providerInvoices, { relationName: 'PaymentTransactionToProviderInvoice' }), revenue: helpers.many(revenueRecords, { relationName: 'PaymentTransactionToRevenueRecord' }) }));