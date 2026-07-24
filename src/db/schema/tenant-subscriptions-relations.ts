import { relations } from 'drizzle-orm';
import { tenantSubscriptions } from './tenant-subscriptions';
import { tenants } from './tenants';
import { billingEvents } from './billing-events';
import { tenantInvoices } from './tenant-invoices';
import { tenantPayments } from './tenant-payments';
import { billingPlans } from './billing-plans';

export const tenantSubscriptionsRelations = relations(tenantSubscriptions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'TenantToTenantSubscription', fields: [ tenantSubscriptions.tenantId ], references: [ tenants.id ] }), events: helpers.many(billingEvents, { relationName: 'BillingEventToTenantSubscription' }), invoices: helpers.many(tenantInvoices, { relationName: 'TenantInvoiceToTenantSubscription' }), payments: helpers.many(tenantPayments, { relationName: 'TenantPaymentToTenantSubscription' }), plan: helpers.one(billingPlans, { relationName: 'BillingPlanToTenantSubscription', fields: [ tenantSubscriptions.planId ], references: [ billingPlans.id ] }) }));