---
title: Platform Billing System Audit Report
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Platform Billing System Audit Report

## 1. Does a Platform Billing System Exist?

Partially. A billing system exists, but it is exclusively scoped to Provider (service provider) billing. There is no platform-level tenant billing, no dWallet, no token/credit/payment tracking for tenants, and the Phase 104 AI Token Pool infrastructure is not yet built (all 4 plans are in "planned" state).

What exists vs. what doesn't:

| Capability                                         | Status                              |
| -------------------------------------------------- | ----------------------------------- |
| Provider subscriptions & billing (Paystack/PayPal) | implemented                         |
| Provider payment refunds                           | implemented                         |
| Revenue tracking & admin reporting                 | implemented                         |
| Tenant platform billing (tenant pays platform)     | not implemented                     |
| Token/credit tracking for tenants                  | not implmented, (104 will be first) |
| Tier-gated quota enforcement                       | not implemented (104 will be first) |
| dWallet (resident data rights + revenue share)     | planned in 47                       |
| Monthly cron rollover                              | not implemented, phase 104 plan 03  |

2. What Models/Tables Are Involved?
   A. Existing Provider Billing Models (Phase 46 — complete)
   Model (Prisma) Drizzle Schema
   SubscriptionTier src/db/schema/subscription-tiers.ts
   ProviderSubscription src/db/schema/provider-subscriptions.ts
   PaymentTransaction src/db/schema/payment-transactions.ts
   RevenueRecord src/db/schema/revenue-records.ts
   ProviderCharge src/db/schema/provider-charges.ts
   ProviderInvoice src/db/schema/provider-invoices.ts
   Supporting enums: SubscriptionStatus, PaymentGateway (PAYSTACK/PAYPAL), TransactionStatus, ProviderChargeStatus, InvoiceStatus.

B. Tenant Tier Model (exists, used for feature gating only)

- Tenant.tier — type Tier enum (STANDARD, PREMIUM, ENTERPRISE), default STANDARD
- Tenant.subscriptionTier — legacy string field, default "basic" (appears unused in modern code paths)
- No billing/charge/subscription/ledger models exist for tenants

C. Phase 104 AI Token Pool Models (planned, NOT yet built)
Model Purpose
PlatformAiTierQuota Tier quotas: monthlyTokens, overagePolicy, overageTokens, overagePriceZAR
AiCapabilityCost Per-capability token estimates (translation, moderation, triage, frivolity)
TenantAiUsage Per-tenant per-month usage: tokensAllotted, tokensUsed, overageTokens, overageCostZAR
AiUsageEvent Immutable audit log per AI call
Supporting enums: AiOveragePolicy (HARD_STOP/THROTTLE/SURCHARGE), AiUsageStatus (ACTIVE/SETTLED/OVERRIDDEN).

D. dWallet Models (Phase 47 — planned, NOT yet built)
Per ROADMAP.md §47: 6 new Prisma models + 4 enums, including DWallet, WalletTransaction (immutable, with balanceAfter = balanceBefore + amount invariant), DataConsent (append-only), DataRevenueStream.

3. What Tier/Plan Structures Exist?
   Tenant Tier (Platform Feature Gating)
   STANDARD → foundation (8 modules, max 5 pages)
   PREMIUM → depth (13 modules, max 15 pages)  
   ENTERPRISE → core (18 modules, unlimited pages)
   Provider Tier (Service Provider Billing)
   PROBATION → ZAR 0/mo, 3 listings max, 10% platform fee
   VERIFIED_STANDARD → ZAR 29/mo, unlimited listings, 8% platform fee
   VERIFIED_PREMIUM → ZAR 99/mo, unlimited listings, 5% platform fee
   AI Token Pool Tier Quotas (Phase 104 planned)
   STANDARD → 50,000 tokens/month, HARD_STOP overage
   PREMIUM → 200,000 tokens/month, HARD_STOP overage
   ENTERPRISE → 500,000 tokens/month, SURCHARGE overage (R0.0001/token)
   Key architectural note: The tenant tier system used by Phase 104 (Tier enum: STANDARD/PREMIUM/ENTERPRISE) is the same tier field used by feature gating, module access, and page limits. This is consistent.

4. How Does Tenant Tier Resolution Work?
   The tenant's tier is resolved by direct DB read — there is no separate billing tier resolution layer:

5. resolveGateContext() in src/entities/tenant/api/gate/gate.ts (line 111):

tier: tenant.tier // direct read from tenants table

2. Module tier gating in src/entities/tenant/lib/modules/require-module.ts:
   const TIER_ORDER: Record<TenantTier, number> = { STANDARD: 1, PREMIUM: 2, ENTERPRISE: 3 };

