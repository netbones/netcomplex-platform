import { relations } from 'drizzle-orm';
import { billingEvents } from './billing-events';
import { tenantSubscriptions } from './tenant-subscriptions';

export const billingEventsRelations = relations(billingEvents, helpers => ({
  subscription: helpers.one(tenantSubscriptions, {
    relationName: 'BillingEventToTenantSubscription',
    fields: [billingEvents.subscriptionId],
    references: [tenantSubscriptions.id],
  }),
}));
