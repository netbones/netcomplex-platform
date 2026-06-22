# 46-03 Summary — Provider Billing, Subscription & Credits Slice

## Status

**Partially complete, production-minded slice delivered.**

This implementation delivers a coherent provider billing foundation inside the Phase 46 worktree:

- provider billing dashboard and subscription flows
- Paystack / PayPal service wrappers with webhook signature verification scaffolding
- explicit Paystack verify and PayPal capture completion routes for redirect-based payment finalization
- DB-backed subscription tiers, transactions, charges, invoices, revenue records, and provider credit views
- fee calculation and transaction persistence
- provider-facing billing, charges, invoices, fees, and credit APIs
- cancellation / completion / failure lifecycle updates across subscription + transaction + charge state

It intentionally stops short of pretending unsupported remote payment behavior is fully live.

## What changed

### 1. Billing data model completed

Added persistent billing support tables and enums:

- `src/db/schema/provider-charge-status-enum.ts`
- `src/db/schema/invoice-status-enum.ts`
- `src/db/schema/provider-charges.ts`
- `src/db/schema/provider-invoices.ts`

Wired them into schema / DB export surfaces:

- `src/db/index.ts`
- `src/db/schema/schema.ts`
- `src/shared/api/db.ts`
- `src/shared/api/server/index.ts`

### 2. Billing orchestration hardened

Extended `src/shared/api/provider-billing.ts` to:

- seed default provider tiers per tenant
- create pending or paid `providerCharges` when subscriptions are initialized
- create paid `providerInvoices` for completed/free transactions
- keep `paymentTransactions`, `providerSubscriptions`, `providerCharges`, and `revenueRecords` aligned
- mark pending transactions/charges failed on subscription cancellation
- mark failed transactions as subscription expiry events
- prefer persisted invoices/charges in billing snapshots while falling back to derived transaction views for older rows

### 3. Provider APIs and dashboard slice integrated

Billing / credit APIs in this slice:

- `src/app/api/providers/billing/route.ts`
- `src/app/api/providers/billing/subscribe/route.ts`
- `src/app/api/providers/billing/cancel/route.ts`
- `src/app/api/providers/billing/invoices/route.ts`
- `src/app/api/providers/billing/charges/route.ts`
- `src/app/api/providers/billing/fees/route.ts`
- `src/app/api/providers/credits/route.ts`
- `src/app/api/providers/credits/history/route.ts`
- `src/app/api/payments/paystack/webhook/route.ts`
- `src/app/api/payments/paystack/verify/route.ts`
- `src/app/api/payments/paypal/webhook/route.ts`
- `src/app/api/payments/paypal/capture/route.ts`

Provider UI delivered / finalized:

- `src/app/(tenant)/dashboard/providers/billing/page.tsx`
- `src/components/providers/BillingDashboard.tsx`
- `src/components/providers/PaymentSetupModal.tsx`
- `src/components/providers/CreditProgressWidget.tsx`
- `src/components/providers/types.ts`
- `src/widgets/dashboard/ui/ProvidersLayer.tsx`

### 4. Payment wrappers and helper coverage improved

- `src/server/payments/paystack.ts`
- `src/server/payments/paypal.ts`
- `src/server/payments/index.ts`
- `src/shared/lib/providers/billing.ts`
- `src/shared/lib/providers/billing.test.ts`
- `src/server/payments/paystack.test.ts`

Notable hardening:

- Paystack signature verification now safely rejects malformed-length signatures before `timingSafeEqual`
- payment setup now passes a concrete callback URL from the billing page
- invoice rows in UI surface download links when available and clearly indicate deferred PDF storage otherwise

## Validation

### Passed

File-scoped diagnostics were run and returned clean for:

- `src/shared/api/provider-billing.ts`
- `src/shared/api/db.ts`
- `src/shared/api/server/index.ts`
- `src/db/index.ts`
- `src/db/schema/schema.ts`
- `src/db/schema/provider-charges.ts`
- `src/db/schema/provider-invoices.ts`
- `src/components/providers/BillingDashboard.tsx`
- `src/components/providers/PaymentSetupModal.tsx`
- `src/server/payments/paystack.ts`
- `src/server/payments/paystack.test.ts`
- `src/shared/lib/providers/billing.test.ts`

### Passed

Focused `vitest` execution passed for:

- `src/shared/lib/providers/billing.test.ts`
- `src/server/payments/paystack.test.ts`

Executed with the main checkout's installed Vitest binary against the Phase 46 worktree root:

- `/home/ubuntupunk/Projects/soralia-village/node_modules/.bin/vitest run --root /home/ubuntupunk/Projects/soralia-village.phase-46-provider-platform --config /home/ubuntupunk/Projects/soralia-village.phase-46-provider-platform/vitest.config.ts ...`

## Deviations / deliberate deferrals

These are intentionally deferred for **46-04** or a follow-up billing hardening slice:

1. **True remote recurring subscriptions**
   - no persisted remote Paystack / PayPal subscription identifiers yet
   - cancel flows update local state correctly, but remote recurring cancellation remains scaffolded / deferred

2. **Invoice PDF generation + storage**
   - invoice rows are persisted
   - `pdfUrl` remains nullable until storage / document generation is wired

3. **Gateway callback / capture coverage is now partially closed**
   - provider subscription init is live from `/api/providers/billing/subscribe`
   - webhook verification and local completion/failure handling are implemented
   - `GET /api/payments/paystack/verify` and `POST /api/payments/paypal/capture` now finalize redirect-based flows
   - recurring remote subscription lifecycle remains deferred

4. **Admin revenue management endpoints**
   - revenue persistence exists via `revenueRecords`
   - admin reporting routes were not added in this slice

## Notes for 46-04

Recommended next step:

- persist remote order / customer / subscription identifiers in billing tables
- add explicit verify / capture endpoints for redirect-based completion flows
- wire invoice PDF generation/storage
- add admin revenue summary/reporting endpoints on top of `revenueRecords`
- add integration tests once worktree-local Vitest resolution is stable

## Post-completion MITIGATIONS

The following fixes were applied after the 46-03 feature implementation was complete:

1. **Schema FK relations & Prisma models** (`bf723784`)
   - `provider_charges` and `provider_invoices` tables were Drizzle-only during implementation; migration `20260622000000_add_provider_fk_relations` now creates them in Prisma schema and DB with full `@relation` directives, FK constraints (`ON DELETE CASCADE`), and enums (`ProviderChargeStatus`, `InvoiceStatus`)
   - Billing FK chains (`provider_subscriptions.tierId → subscription_tiers.id`, `payment_transactions.subscriptionId → provider_subscriptions.id`, `provider_charges.subscriptionId → provider_subscriptions.id`, `provider_invoices.subscriptionId → provider_subscriptions.id`, `revenue_records.transactionId → payment_transactions.id`) all now have explicit Prisma `@relation` directives
   - `PaymentTransaction.externalRef` typo fixed (`external_ref进項` → `external_ref`)