3. Phase 104's getTierQuota() (plan 104-02, task B3):
   // Read tenant's tier from tenants table
   // Read PlatformAiTierQuota for that tier
   // Return quota record

4. withTenant() in src/entities/tenant/api/base.ts: Returns full tenant row including tier field. Used by all API routes for tenant context.
   There is no separate billing tier determination — the tier is a static field on the Tenant record with no computed/derived logic. No upgrade/downgrade workflow exists for tenant tiers (the PATCH route in /api/admin/platform/tenants/ accepts a tier field but this is a direct admin override).

5. Are There Existing Token/Credit/Payment Tracking Mechanisms?
   No. Neither tokens nor credits exist anywhere in the codebase for tenant usage. The only payment tracking is:

- Provider billing only — PaymentTransaction table tracks real-money provider subscription payments via Paystack/PayPal. This is unrelated to AI tokens or tenant credits.
- No tenant wallet, balance, or credit ledger exists.

6. What API Routes or Admin Surfaces Exist for Billing?
   Provider-Facing (authenticated as provider):
   Route
   /api/providers/billing
   /api/providers/billing
   /api/providers/billing/subscribe
   /api/providers/billing/cancel
   /api/providers/billing/invoices
   /api/providers/billing/charges
   /api/providers/billing/fees
   Platform Admin (authenticated as admin with providers permission):
   Route
   /api/admin/transactions
   /api/admin/transactions/[id]/refund
   /api/admin/revenue/summary
   /api/admin/revenue/details

Phase 104 Planned Admin Routes (NOT yet built):
Route
/api/admin/platform/ai-pool/quotas
/api/admin/platform/ai-pool/usage
/api/admin/platform/ai-pool/usage/[tenantId]
/api/admin/platform/ai-pool/override
/api/admin/platform/ai-pool/costs
/api/admin/platform/ai-pool/status
/api/cron/ai-pool-rollover

## Widget Registrations:

Widget ID
provider-overview, provider-analytics, provider-listings, provider-inquiries, provider-reputation-progress
admin-providers
admin-ai-usage
dwallet-summary, admin-dwallet
No billing/transaction/revenue widgets exist in the dashboard widget registry.

7. Is There a Provider Billing Module?
   Yes. The file src/shared/api/provider-billing.ts (1375 lines) is the core billing module. It provides:

- getProviderBillingSnapshot() — Full billing state (subscription, tiers, fees, invoices, charges, payment history, gateway config)
- createProviderSubscriptionCheckout() — Initialize new subscription (free tier activation or paid checkout via Paystack/PayPal)
- cancelProviderSubscription() — Cancel a provider subscription
- updateProviderSubscriptionStatus() — Admin: patch subscription status
- markTransactionCompletedByReference() — Callback from payment gateway webhook
- markTransactionFailedByReference() — Callback for failed payments
- refundProviderTransaction() — Gateway-executed refund with audit trail
- getOrCreateDefaultSubscriptionTiers() — Idempotent tier seeding per tenant
  Payment gateway services live at:
- src/server/payments/paystack.ts — PaystackService
- src/server/payments/paypal.ts — PayPalService
- src/server/payments/index.ts — Barrel export

Supporting billing logic at:

- src/shared/lib/providers/billing.ts — Fee calculation, tier validation, invoice numbering, currency formatting
- src/shared/lib/providers/admin.ts — Date range parsing, refundable amount calculation, revenue grouping

8. Is dWallet Implemented or Planned?
   Planned, not implemented. dWallet is Phase 47 in the ROADMAP, elevated from M6+ (post-launch) to M5b (Anchor Tenant Launch) as a launch-blocking feature. Key facts:

- Status: Planning (2026-06-06) — CONTEXT.md exists, 6 sub-phases defined, 0 plans executed
- Models: 6 new Prisma models + 4 enums planned (DWallet, WalletTransaction, DataConsent, DataRevenueStream, etc.)
- dWallet is the privacy module — the DataConsent append-only model serves as POPIA/LGPD consent-of-record
- No overlap with Phase 104 — dWallet is about resident data rights + revenue share, not AI tokens
- Hard constraints: immutable WalletTransaction, append-only DataConsent, balanceAfter = balanceBefore + amount invariant
- Phase 47 will NOT introduce a general billing ledger — it's scoped to per-resident data monetization wallets

