import { relations } from 'drizzle-orm';
import { dataConsents } from './data-consents';
import { tenants } from './tenants';
import { dWallets } from './d-wallets';

export const dataConsentsRelations = relations(dataConsents, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'DataConsentToTenant',
    fields: [dataConsents.tenantId],
    references: [tenants.id],
  }),
  wallet: helpers.one(dWallets, {
    relationName: 'DWalletToDataConsent',
    fields: [dataConsents.walletId],
    references: [dWallets.id],
  }),
}));
