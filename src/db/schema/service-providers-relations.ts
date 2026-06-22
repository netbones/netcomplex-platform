import { relations } from 'drizzle-orm';
import { serviceProviders } from './service-providers';
import { maintenanceRequests } from './maintenance-requests';
import { providerVerifications } from './provider-verifications';
import { providerLegalAgreements } from './provider-legal-agreements';
import { providerCredits } from './provider-credits';
import { providerMerits } from './provider-merits';
import { providerSubscriptions } from './provider-subscriptions';
import { paymentTransactions } from './payment-transactions';
import { revenueRecords } from './revenue-records';
import { providerCharges } from './provider-charges';
import { providerInvoices } from './provider-invoices';

export const serviceProvidersRelations = relations(serviceProviders, helpers => ({
  assignments: helpers.many(maintenanceRequests, { relationName: 'ProviderAssignments' }),
  verifications: helpers.many(providerVerifications, {
    relationName: 'ProviderVerificationToServiceProvider',
  }),
  legalAgreements: helpers.many(providerLegalAgreements, {
    relationName: 'ProviderLegalAgreementToServiceProvider',
  }),
  credit: helpers.one(providerCredits),
  merits: helpers.many(providerMerits, { relationName: 'ProviderMeritToServiceProvider' }),
  subscriptions: helpers.many(providerSubscriptions, {
    relationName: 'ProviderSubscriptionToServiceProvider',
  }),
  transactions: helpers.many(paymentTransactions, {
    relationName: 'PaymentTransactionToServiceProvider',
  }),
  revenue: helpers.many(revenueRecords, { relationName: 'RevenueRecordToServiceProvider' }),
  charges: helpers.many(providerCharges, { relationName: 'ProviderChargeToServiceProvider' }),
  invoices: helpers.many(providerInvoices, { relationName: 'ProviderInvoiceToServiceProvider' }),
}));
