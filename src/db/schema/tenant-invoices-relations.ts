import { relations } from 'drizzle-orm';
import { tenantInvoices } from './tenant-invoices';
import { tenantSubscriptions } from './tenant-subscriptions';

export const tenantInvoicesRelations = relations(tenantInvoices, helpers => ({
  subscription: helpers.one(tenantSubscriptions, {
    relationName: 'TenantInvoiceToTenantSubscription',
    fields: [tenantInvoices.subscriptionId],
    references: [tenantSubscriptions.id],
  }),
}));
