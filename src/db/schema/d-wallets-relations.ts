import { relations } from 'drizzle-orm';
import { dWallets } from './d-wallets';
import { tenants } from './tenants';
import { users } from './users';
import { dataConsents } from './data-consents';
import { payoutRequests } from './payout-requests';
import { walletTransactions } from './wallet-transactions';

export const dWalletsRelations = relations(dWallets, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'DWalletToTenant',
    fields: [dWallets.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'DWalletTouser',
    fields: [dWallets.userId],
    references: [users.id],
  }),
  consents: helpers.many(dataConsents, { relationName: 'DWalletToDataConsent' }),
  payoutRequests: helpers.many(payoutRequests, { relationName: 'DWalletToPayoutRequest' }),
  transactions: helpers.many(walletTransactions, { relationName: 'DWalletToWalletTransaction' }),
}));
