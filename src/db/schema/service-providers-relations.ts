import { relations } from 'drizzle-orm';
import { serviceProviders } from './service-providers';
import { maintenanceRequests } from './maintenance-requests';
import { paymentTransactions } from './payment-transactions';
import { providerCharges } from './provider-charges';
import { providerInvoices } from './provider-invoices';
import { providerLegalAgreements } from './provider-legal-agreements';
import { providerMerits } from './provider-merits';
import { providerReputations } from './provider-reputations';
import { providerSubscriptions } from './provider-subscriptions';
import { providerVerifications } from './provider-verifications';
import { revenueRecords } from './revenue-records';
import { serviceBookings } from './service-bookings';
import { addresses } from './addresses';
import { users } from './users';

export const serviceProvidersRelations = relations(serviceProviders, helpers => ({
  assignments: helpers.many(maintenanceRequests, { relationName: 'ProviderAssignments' }),
  transactions: helpers.many(paymentTransactions, {
    relationName: 'PaymentTransactionToServiceProvider',
  }),
  charges: helpers.many(providerCharges, { relationName: 'ProviderChargeToServiceProvider' }),
  invoices: helpers.many(providerInvoices, { relationName: 'ProviderInvoiceToServiceProvider' }),
  legalAgreements: helpers.many(providerLegalAgreements, {
    relationName: 'ProviderLegalAgreementToServiceProvider',
  }),
  merits: helpers.many(providerMerits, { relationName: 'ProviderMeritToServiceProvider' }),
  reputation: helpers.one(providerReputations),
  subscriptions: helpers.many(providerSubscriptions, {
    relationName: 'ProviderSubscriptionToServiceProvider',
  }),
  verifications: helpers.one(providerVerifications),
  revenue: helpers.many(revenueRecords, { relationName: 'RevenueRecordToServiceProvider' }),
  serviceBooking: helpers.many(serviceBookings, { relationName: 'ServiceBookingToProvider' }),
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
}));
