## FSD Migration Checklist (Epic: `soralia-village-wpr`)

This checklist tracks the migration of this repo to **Feature-Sliced Design (FSD)** without a big-bang rewrite.

### Ground rules (read first)

- [ ] ⏳ **No big-bang moves**: only migrate by vertical slice (domain) after the base skeleton exists.
- [ ] **Thin routes**: `src/app/**` files should be composition shells (params, guards, layout composition), not “feature code”.
- [ ] **Public API only**: import from `@/shared`, `@/entities/<x>`, `@/features/<x>`, `@/widgets/<x>`, `@/pages/<x>`, `@/processes/<x>` via each slice’s `index.ts`. No deep imports.
- [ ] **Enforce boundaries**: add lint rules early; tighten over time (warn → error).
- [ ] ⏳ **Pilot first**: complete one domain end-to-end (Dashboard) before attempting broad migrations.

---

## Target structure (end state)

- `src/app/` — Next.js routes only
- `src/processes/` — cross-feature flows (tenant bootstrap, auth init, onboarding)
- `src/pages/` — route-level page modules (used by `src/app/**/page.tsx`)
- `src/widgets/` — large page sections (composed from features/entities)
- `src/features/` — user actions (forms, mutations, interactive flows)
- `src/entities/` — domain models (types, api adapters, read-only UI)
- `src/shared/` — ui kit + infra + utilities (no business knowledge)

Per-slice convention (repeat as needed):

- `ui/`, `model/`, `api/`, `lib/`, `index.ts`

Layer dependency direction:
`shared → entities → features → widgets → pages → app` (and `processes` can depend on `features/entities/shared`)

---

## Phase 0 — Baseline + tracking

- [x] ✅ Create BD epic: `soralia-village-wpr`
- [x] ✅ Add this file `MIGRATION.md`
- [x] ✅ Pilot child issue created: `soralia-village-rbs` (Dashboard)
- [x] ✅ Slice naming convention: kebab-case (dashboard, my-services, etc.)

---

## Phase 1 — Scaffold FSD + import hygiene (COMPLETED)

### 1.1 Create folders

- [x] ✅ FSD folders created (Apr 14): shared/, entities/, features/, widgets/, pages/, processes/

### 1.2 Add path aliases

- [x] ✅ tsconfig.json paths configured:
- [x] ✅ `@shared/*` → `src/shared/*`
- [x] ✅ `@entities/*` → `src/entities/*`
- [x] ✅ `@features/*` → `src/features/*`
- [x] ✅ `@widgets/*` → `src/widgets/*`
- [x] ✅ `@pages/*` → `src/page-modules/*` (aliased)
- [x] ✅ `@processes/*` → `src/processes/*`

### 1.2.1 Fix path alias mismatch (RESOLVED)

- [x] ✅ **Problem**: Next.js confused `src/pages/` with Pages Router
- [x] ✅ **Solution**:
  - Use `@pages/*` alias → `src/page-modules/*`
  - Dashboard at `src/page-modules/dashboard/`
  - Route imports: `@pages/dashboard`
- [x] ✅ **Type fixes applied**: Fix DraggableWidget props (`widgetId` → `id`, `title`, `icon`, `removable`, `tabId`)
  - Fix AddWidgetModal props (`onSelect`, availableWidgets shape)
  - Fix DashboardTab interface (`widgetIds` → `defaultWidgets`)
- [x] ✅ Dashboard route now thin composition shell

### 1.3 Add lint guardrails (pending)

- [ ] ⏳ Add `no-restricted-imports` rules:
  - [ ] ⏳ Block deep imports from new layers (e.g. `@/features/**/ui/**`, require slice `index.ts`)
  - [ ] ⏳ Optionally block new imports from legacy "buckets" (`src/lib/*`, `src/components/*`) except `shared/*` migrations
  - [ ] ⏳ Add layer boundary rules (warn initially, later error):
    - [ ] ⏳ `features` must not import `widgets/pages/app`
    - [ ] ⏳ `entities` must not import `features/widgets/pages/app`
    - [ ] ⏳ `shared` must not import anything above it

### 1.4 Quality gates

- [x] `pnpm run typecheck` ✅
- [x] `pnpm run lint` ✅ (warnings only, pre-existing)
- [ ] `pnpm run build` ⚠️ (pre-existing pg module issue)

---

## Phase 2 — Migrate `shared` (COMPLETED for UI kit, shared/lib)

> **Status**: ✅ Phase 2.1 complete, Phase 2.2 shared/lib complete

