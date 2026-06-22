import { relations } from 'drizzle-orm';
import { revenueRecords } from './revenue-records';
import { serviceProviders } from './service-providers';
import { paymentTransactions } from './payment-transactions';

export const revenueRecordsRelations = relations(revenueRecords, helpers => ({
  provider: helpers.one(serviceProviders, {
    relationName: 'RevenueRecordToServiceProvider',
    fields: [revenueRecords.providerId],
    references: [serviceProviders.id],
  }),
  transaction: helpers.one(paymentTransactions, {
    relationName: 'PaymentTransactionToRevenueRecord',
    fields: [revenueRecords.transactionId],
    references: [paymentTransactions.id],
  }),
}));
