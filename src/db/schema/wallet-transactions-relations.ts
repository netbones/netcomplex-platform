import { relations } from 'drizzle-orm';
import { walletTransactions } from './wallet-transactions';
import { dWallets } from './d-wallets';

export const walletTransactionsRelations = relations(walletTransactions, (helpers) => ({ wallet: helpers.one(dWallets, { relationName: 'DWalletToWalletTransaction', fields: [ walletTransactions.walletId ], references: [ dWallets.id ] }) }));