import { relations } from 'drizzle-orm';
import { tenantSubscriptions } from './tenant-subscriptions';
import { billingPlans } from './billing-plans';
import { tenantInvoices } from './tenant-invoices';
import { tenantPayments } from './tenant-payments';
import { billingEvents } from './billing-events';

export const tenantSubscriptionsRelations = relations(tenantSubscriptions, (helpers) => ({ plan: helpers.one(billingPlans, { relationName: 'BillingPlanToTenantSubscription', fields: [ tenantSubscriptions.planId ], references: [ billingPlans.id ] }), invoices: helpers.many(tenantInvoices, { relationName: 'TenantInvoiceToTenantSubscription' }), payments: helpers.many(tenantPayments, { relationName: 'TenantPaymentToTenantSubscription' }), events: helpers.many(billingEvents, { relationName: 'BillingEventToTenantSubscription' }) }));