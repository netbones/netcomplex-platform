import { relations } from 'drizzle-orm';
import { billingPlans } from './billing-plan';
import { tenantSubscriptions } from './tenant-subscription';
import { tenantInvoices } from './tenant-invoice';
import { tenantPayments } from './tenant-payment';
import { billingEvents } from './billing-event';
import { coupons } from './coupon';
import { couponRedemptions } from './coupon-redemption';

export const billingPlansRelations = relations(billingPlans, helpers => ({
  tenantSubscriptions: helpers.many(tenantSubscriptions, {
    relationName: 'TenantSubscriptionToBillingPlan',
  }),
  coupons: helpers.many(coupons, { relationName: 'CouponToBillingPlan' }),
}));

export const tenantSubscriptionsRelations = relations(tenantSubscriptions, helpers => ({
  plan: helpers.one(billingPlans, {
    relationName: 'TenantSubscriptionToBillingPlan',
    fields: [tenantSubscriptions.planId],
    references: [billingPlans.id],
  }),
  invoices: helpers.many(tenantInvoices, { relationName: 'TenantInvoiceToTenantSubscription' }),
  payments: helpers.many(tenantPayments, { relationName: 'TenantPaymentToTenantSubscription' }),
  events: helpers.many(billingEvents, { relationName: 'BillingEventToTenantSubscription' }),
}));

export const tenantInvoicesRelations = relations(tenantInvoices, helpers => ({
  subscription: helpers.one(tenantSubscriptions, {
    relationName: 'TenantInvoiceToTenantSubscription',
    fields: [tenantInvoices.subscriptionId],
    references: [tenantSubscriptions.id],
  }),
}));

export const tenantPaymentsRelations = relations(tenantPayments, helpers => ({
  subscription: helpers.one(tenantSubscriptions, {
    relationName: 'TenantPaymentToTenantSubscription',
    fields: [tenantPayments.subscriptionId],
    references: [tenantSubscriptions.id],
  }),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, helpers => ({
  coupon: helpers.one(coupons, {
    relationName: 'CouponRedemptionToCoupon',
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
}));
