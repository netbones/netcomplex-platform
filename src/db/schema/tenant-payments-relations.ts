import { relations } from 'drizzle-orm';
import { tenantPayments } from './tenant-payments';
import { tenants } from './tenants';
import { tenantSubscriptions } from './tenant-subscriptions';

export const tenantPaymentsRelations = relations(tenantPayments, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'TenantToTenantPayment', fields: [ tenantPayments.tenantId ], references: [ tenants.id ] }), subscription: helpers.one(tenantSubscriptions, { relationName: 'TenantPaymentToTenantSubscription', fields: [ tenantPayments.subscriptionId ], references: [ tenantSubscriptions.id ] }) }));