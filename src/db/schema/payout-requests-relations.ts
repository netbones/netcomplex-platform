import { relations } from 'drizzle-orm';
import { payoutRequests } from './payout-requests';
import { dWallets } from './d-wallets';

export const payoutRequestsRelations = relations(payoutRequests, helpers => ({
  wallet: helpers.one(dWallets, {
    relationName: 'DWalletToPayoutRequest',
    fields: [payoutRequests.walletId],
    references: [dWallets.id],
  }),
}));
