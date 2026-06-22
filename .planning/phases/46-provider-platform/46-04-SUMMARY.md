# 46-04 Summary — Admin Provider Moderation, Revenue Analytics, and Oversight

## Status

**Substantially complete with narrower remaining limitations:** gateway-executed refunds are now implemented for Paystack transactions and for PayPal transactions that have a persisted capture ID. The main remaining refund limitation is legacy PayPal transactions that were completed before capture IDs were stored.

## What changed

### Admin moderation pages and navigation

Added a navigable admin surface under `src/app/(tenant)/dashboard/admin/`:

- `layout.tsx` — simple provider-admin nav and role gate
- `providers/page.tsx` — provider moderation dashboard
- `providers/[id]/page.tsx` — provider detail / action console
- `revenue/page.tsx` — revenue and fee analytics dashboard
- `analytics/page.tsx` — provider ecosystem metrics dashboard
- `transactions/page.tsx` — transaction oversight / refund review queue
- `settings/page.tsx` — provider registration mode management

### Admin components

Added focused admin UI components in `src/components/admin/`:

- `ProviderModerationDashboard.tsx`
- `ProviderDetailView.tsx`
- `VerificationQueue.tsx`
- `RevenueDashboard.tsx`
- `RevenueChart.tsx`
- `TransactionDashboard.tsx`
- `RefundModal.tsx`
- `ProviderAnalyticsDashboard.tsx`
- `adminApi.ts`
- `types.ts`

### Admin APIs

Added/extended admin APIs:

- `src/app/api/admin/providers/route.ts`
  - paginated provider list
  - status/search filtering
  - provider counts
  - aggregated revenue + platform fee totals
- `src/app/api/admin/providers/[id]/route.ts`
  - provider profile, verification, legal, credit history, payments, subscriptions, revenue summary, activity timeline
- `src/app/api/admin/providers/[id]/verify/route.ts`
  - explicit verify endpoint for admin moderation UI
- `src/app/api/admin/providers/[id]/suspend/route.ts`
  - suspend and reinstate support
- `src/app/api/admin/providers/[id]/credits/route.ts`
  - manual credit adjustments and optional verification override
- `src/app/api/admin/analytics/providers/route.ts`
  - provider ecosystem metrics, verification rate, credit averages, registration timeline, gateway distribution
- `src/app/api/admin/revenue/summary/route.ts`
  - revenue KPIs, fee totals, timeline grouping, gateway health signal, tier/gateway breakdowns
- `src/app/api/admin/revenue/details/route.ts`
  - detailed transaction list with fee breakdown
- `src/app/api/admin/transactions/route.ts`
  - transaction oversight view + refundable exposure summary
- `src/app/api/admin/transactions/[id]/refund/route.ts`
  - refund eligibility validation + manual reconciliation logging
- `src/app/api/admin/tenant/provider-registration-mode/route.ts`
  - now returns gateway readiness / payment settings unlock status
  - now audit-logs mode changes

### Existing route extensions

Updated existing moderation routes to emit audit-log entries:

- `src/app/api/admin/providers/[id]/approve/route.ts`
- `src/app/api/admin/providers/[id]/reject/route.ts`

### Audit and helper support

- Extended `src/shared/api/audit-log.ts` with provider moderation / refund / registration mode actions
- Added `src/shared/lib/providers/admin.ts` for focused admin-side helper logic
- Added `src/shared/lib/providers/admin.test.ts`

## Key behavioral outcomes

- Admins/board can review all providers with moderation filters and revenue visibility.
- Admin detail view shows due diligence, legal acceptance, credits, payments, and action controls.
- Admins can verify, reject, suspend/reinstate, and adjust credits.
- Tenant registration mode can be toggled between `OPEN` and `INVITATION_ONLY` with gateway readiness shown in the response/UI.
- Revenue dashboards now expose platform-fee and processor-fee breakdowns, gateway split, and tier split.
- Transaction oversight is now available, with gateway refund execution and audit logging.

## Intentional deviations / limitations

1. **Refund execution still has one PayPal edge-case limitation**
   - The admin refund API now calls Paystack and PayPal refund operations.
   - PayPal refunds require a persisted remote capture ID; newly completed PayPal transactions now store that via webhook/capture completion, but older transactions created before that change may still require manual handling.

2. **Gateway health is inferred, not actively probed**
   - Health status is derived from environment configuration plus recent transaction outcomes.
   - No live operational health probe/dashboard exists yet.

3. **Verification history is timeline-based, not backed by a dedicated history table**
   - The provider detail view surfaces the current verification state plus activity timeline context.
   - A full immutable verification-history table is still future work if needed.

## Focused validation

### Passed

Ran file-scoped diagnostics on the touched admin/shared files, including:

- `src/shared/lib/providers/admin.ts`
- `src/app/api/admin/providers/route.ts`
- `src/app/api/admin/providers/[id]/route.ts`
- `src/app/api/admin/providers/[id]/verify/route.ts`
- `src/app/api/admin/providers/[id]/suspend/route.ts`
- `src/app/api/admin/providers/[id]/credits/route.ts`
- `src/app/api/admin/analytics/providers/route.ts`
- `src/app/api/admin/revenue/summary/route.ts`
- `src/app/api/admin/revenue/details/route.ts`
- `src/app/api/admin/transactions/route.ts`
- `src/app/api/admin/transactions/[id]/refund/route.ts`
- `src/app/api/admin/tenant/provider-registration-mode/route.ts`
- all newly added admin component/page files under `src/components/admin/` and `src/app/(tenant)/dashboard/admin/`

All checked files reported **no diagnostics**.

### Additional targeted tests passed

Focused Vitest execution now works when run with the main checkout's installed Vitest binary against the Phase 46 worktree root. The following targeted suites passed during gap closure validation:

- `src/server/payments/paystack.test.ts`
- `src/shared/lib/providers/billing.test.ts`

(`src/shared/lib/providers/admin.test.ts` was not rerun in this gap-closure pass.)

## Remaining blockers for full Phase 46 verification

- Add a persisted verification / moderation event table if deeper audit-history requirements emerge during milestone verification.
- If full PayPal refund coverage for older transactions is required, backfill or persist remote capture IDs for pre-gap-closure payments.
- Add active gateway health probes if operational monitoring needs to move beyond inferred status.

## Post-completion MITIGATIONS

The following fixes were applied after the 46-04 feature implementation was complete:

1. **Schema FK relations & Prisma models** (`bf723784`)
   - Admin-facing tables (`provider_charges`, `provider_invoices`, `revenue_records`, `payment_transactions`) were Drizzle-only during implementation; migration `20260622000000_add_provider_fk_relations` now creates them in Prisma schema and DB with full `@relation` directives, FK constraints (`ON DELETE CASCADE`), and required enums
   - All FK chains referenced by admin APIs (transaction → subscription → tier, charge → subscription, invoice → subscription, revenue → transaction) now have explicit Prisma `@relation` directives
   - `PaymentTransaction.externalRef` typo fixed (`external_ref进項` → `external_ref`)
   - `ProviderVerification.providerId` column renamed from camelCase to snake_case (`provider_id`)
