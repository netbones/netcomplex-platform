# 46-04 Summary — Admin Provider Moderation, Revenue Analytics, and Oversight

## Status

**Substantially complete with one intentional deviation:** the refund flow is implemented as **validated manual review** rather than live gateway-executed refunds, because the existing Paystack/PayPal service layer in this branch does not yet expose refund operations.

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
- Transaction oversight is now available, with safe refund review logging.

## Intentional deviations / limitations

1. **Refund execution is manual-review only in this phase**
   - The admin refund API validates the requested amount and logs a reconciliation record/reference.
   - It does **not** call Paystack or PayPal refund APIs because those capabilities are not implemented in the current payment service layer.

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

### Could not run

Attempted focused Vitest execution for:

- `src/shared/lib/providers/admin.test.ts`

but the worktree environment currently does not expose a runnable `vitest` binary (`sh: 1: vitest: not found`).

## Remaining blockers for full Phase 46 verification

- Install/restore runnable local test binaries in the worktree so targeted Vitest execution can run.
- Add real payment-gateway refund operations if live refund processing is required for phase acceptance.
- Add a persisted verification / moderation event table if deeper audit-history requirements emerge during milestone verification.
