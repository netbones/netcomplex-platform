# REST → tRPC Phase 2: Complex Widgets + Admin Router

## Background

Phase 1 migrated 10 widgets. Phase 2 covered the remaining complex widgets and the **new admin tRPC router** (billing, subscriptions, activity). This maps to BD issue `soralia-village-xy3x`.

**Pattern**: All migrated widgets import `trpc` from `@api/client` and call `trpc.<router>.<procedure>.useQuery()` / `.useMutation()`.

---

## Proposed Changes

### A — New Admin tRPC Router ✅ DONE

Three widgets currently hit `/api/admin/platform/billing/*` and `/api/admin/activity` REST routes with no tRPC equivalent.

#### ✅ [DONE] `src/server/routers/admin/billing.ts`

Three procedures using `adminProcedure` (guards `ADMIN | BOARD` roles):

- ✅ `getRevenue` — replaces `AdminRevenueWidget` → `/api/admin/platform/billing/payments?status=COMPLETED&limit=100`
  - Aggregates 6-month monthly gross/net/fees from payments table
  - Returns `{ monthlyRevenues, totalRevenue, averageMonthly, totalPlatformFees }`
- ✅ `getBillingOverview` — replaces `AdminBillingOverviewWidget` → `/api/admin/platform/billing/subscriptions` + `/api/admin/platform/billing/plans`
  - Returns `{ mrr, activeCount, tierDistribution, trialConversions, churnRate }`
- ✅ `listSubscriptions` — replaces `AdminSubscriptionsWidget` → `/api/admin/platform/billing/subscriptions?status=&search=`
  - Input: `{ status?: string, search?: string }`
  - Returns `SubscriptionView[]`

#### ✅ [DONE] `src/server/routers/admin/activity.ts`

One procedure using `adminProcedure`:

- ✅ `listActivity` — replaces `AdminActivityStream` → `/api/admin/activity?domain=&limit=20&cursor=`
  - Input: `{ domain: string, limit?: number, cursor?: string }`
  - Returns `{ items: ActivityItem[], nextCursor: string | null }`

#### ✅ [DONE] `src/server/routers/admin/index.ts`

Barrel exporting `adminBillingRouter` and `adminActivityRouter`.

#### ✅ [DONE] `src/server/routers/index.ts`

Add `admin: adminRouter` to `appRouter`.

---

### B — Widget Migrations (use existing tRPC procedures)

#### ✅ [DONE] `AchievementsWidget.tsx`

**Current**: `fetch('/api/achievements')` → maps to `body.data`  
**tRPC gap**: `achievements.listAchievements` + `achievements.getUnlocked` already exist.  
**Migration**: Replace `useEffect` + `fetch` with two `trpc.achievements.*` queries. Combine results client-side: merge `listAchievements` (all defs) + `getUnlocked` (unlocked keys) to produce `{ ...def, unlocked: true/false }` array. Drop `useEffect`, `useState` for achievements/loading/error.

#### ✅ [DONE] `AgentWidget.tsx`

**Current**: `useApiToast` + `fetch('/api/agents/marketplace')` + `fetch('/api/agents/connect', {POST})`  
**tRPC gap**: `agents.getMarketplaceActions` (query) + `agents.connectWithAgent` (mutation) already exist.  
**Migration**: Replace `fetchAgentData`/`apiFetch` with `trpc.agents.getMarketplaceActions.useQuery()`. Replace `connectWithAgent`/`apiMutate` with `trpc.agents.connectWithAgent.useMutation()`.

#### ✅ [DONE] `MyHomeSpace.tsx`

**Current**: `fetch('/api/users/[id]')` (GET) + `fetch('/api/users/[id]', {PATCH})`  
**tRPC gap**: Need `identity.getMyProfile` (GET) + `identity.updateMyProfile` (PATCH).  
**Check existing**: `identityRouter` already exists — added `getMyProfile`/`updateMyProfile` procedures.

#### ✅ [DONE] `PremiumPortfolioWidget.tsx`