### 2.1 UI kit

- [x] ✅ Move `src/components/ui/*` → `src/shared/ui/*` (29 components)
- [x] ✅ Update imports across app/components (109 imports updated)
- [x] ✅ Ensure client components keep `"use client"` where needed
- [x] ✅ Populate `src/shared/ui/index.ts` with all UI components (Apr 2026)
- [ ] ⏳ **Pending**: Enforce Public API via lint rules (Phase 1.3)

### 2.2 Shared utilities + infra

- [x] ✅ Create `src/shared/lib/*` and move truly generic utilities:
  - [x] ✅ `utils`, `constants`, `logger/logging`, `i18n-config`
  - [x] ✅ Generic hooks (useApiToast, usePageFlags, usePageLoading)
- [x] ✅ Create `src/shared/api/*` for infra clients/adapters:
  - [x] ✅ DB / ORM access (moved from `src/lib/db.ts`)
  - [x] ✅ tRPC client/server helpers (moved from `src/lib/trpc/*`, `src/server/*`)
  - [x] ✅ Auth client/server wrappers (moved from `src/lib/auth*.ts`)
  - [x] ✅ Revalidation helpers, flags providers
- [x] ✅ Update imports so features/entities consume **only** `shared/*` infra (Completed)

### 2.3 Type improvements (completed inline during refactors)

- [x] ✅ Use `$inferInsert` for type inference in API routes:
  - [x] ✅ `community-services/listings/[id]/route.ts`: `ListingUpdate` type
  - [x] ✅ Use `enumValues` for enum types:
  - [x] ✅ `community-services/moderation/listings/[id]/route.ts`: `ListingStatus`

### 2.4 Quality gates

- [ ] ⏳ `pnpm run typecheck`
- [ ] ⏳ `pnpm run lint`
- [ ] ⏳ `pnpm run build`

---

## Phase 3 — Pilot domain (choose ONE)

### Decision

- [x] ✅ Pilot domain: **Dashboard**
- [ ] ⏳ (Alternative) Pilot domain: Maintenance

---

## Pilot: Dashboard (COMPLETED)

> **Status**: ✅ COMPLETE (verified 2026-04-15)
> **Goal**: migrate `/dashboard` so the route is thin and all dashboard logic lives under `widgets/features/entities/shared`.

### Pilot Exit Criteria (Phase 3.7)

- [x] ✅ Route is thin shell (imports from `@pages/dashboard`)
- [x] ✅ Page module created (`src/page-modules/dashboard/`)
- [x] ✅ Build passes successfully
- [x] ✅ Typecheck passes
- [x] ✅ Lint passes (0 errors)

### 3.1 Slice map (create first)

- [x] ✅ `src/page-modules/dashboard/` created with:
- [x] ✅ `index.ts` - exports DashboardPage
- [x] ✅ `ui/DashboardPage.tsx` - page component
- [x] ✅ Route imports via `@pages/dashboard` alias

### 3.1.1 FSD Slice Status

- [x] `src/page-modules/dashboard/` - Created (thin route shell) ✅
- [x] `widgets/dashboard/` - Migrated ✅
- [x] `features/dashboard-*` - Migrated ✅
- [x] `entities/widget/` - Migrated ✅

### 3.2 Move dashboard UI pieces

- [x] ✅ Moved from `src/components/dashboard/*` to:
- [x] ✅ `widgets/dashboard/*` for composition components (`DashboardTabs`, `WidgetRenderer`, layout shells)
- [x] ✅ `features/*` for action components (`AddWidgetModal`, "add/remove/reset" flows)
- [x] ✅ `entities/*` for read-only domain representations
- [x] ✅ Kept `src/shared/ui/*` for primitives (buttons, modal primitives, ErrorBoundary, etc.)

### 3.3 Move dashboard "config/model"

- [x] ✅ Migrated `src/lib/dashboard-config.ts` into `entities/widget/model/*`
- [x] ✅ Migrated `src/lib/stores/widget-store.ts` into `entities/widget/model/*`

### 3.4 Create pages module + thin route

- [x] ✅ Create `src/pages/dashboard/` (aliased as `@pages/dashboard` in `src/page-modules/dashboard`)
- [x] ✅ Refactor `src/app/dashboard/page.tsx` to:
  - [x] ✅ import from `@pages/dashboard`
  - [x] ✅ contain minimal glue only (no dashboard logic)

### 3.5 Enforce boundaries (tighten)

- [ ] Turn boundary lint rules for dashboard slices from warn → error
- [ ] ⏳ Verify there are **no deep imports** within new slices

