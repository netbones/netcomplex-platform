'use client';

/**
 * Client-side billing type definitions for the tenant portal (Plan 04)
 * and admin widgets (Plan 03).
 *
 * All date fields use ISO 8601 strings for safe client consumption.
 * Mirrors the provider-billing model/types.ts pattern.
 */

// ---------------------------------------------------------------------------
// TenantBillingPlan — plan card displayed in PlanSelector
// ---------------------------------------------------------------------------

export interface TenantBillingPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  interval: 'MONTHLY' | 'ANNUAL';
  modulesIncluded: string[];
  pageLimits: { maxPages: number };
  seatLimits: { maxAdminSeats: number; maxStandardSeats: number };
  aiQuota: number;
  tier: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  isDefault: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// TenantSubscriptionView — current plan status display
// ---------------------------------------------------------------------------

export interface TenantSubscriptionView {
  id: string;
  planId: string;
  planName: string | null;
  planTier: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'TRIALING' | 'PAST_DUE';
  startDate: string | null;
  endDate: string | null;
  nextBillingDate: string | null;
  trialEndsAt: string | null;
  currentPeriodAmount: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// TenantInvoiceView — invoice history row
// ---------------------------------------------------------------------------

export interface TenantInvoiceView {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  planName: string | null;
  total: number;
  currency: string;
  status: string;
  paidAt: string | null;
  pdfUrl: string | null;
  downloadReady: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// TenantPaymentView — payment history row
// ---------------------------------------------------------------------------

export interface TenantPaymentView {
  id: string;
  amount: number;
  currency: string;
  status: string;
  gateway: 'PAYSTACK' | 'PAYPAL';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// TenantBillingSnapshot — full billing page payload
// ---------------------------------------------------------------------------

export interface TenantBillingSnapshot {
  currentSubscription: TenantSubscriptionView | null;
  recentInvoices: TenantInvoiceView[];
  recentPayments: TenantPaymentView[];
  availablePlans: TenantBillingPlan[];
}

// ---------------------------------------------------------------------------
// CheckoutResult — what the client receives after initiating checkout
// ---------------------------------------------------------------------------

export interface CheckoutResult {
  subscriptionId: string;
  transactionId: string | null;
  status: string;
  paymentUrl: string | null;
  reference: string | null;
}
