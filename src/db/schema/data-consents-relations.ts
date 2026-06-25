import { relations } from 'drizzle-orm';
import { dataConsents } from './data-consents';
import { dWallets } from './d-wallets';

export const dataConsentsRelations = relations(dataConsents, helpers => ({
  wallet: helpers.one(dWallets, {
    relationName: 'DWalletToDataConsent',
    fields: [dataConsents.walletId],
    references: [dWallets.id],
  }),
}));