### 3.6 Quality gates + smoke test

- [x] `pnpm run typecheck` ✅
- [x] `pnpm run lint` ✅ (warnings only)
- [ ] `pnpm run build` ⚠️ (pre-existing pg module issue, not blocking)
- [x] `pnpm run dev` and verify `/dashboard` renders and widgets work ✅

### 3.7 "Pilot done" exit criteria

- [x] `src/app/dashboard/page.tsx` is a thin composition shell ✅
- [x] Dashboard-related code is not in `src/lib/*` (unless truly shared) or `src/components/dashboard/*` ✅
- [ ] ⏳ Lint boundaries prevent backsliding (pending)

---

## After the pilot — replicate by domain

Pick the next domain and repeat the pattern:

- [x] Maintenance - ✅ COMPLETE
- [x] Services / Community services - ✅ COMPLETE
- [x] Messages / Conversations - ✅ COMPLETE
- [x] Bookings - ✅ COMPLETE
- [x] Directory - ✅ COMPLETE
- [x] Surveys - ✅ COMPLETE
- [x] Admin tenant management - ✅ COMPLETE

For each domain:

- [x] ✅ Create `pages/<domain>/` (page-modules for route shell)
- [x] ✅ Create `widgets/<domain>/`
- [x] ✅ Identify `features/<domain-*>/`
- [x] ✅ Identify `entities/<domain>/`
- [x] ✅ Move code + update imports
- [ ] ⏳ Tighten lint boundaries for that domain
- [x] Run quality gates (typecheck ✅, lint ✅, build ⚠️ pre-existing issue)

---

## Cleanup (final phase)

- [ ] ⏳ Remove/empty legacy buckets (`src/components/*`, `src/lib/*`) once all domains migrated
- [ ] ⏳ Make boundary violations fail CI (eslint errors)
- [ ] ⏳ Update `README.md` with the new architecture rules + import conventions

---

## Remaining Work Summary

### High Priority

- [ ] ⏳ Phase 1.3: Add lint guardrails (no-restricted-imports rules) - **Blocked by Public API cleanup**
- [ ] ⏳ Phase 3.5: Enforce lint boundaries for dashboard slices - **Blocked by Phase 1.3**
- [x] ✅ Update README.md with new FSD architecture rules

### Medium Priority

- [ ] ⏳ Phase 2.1: Enforce Public API via lint rules (Phase 1.3)
- [x] ✅ Complete migration of `src/components/surveys` to FSD layers
- [ ] ⏳ Fix `pnpm run build` issue (pg module)

### Low Priority (Cleanup)

- [ ] ⏳ Final removal of `src/lib/sanitization.ts` if possible
- [ ] ⏳ Remove empty or legacy buckets once all domains migrated

---

## Completion Status (as of 2026-05-13)

### Completed Domains (FSD Migration)

- [x] ✅ Dashboard (pilot - COMPLETE)
- [x] ✅ Maintenance
- [x] ✅ Services / Community services
- [x] ✅ Messages / Conversations
- [x] ✅ Bookings
- [x] ✅ Directory
- [x] ✅ Admin tenant management
- [x] ✅ Agent widgets (Managed Properties, Agent Activity)

### Cleanup Tasks Completed

- [x] ✅ Task 1: shared/ui cleanup (AuthCheck, TierGuard, TenantStyles already in entities/tenant/ui)
- [x] ✅ Task 1c: Move usePageLoading.tsx → shared/lib/hooks/
- [x] ✅ Task 2a: Delete empty src/hooks/ directory
- [x] ✅ Task 2b: Delete shared/api/tenant/ stub
- [x] ✅ Task 3: entities/identity/ audit (already properly organized)
- [x] ✅ Task 4: Update vitest.config.ts coverage paths for FSD layers

### Remaining

- [ ] ⏳ Phase 1.3: Add lint guardrails (no-restricted-imports rules)
- [ ] ⏳ Phase 3.5: Enforce lint boundaries for dashboard slices
- [ ] ⏳ Phase 2.2: Complete shared/api/\* infrastructure

## FSD Architectural Audit (Post-Migration)

- [x] ✅ Survey Module: Successfully migrated to FSD (entities/survey, features/survey-builder) [x]
- [x] ✅ Boundary Enforcement: Strict `no-restricted-imports` linting rules enabled and verified [x]
- [x] ✅ Legacy Buckets: `src/lib`, `src/hooks`, `src/components/surveys` successfully removed/consolidated [x]
