import { relations } from 'drizzle-orm';
import { tenantPayments } from './tenant-payments';
import { tenantSubscriptions } from './tenant-subscriptions';

export const tenantPaymentsRelations = relations(tenantPayments, (helpers) => ({ subscription: helpers.one(tenantSubscriptions, { relationName: 'TenantPaymentToTenantSubscription', fields: [ tenantPayments.subscriptionId ], references: [ tenantSubscriptions.id ] }) }));