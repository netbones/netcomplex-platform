import { relations } from 'drizzle-orm';
import { tenantInvoices } from './tenant-invoices';
import { tenants } from './tenants';
import { tenantSubscriptions } from './tenant-subscriptions';

export const tenantInvoicesRelations = relations(tenantInvoices, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'TenantToTenantInvoice', fields: [ tenantInvoices.tenantId ], references: [ tenants.id ] }), subscription: helpers.one(tenantSubscriptions, { relationName: 'TenantInvoiceToTenantSubscription', fields: [ tenantInvoices.subscriptionId ], references: [ tenantSubscriptions.id ] }) }));