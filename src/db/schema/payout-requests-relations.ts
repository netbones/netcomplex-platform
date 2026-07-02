import { relations } from 'drizzle-orm';
import { payoutRequests } from './payout-requests';
import { tenants } from './tenants';
import { dWallets } from './d-wallets';

export const payoutRequestsRelations = relations(payoutRequests, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'PayoutRequestToTenant',
    fields: [payoutRequests.tenantId],
    references: [tenants.id],
  }),
  wallet: helpers.one(dWallets, {
    relationName: 'DWalletToPayoutRequest',
    fields: [payoutRequests.walletId],
    references: [dWallets.id],
  }),
}));
