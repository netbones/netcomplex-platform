## FSD Migration Checklist (Epic: `soralia-village-wpr`)

This checklist tracks the migration of this repo to **Feature-Sliced Design (FSD)** without a big-bang rewrite.

### Ground rules (read first)

- [ ] **No big-bang moves**: only migrate by vertical slice (domain) after the base skeleton exists.
- [ ] **Thin routes**: `src/app/**` files should be composition shells (params, guards, layout composition), not “feature code”.
- [ ] **Public API only**: import from `@/shared`, `@/entities/<x>`, `@/features/<x>`, `@/widgets/<x>`, `@/pages/<x>`, `@/processes/<x>` via each slice’s `index.ts`. No deep imports.
- [ ] **Enforce boundaries**: add lint rules early; tighten over time (warn → error).
- [ ] **Pilot first**: complete one domain end-to-end (Dashboard) before attempting broad migrations.

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

- [x] Create BD epic: `soralia-village-wpr`
- [x] Add this file `MIGRATION.md`
- [x] Pilot child issue created: `soralia-village-rbs` (Dashboard)
- [x] Slice naming convention: kebab-case (dashboard, my-services, etc.)

---

## Phase 1 — Scaffold FSD + import hygiene (no behavior changes)

### 1.1 Create folders

- [x] FSD folders created (Apr 14): shared/, entities/, features/, widgets/, pages/, processes/

### 1.2 Add path aliases

- [x] tsconfig.json paths configured:
  - [x] `@shared/*` → `src/shared/*`
  - [x] `@entities/*` → `src/entities/*`
  - [x] `@features/*` → `src/features/*`
  - [x] `@widgets/*` → `src/widgets/*`
  - [x] `@pages/*` → `src/pages/*`
  - [x] `@processes/*` → `src/processes/*`

### 1.2.1 Fix path alias mismatch (RESOLVED)

- [x] **Problem**: Next.js confused `src/pages/` with Pages Router
- [x] **Solution**:
  - Use `@pages/*` alias → `src/page-modules/*`
  - Dashboard at `src/page-modules/dashboard/`
  - Route imports: `@pages/dashboard`
- [x] **Type fixes applied**:
  - Fix DraggableWidget props (`widgetId` → `id`, `title`, `icon`, `removable`, `tabId`)
  - Fix AddWidgetModal props (`onSelect`, availableWidgets shape)
  - Fix DashboardTab interface (`widgetIds` → `defaultWidgets`)
- [x] Dashboard route now thin composition shell

### 1.3 Add lint guardrails (start simple)

- [ ] Add `no-restricted-imports` rules:
  - [ ] Block deep imports from new layers (e.g. `@/features/**/ui/**`, require slice `index.ts`)
  - [ ] Optionally block new imports from legacy “buckets” (`src/lib/*`, `src/components/*`) except `shared/*` migrations
- [ ] Add layer boundary rules (warn initially, later error):
  - [ ] `features` must not import `widgets/pages/app`
  - [ ] `entities` must not import `features/widgets/pages/app`
  - [ ] `shared` must not import anything above it