9. How Should Phase 104's AI Token Pool Interact with Billing?
   Key Finding: There Is No Overlap or Conflict
   Phase 104 is creating the first token/credit tracking system in the platform. The existing billing infrastructure (Provider Billing) is completely separate in domain, models, and audience. Here is the analysis:
   What Phase 104 Creates (from 104-01-PLAN.md and 104-02-PLAN.md):
1. PlatformAiTierQuota — Maps Tier enum to monthly token quotas + overage policy. This reads from the same tenants.tier field used by feature gates.
1. TenantAiUsage — Per-tenant per-month usage counter (tokensAllotted, tokensUsed, overageTokens, overageCostZAR). Unique on (tenantId, billingMonth).
1. AiUsageEvent — Immutable audit log per AI call.
1. pool.ts — Quota enforcement layer: checkQuota(), recordUsage(), getOrCreateUsage(), getTierQuota().
1. Platform admin routes (6 routes under /api/admin/platform/ai-pool/) — Read/write access to quotas, usage, overrides, costs, provider status.
1. Monthly cron rollover — /api/cron/ai-pool-rollover — Settles previous month records on the 1st.
1. admin-ai-usage widget — Tenant admin sees read-only usage bar with per-feature breakdown.

## Integration Points with Existing Infrastructure:

### Aspect Recommendation

Tenant tier lookup Use existing tenants.tier field (same Tier enum). Phase 104's getTierQuota() reads this directly — already consistent with gate.ts.
PlatformModule seed Phase 104-01 already plans a PlatformModule row (key: 'ai-provider', minTier: STANDARD, defaultEnabled: false). This hooks into the existing module gate system (isModuleEnabled).
Provider billing No integration needed. Provider billing is about service provider subscriptions (ZAR payments). AI tokens are about platform-managed API key quota for tenants. Different domain, different audience.
dWallet No integration needed. dWallet is about resident data rights + revenue share wallets. Phase 104 is about tenant AI usage quotas. No overlap.
Revenue tracking If ENTERPRISE SURCHARGE generates real costs (R0.0001/token), the existing RevenueRecord model could be extended — but Phase 104 plans do not include this. The overageCostZAR field is tracked in TenantAiUsage but there's no payment/invoice generation flow planned.
Feature gating Phase 104 uses requirePlatformAdmin (not requireAnyPermission(['providers'])). This is correct — platform admin, not tenant admin, manages AI pool.

## Gaps and Recommendations:

1. No overage billing flow exists or is planned. ENTERPRISE SURCHARGE tracks overageCostZAR in TenantAiUsage but there is no invoice generation, no payment collection, and no admin revenue reporting for AI overages. If overage billing needs to become real revenue, it will need its own charge/invoice pipeline — consider extending the existing Provider Billing patterns (PaymentTransaction, ProviderInvoice) or creating a parallel tenant billing module. This is NOT in Phase 104 scope per existing plans.
2. No tenant-facing AI usage widget for non-admins. Plan 104-03 only creates admin-ai-usage for tenant admin space. Residents have no visibility into their AI usage. This is consistent with the design (platform pool, not per-user pool).
3. No multi-tenant isolation concern. Phase 104's PlatformAiTierQuota is platform-wide (not per-tenant). The TenantAiUsage model has tenantId + RLS-safe queries. All API routes use requirePlatformAdmin guard.
4. Cron rollover is Vercel Cron only. The /api/cron/ai-pool-rollover is documented for Vercel Cron. There's no manual admin trigger or command-line fallback. This is fine per ponytail principles — add a manual trigger only when someone complains.
5. No widget-side billing integration exists for AI. There are no existing widget patterns for billing/usage dashboards. The admin-ai-usage widget in Phase 104 plan 03 will be the first usage visualization widget. It should follow the existing widget registration pattern (registry.register() in widgets.ts, lazy import, FSD feature placement at src/features/ai-provider/).

## Summary Verdict:

Phase 104 can proceed independently — it does not duplicate or conflict with any existing billing infrastructure. The Provider Billing system (Phase 46) is a separate domain for service provider subscriptions. The planned dWallet (Phase 47) is a separate domain for resident data monetization. Phase 104 is creating the first platform-level token/usage tracking system, and its design is architecturally sound:

- It reuses the existing Tier enum and tenants.tier field for quota lookup
- It reuses the PlatformModule seed pattern for capability gating
- It uses the existing requirePlatformAdmin guard pattern
- It places admin routes under the existing /api/admin/platform/ namespace
- It follows the existing widget registration pattern

The only gap: If ENTERPRISE SURCHARGE billing becomes a real revenue stream, a tenant billing pipeline (invoice generation, payment collection, revenue tracking) will need to be built. This is not scoped in Phase 104 and should be tracked as a separate phase/epic.
