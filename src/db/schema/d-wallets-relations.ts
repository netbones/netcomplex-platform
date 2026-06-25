import { relations } from 'drizzle-orm';
import { dWallets } from './d-wallets';
import { users } from './users';
import { walletTransactions } from './wallet-transactions';
import { dataConsents } from './data-consents';
import { payoutRequests } from './payout-requests';

export const dWalletsRelations = relations(dWallets, helpers => ({
  user: helpers.one(users, {
    relationName: 'DWalletTouser',
    fields: [dWallets.userId],
    references: [users.id],
  }),
  transactions: helpers.many(walletTransactions, { relationName: 'DWalletToWalletTransaction' }),
  consents: helpers.many(dataConsents, { relationName: 'DWalletToDataConsent' }),
  payoutRequests: helpers.many(payoutRequests, { relationName: 'DWalletToPayoutRequest' }),
}));
