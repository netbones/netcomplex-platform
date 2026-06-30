import { relations } from 'drizzle-orm';
import { serviceProviders } from './service-providers';
import { addresses } from './addresses';
import { users } from './users';
import { maintenanceRequests } from './maintenance-requests';
import { providerVerifications } from './provider-verifications';
import { providerLegalAgreements } from './provider-legal-agreements';
import { providerReputations } from './provider-reputations';
import { providerMerits } from './provider-merits';
import { providerSubscriptions } from './provider-subscriptions';
import { paymentTransactions } from './payment-transactions';
import { revenueRecords } from './revenue-records';
import { providerCharges } from './provider-charges';
import { providerInvoices } from './provider-invoices';
import { serviceBookings } from './service-bookings';

export const serviceProvidersRelations = relations(serviceProviders, helpers => ({
  address: helpers.one(addresses, {
    relationName: 'AddressToServiceProvider',
    fields: [serviceProviders.addressId],
    references: [addresses.id],
  }),
  user: helpers.one(users, {
    relationName: 'ServiceProviderTouser',
    fields: [serviceProviders.userId],
    references: [users.id],
  }),
  assignments: helpers.many(maintenanceRequests, { relationName: 'ProviderAssignments' }),
  verifications: helpers.many(providerVerifications, {
    relationName: 'ProviderVerificationToServiceProvider',
  }),
  legalAgreements: helpers.many(providerLegalAgreements, {
    relationName: 'ProviderLegalAgreementToServiceProvider',
  }),
  reputation: helpers.one(providerReputations),
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
  serviceBooking: helpers.many(serviceBookings, { relationName: 'ServiceBookingToProvider' }),
}));
