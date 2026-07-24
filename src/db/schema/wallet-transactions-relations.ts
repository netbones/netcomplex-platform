import { relations } from 'drizzle-orm';
import { walletTransactions } from './wallet-transactions';
import { tenants } from './tenants';
import { dWallets } from './d-wallets';

export const walletTransactionsRelations = relations(walletTransactions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'TenantToWalletTransaction', fields: [ walletTransactions.tenantId ], references: [ tenants.id ] }), wallet: helpers.one(dWallets, { relationName: 'DWalletToWalletTransaction', fields: [ walletTransactions.walletId ], references: [ dWallets.id ] }) }));