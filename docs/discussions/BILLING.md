Based on your roadmap and the billing audit, I would not implement "a billing system" as a single phase. NetComplex actually needs **four distinct financial domains** that should be designed together but delivered separately.

The audit shows you currently have:

- Provider billing (implemented)
- Tenant tiers (feature gating only)
- AI token billing (planned Phase 104)
- dWallet (planned Phase 47)
- No platform SaaS billing for tenants
- No tenant subscription lifecycle
- No platform invoices
- No unified ledger

This creates a significant architectural gap because `Tenant.tier` is currently just an admin-set field rather than the output of a subscription system.

# Recommended Billing Architecture

## Domain 1: Platform Subscription Billing (Highest Priority)

This should become the source of truth for:

- STANDARD
- PREMIUM
- ENTERPRISE

tenant plans.

Instead of:

```text
Tenant.tier = manually assigned
```

you move to:

```text
TenantSubscription
    ↓
BillingPlan
    ↓
Tenant.tier
```

### New Models

```prisma
model BillingPlan
model TenantSubscription
model TenantInvoice
model TenantPayment
model BillingAdjustment
```

### Responsibilities

BillingPlan

- name
- monthlyPrice
- annualPrice
- modulesIncluded
- pageLimits
- seatLimits
- aiQuota

TenantSubscription

- active plan
- renewal date
- status
- trial period
- cancellation

TenantInvoice

- monthly invoice
- VAT support
- PDF generation

TenantPayment

- Paystack
- PayPal
- future Stripe

---

## Domain 2: AI Consumption Billing

Phase 104 already defines most of this.

I would slightly extend it.

### Add

```prisma
model AiUsageEvent
model TenantAiUsage
model AiInvoiceLine
```

This allows:

```text
Base Subscription
+
AI Overage
=
Invoice
```

instead of maintaining a separate billing flow.

---

## Domain 3: dWallet Ledger

Phase 47 is already heading in the right direction.

The important change:

**dWallet must be built as a true double-entry ledger from day one.**

Do not store:

```text
wallet.balance += amount
```

Store:

```text
WalletTransaction
LedgerEntry
```

and derive balances.

This avoids future financial reconciliation problems.

---

## Domain 4: Marketplace Revenue

You already have provider billing:

- subscriptions
- charges
- invoices
- revenue records
- payment transactions

I would evolve this into:

```text
Provider Billing
Marketplace Fees
Referral Fees
Advertising Revenue
```

all feeding a common revenue ledger.

---

# Missing Platform Concepts

## Trial Management

Every SaaS platform eventually needs:

```prisma
trialEndsAt
convertedAt
conversionSource
```

Without this you cannot measure onboarding effectiveness.

---

## Coupon System

```prisma
Coupon
CouponRedemption
```

Needed for:

- launch promotions
- HOA partnerships
- annual discounts

---

## Tax Engine

South Africa:

- VAT
- VAT invoices
- VAT reporting

Future expansion:

- GST
- Sales Tax

Never bake tax rules directly into invoices.

Create:

```prisma
TaxRate
TaxJurisdiction
```

---

## Billing Events

Create an immutable event stream.

```prisma
BillingEvent
```

Examples:

```text
SUBSCRIPTION_CREATED
SUBSCRIPTION_RENEWED
PAYMENT_RECEIVED
PAYMENT_FAILED
PLAN_UPGRADED
PLAN_DOWNGRADED
AI_OVERAGE_CHARGED
```

This becomes invaluable for support and auditing.

---

# Recommended Roadmap Addition

I would insert a new major phase before Phase 104.

## Phase 46A – Platform SaaS Billing Foundation

### Plan 46A-01

Billing Domain Models

- BillingPlan
- TenantSubscription
- TenantInvoice
- TenantPayment
- BillingEvent

### Plan 46A-02

Checkout & Subscription Lifecycle

- Plan selection
- Upgrade
- Downgrade
- Cancellation
- Trial management

### Plan 46A-03

Platform Billing Admin

Routes:

```text
/api/admin/platform/billing/plans
/api/admin/platform/billing/subscriptions
/api/admin/platform/billing/invoices
/api/admin/platform/billing/payments
```

Widgets:

```text
admin-billing-overview
admin-subscriptions
admin-revenue
```

### Plan 46A-04

Tenant Billing Portal

Routes:

```text
/tenant/billing
/tenant/billing/invoices
/tenant/billing/payment-methods
```

---

# Long-Term End State

The clean architecture is:

```text
TenantSubscription
        │
        ▼
BillingPlan
        │
        ├── Module Entitlements
        ├── Seat Limits
        ├── AI Quotas
        └── Page Limits

Payments
        │
        ▼
Invoices
        │
        ▼
Ledger

Provider Billing
AI Billing
dWallet
Marketplace Revenue
        │
        ▼
Unified Financial Ledger
```

This keeps your SaaS billing, AI billing, provider billing, and future dWallet ecosystem aligned instead of becoming four separate financial systems that later need painful reconciliation.