**Current**: `useApiToast` + `fetch('/api/premium/portfolio')` + `fetch('/api/users/[id]')` + `fetch('/api/premium/portfolio', {POST})`  
**Migration**: Replaced with `trpc.marketplace.getPortfolio.useQuery()` + `trpc.marketplace.activatePremiumSeat.useMutation()` + `utils.marketplace.getPortfolio.invalidate()`. Added `fetchFullPortfolio` helper in `premium.ts`. Note: the embedded `AgentWidget` is not yet migrated (separate item above).

#### ✅ [DONE] `usePremiumListings` hook

**Current**: Raw `fetch('/api/premium/listings')` via `useQuery`  
**Migration**: Swapped to `trpc.marketplace.listPremiumListings.useQuery()`. Exposes `{ data, refetch, isLoading }` — preserves consumer interface.

#### ✅ [DONE] `AdminActivityStream.tsx`

Router exists. Migration: replace `fetchActivity` with `trpc.admin.activity.listActivity.useQuery({ domain, limit: 20 })`.

#### ✅ [DONE] `AdminRevenueWidget.tsx`

Router exists. Migration: swap `queryFn: fetchRevenue` to `trpc.admin.billing.getRevenue.useQuery()`.

#### ✅ [DONE] `AdminBillingOverviewWidget.tsx`

Router exists. Migration: replace two `useQuery` calls with single `trpc.admin.billing.getBillingOverview.useQuery()`.

#### ✅ [DONE] `AdminSubscriptionsWidget.tsx`

Router exists. Migration: swap to `trpc.admin.billing.listSubscriptions.useQuery({ status, search })`.

---

### C — Disputes: Multi-Status Support ✅ DONE

#### ✅ [DONE] `src/server/routers/operations/disputes.ts`

**Current**: `ListDisputesInput` accepts only `status: z.string().optional()` — single value only.  
**Migration**: Change `status` to `z.union([z.string(), z.array(z.string())]).optional()`, coerce to array, then `inArray(disputeCases.status, statuses)`.

#### ✅ [DONE] `MyDisputesWidget.tsx`

Replace active count effect with `trpc.disputes.listDisputes.useQuery({ status: ['SUBMITTED', 'UNDER_REVIEW', 'MEDIATION_ACTIVE', 'MEDIATION_OFFERED'], limit: 1 })`.

---

### D — `HomeLayer` (deferred / Phase 3 candidate) ⏸

`HomeLayer` uses `Promise.all` with 10+ fetches. Deferred to Phase 3.

---

### E — API Deprecation Tags (Phase 4 prep) ❌ PENDING

---

## Execution Order — Final

1. ✅ ~~Verify identity router~~ — done (added getMyProfile/updateMyProfile)
2. ✅ ~~Create admin router~~ — `admin/billing.ts`, `admin/activity.ts`, `admin/index.ts`
3. ✅ ~~Wire admin router~~ — updated `src/server/routers/index.ts`
4. ✅ ~~Create premium router~~ — `marketplace/premium.ts` (listPremiumListings, getPortfolio, activatePremiumSeat)
5. ✅ ~~PremiumPortfolioWidget~~ — migrated
6. ✅ ~~usePremiumListings hook~~ — migrated
7. ✅ ~~AchievementsWidget~~ — migrated
8. ✅ ~~AgentWidget~~ — migrated
9. ✅ ~~Admin widgets (Activity, Revenue, BillingOverview, Subscriptions)~~ — migrated
10. ✅ ~~MyHomeSpace~~ — added identity procedures, migrated
11. ✅ ~~MyDisputesWidget + disputes multi-status schema~~ — migrated
12. ⏸ HomeLayer (Phase 3)
13. ❌ API deprecation sweep (Phase 4)

---

## Open Questions

> ~~**Q1**: Does `identity.ts` already have user profile GET/PATCH?~~ → Added `getMyProfile`/`updateMyProfile` procedures.

> ~~**Q2**: For `AdminActivityStream` load-more with cursor — use `useInfiniteQuery` or manual state?~~ → Used manual state.

> ✅ ~~**Q3** (resolved): `usePremiumListings` hook hits `/api/premium/listings`.~~ → Migrated to `trpc.marketplace.listPremiumListings`.

---

## Verification

- `npx tsc --noEmit` passes with only pre-existing errors (unrelated files)
- All 11 migration commits pushed to both remotes
- Pre-commit hooks pass (eslint, prettier, redocly lint)