### 1.4 Quality gates

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run build`

---

## Phase 2 — Migrate `shared` (mechanical moves, biggest payoff)

> **Status**: Not started - awaiting Phase 1 completion

### 2.1 UI kit

- [ ] Move `src/components/ui/*` → `src/shared/ui/*`
- [ ] Update imports across app/components accordingly
- [ ] Ensure client components keep `"use client"` where needed

### 2.2 Shared utilities + infra

- [ ] Create `src/shared/lib/*` and move truly generic utilities:
  - [ ] `utils`, `constants`, `logger/logging`, `i18n-config`, generic hooks
- [ ] Create `src/shared/api/*` for infra clients/adapters:
  - [ ] DB / ORM access (currently `src/lib/db.ts`)
  - [ ] tRPC client/server helpers (currently `src/lib/trpc/*`, `src/server/*`)
  - [ ] Auth client/server wrappers (currently `src/lib/auth*.ts`)
  - [ ] Revalidation helpers, flags providers
- [ ] Update imports so features/entities consume **only** `shared/*` infra

### 2.3 Type improvements (completed inline during refactors)

- [x] Use `$inferInsert` for type inference in API routes:
  - [x] `community-services/listings/[id]/route.ts`: `ListingUpdate` type
  - [x] Use `enumValues` for enum types:
  - [x] `community-services/moderation/listings/[id]/route.ts`: `ListingStatus`

### 2.3 Quality gates

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run build`

---

## Phase 3 — Pilot domain (choose ONE)

### Decision

- [x] Pilot domain: **Dashboard**
- [ ] (Alternative) Pilot domain: Maintenance

---

## Pilot: Dashboard (end-to-end slice migration)

> **Status**: Mostly Complete (soralia-village-rbs)
> **Goal**: migrate `/dashboard` so the route is thin and all dashboard logic lives under `widgets/features/entities/shared`.
> **Note**: Basic structure done; widgets/features slices pending for future phases.

### Pilot Exit Criteria (Phase 3.7)

- [x] Route is thin shell (imports from `@pages/dashboard`)
- [x] Page module created (`src/page-modules/dashboard/`)
- [x] Build passes successfully
- [x] Typecheck passes
- [x] Lint passes (0 errors)

### 3.1 Slice map (create first)

- [x] `src/page-modules/dashboard/` created with:
  - [x] `index.ts` - exports DashboardPage
  - [x] `ui/DashboardPage.tsx` - page component
- [x] Route imports via `@pages/dashboard` alias

### 3.1.1 FSD Slice Status

- [x] `src/page-modules/dashboard/` - Created (thin route shell) ✅
- [ ] `widgets/dashboard/` - NOT YET (future phase)
- [ ] `features/dashboard-*` - NOT YET (future phase)
- [ ] `entities/widget/` - NOT YET (future phase)

### 3.2 Move dashboard UI pieces

- [ ] Move from `src/components/dashboard/*` to:
  - [ ] `widgets/dashboard/*` for composition components (`DashboardTabs`, `WidgetRenderer`, layout shells)
  - [ ] `features/*` for action components (`AddWidgetModal`, “add/remove/reset” flows)
  - [ ] `entities/*` for read-only domain representations (optional)
- [ ] Keep `src/shared/ui/*` for primitives (buttons, modal primitives, ErrorBoundary, etc.)

### 3.3 Move dashboard “config/model”

- [ ] Migrate `src/lib/dashboard-config.ts` into:
  - [ ] `widgets/dashboard/model/*` (if it’s dashboard-only), or
  - [ ] `entities/widget/model/*` (if it becomes a reusable domain concept)
- [ ] Migrate `src/lib/stores/widget-store.ts` into:
  - [ ] `widgets/dashboard/model/*` (dashboard-local), or
  - [ ] `entities/widget/model/*` (shared across contexts)

### 3.4 Create pages module + thin route

- [ ] Create `src/pages/dashboard/` with `index.ts` exporting `<DashboardPage />`
- [ ] Refactor `src/app/dashboard/page.tsx` to:
  - [ ] import from `@pages/dashboard`
  - [ ] contain minimal glue only (no dashboard logic)

### 3.5 Enforce boundaries (tighten)

- [ ] Turn boundary lint rules for dashboard slices from warn → error
- [ ] Verify there are **no deep imports** within new slices

### 3.6 Quality gates + smoke test

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run build`
- [ ] `pnpm run dev` and verify `/dashboard` renders and widgets work

### 3.7 “Pilot done” exit criteria

- [ ] `src/app/dashboard/page.tsx` is a thin composition shell
- [ ] Dashboard-related code is not in `src/lib/*` (unless truly shared) or `src/components/dashboard/*`
- [ ] Lint boundaries prevent backsliding

---

## After the pilot — replicate by domain

Pick the next domain and repeat the pattern:

- [ ] Maintenance
- [ ] Services / Community services
- [ ] Messages / Conversations
- [ ] Bookings
- [ ] Directory
- [ ] Admin tenant management

For each domain:

- [ ] Create `pages/<domain>/`
- [ ] Create `widgets/<domain>/`
- [ ] Identify `features/<domain-*>/`
- [ ] Identify `entities/<domain>/`
- [ ] Move code + update imports
- [ ] Tighten lint boundaries for that domain
- [ ] Run quality gates

---

## Cleanup (final phase)

- [ ] Remove/empty legacy buckets (`src/components/*`, `src/lib/*`) once all domains migrated
- [ ] Make boundary violations fail CI (eslint errors)
- [ ] Update `README.md` with the new architecture rules + import conventions
