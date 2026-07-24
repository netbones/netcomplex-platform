import { relations } from 'drizzle-orm';
import { billingEvents } from './billing-events';
import { tenants } from './tenants';
import { tenantSubscriptions } from './tenant-subscriptions';

export const billingEventsRelations = relations(billingEvents, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'BillingEventToTenant', fields: [ billingEvents.tenantId ], references: [ tenants.id ] }), subscription: helpers.one(tenantSubscriptions, { relationName: 'BillingEventToTenantSubscription', fields: [ billingEvents.subscriptionId ], references: [ tenantSubscriptions.id ] }) }));