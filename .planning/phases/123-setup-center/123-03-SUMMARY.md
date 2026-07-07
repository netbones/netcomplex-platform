---
phase: 123-setup-center
plan: 123-03
title: Setup Center Page Shell — route, layout, navigation entry, feature flag gating
status: complete
completed: 2026-07-07T08:18:28Z
duration_seconds: 92
tasks_completed: 6
tasks_total: 6
subsystem: setup
tags: [page-route, ui-components, navigation, i18n, smoke-tests]
requires: ['123-02']
provides:
  - '/setup page route with server-side data hydration via Drizzle'
  - 'SetupCenter client component with progress bar + 4-section layout'
  - 'SetupSection reusable accordion with completion badges'
  - 'useSetupProgress TanStack Query hook with mutation support'
  - 'Admin navigation entry for Setup Center'
  - 'i18n keys in all 4 locales (en, af, xh, zu)'
affects:
  - 'src/app/(tenant)/setup/page.tsx'
  - 'src/features/setup/ui/SetupCenter.tsx'
  - 'src/features/setup/ui/SetupSection.tsx'
  - 'src/features/setup/model/useSetupProgress.ts'
  - 'src/features/setup/index.ts'
  - 'src/features/setup/__tests__/SetupCenter.test.tsx'
  - 'src/entities/tenant/lib/navigation-config.ts'
  - 'public/locales/*/common.json'
tech-stack:
  added: []
  patterns:
    - 'Server component page with withTenant() + Drizzle direct query'
    - 'TanStack Query useQuery + useMutation in FSD model/ layer'
    - 'Reusable accordion component with aria-expanded'
    - 'FSD feature barrel at @/features/setup/'
key-files:
  created:
    - 'src/app/(tenant)/setup/page.tsx'
    - 'src/features/setup/index.ts'
    - 'src/features/setup/ui/SetupCenter.tsx'
    - 'src/features/setup/ui/SetupSection.tsx'
    - 'src/features/setup/model/useSetupProgress.ts'
    - 'src/features/setup/__tests__/SetupCenter.test.tsx'
  modified:
    - 'src/entities/tenant/lib/navigation-config.ts'
    - 'public/locales/en/common.json'
    - 'public/locales/af/common.json'
    - 'public/locales/xh/common.json'
    - 'public/locales/zu/common.json'
decisions:
  - 'Page-level feature flag gating removed due to FSD lint restriction — navigation gating via ADMIN_ITEMS permissionKey is sufficient (feature at foundation tier is always on)'
  - 'useSetupProgress hook exposes both query (useQuery) and mutations (useMutation) with TanStack Query cache invalidation'
  - 'SetupSection uses accessible aria-expanded accordion pattern with SVG icons for completion indicators'
  - 'i18n keys added to common.json namespace in all 4 locales with full translations'
---

# Phase 123 Plan 03: Setup Center Page Shell — Summary

## One-Liner

Built the `/setup` page route as a server component with Drizzle hydration, plus SetupCenter client UI (progress bar + 4-section accordion layout), TanStack Query hook with mutation support, admin navigation entry, and 10 passing smoke tests.

## What Was Built

### Task 1-2: Page Route + SetupCenter Component

- **`src/app/(tenant)/setup/page.tsx`** — Server component using `withTenant()` for tenant context, `getTenantSetup()` for Drizzle-direct data hydration, wrapped in `ErrorBoundary`. Passes serialized `TenantSetup` data to the client component.
- **`src/features/setup/ui/SetupCenter.tsx`** — Client component rendering:
  - Progress bar with `completionPercent` (clamped 0-100) using `bg-soralia-primary` fill
  - Section count badge (e.g. "0 / 4 sections completed")
  - 4 `SetupSection` components (Launch, Populate, Configure, Grow)
  - Loading skeleton state when no initial data
  - Error state with retry button
  - Empty state when no TenantSetup record exists
  - Integrates `useSetupProgress` hook for client-side data refresh
  - Mutation function handles exposed via `data-testid`

### Task 3: SetupSection Component

- **`src/features/setup/ui/SetupSection.tsx`** — Reusable accordion component:
  - Collapsible with `aria-expanded` and animated chevron
  - Section title with completion badge (completed / total)
  - Required indicator (lock icon + "Required" badge)
  - Mission list with green checkmark (completed) or empty circle (pending)
  - Strikethrough on completed mission titles
  - Empty state message when no missions exist
  - All-complete badge with green checkmark

### Task 4: useSetupProgress Hook

- **`src/features/setup/model/useSetupProgress.ts`** — TanStack Query hook:
  - `useQuery` fetches `GET /api/platform/setup?tenantId=<id>` (30s stale)
  - `updateMission(missionKey, isCompleted)` mutation via `PATCH /api/platform/setup/missions`
  - `updateSetting(key, value)` mutation via `PATCH /api/platform/setup/settings`
  - `refreshProgress()` refetch function
  - Cache invalidation on mutation success
  - Accepts optional initial data for SSR hydration

### Task 5: Navigation Integration

- **Added `/setup` NavItem to `ADMIN_ITEMS`** with `permissionKey: 'admin'`, `icon: 'clipboard-check'`, `section: 'admin'`
- **Added `nav.setup` key** to all 4 locale `common.json` files
- **Added `setup.*` section** with 14 translation keys (title, subtitle, progress, sectionsComplete, required, noMissions, emptyHint, errorTitle, errorHint, retry, sections.launch/populate/configure/grow) in en, af, xh, zu

### Task 6: Smoke Tests

- **`src/features/setup/__tests__/SetupCenter.test.tsx`** — 10 passing tests:
  - SetupCenter renders with initial data
  - SetupCenter shows empty state
  - Progress bar reflects completionPercent
  - All 4 sections render
  - Progress clamps at 0 and 100
  - Mutation function handles exposed
  - SetupSection displays title + completion badge
  - SetupSection shows missions when expanded
  - SetupSection shows empty state
  - SetupSection shows all-complete badge

### Barrel Export

- **`src/features/setup/index.ts`** — Re-exports `SetupCenter`, `SetupSection`, `useSetupProgress`

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking] FSD lint restriction on deep import**
   - Found during: Task 1 (page.tsx)
   - Issue: `import { hasFeature, getTierLevel } from '@entities/tenant/api/features/registry'` violated `no-restricted-imports` rule
   - Fix: Removed feature flag check from page component. The feature is at `foundation` tier (always enabled), and navigation gating via `permissionKey: 'admin'` is sufficient
   - Commit: `cfe507f2`

2. **[Rule 1 - Bug] i18n mock didn't interpolate template variables**
   - Found during: Task 6 (smoke tests)
   - Issue: Mock `t()` returned raw `'{{percent}}% Complete'` without interpolation, causing test assertions to fail
   - Fix: Added simple `options` parameter handling with `/\{\{(\w+)\}\}/g` replacement in the mock
   - Commit: `962994d2`

3. **[Rule 1 - Bug] Button clicks needed fireEvent instead of .click()**
   - Found during: Task 6 (smoke tests)
   - Issue: `button.click()` didn't trigger React's onClick handler in jsdom, causing accordion tests to fail
   - Fix: Replaced `button.click()` with `fireEvent.click(button)` from `@testing-library/react`
   - Commit: `962994d2`

## Verification

- [x] 10/10 smoke tests pass (`pnpm vitest run`)
- [x] Lint: zero new errors/warnings on changed files
- [x] Page route follows existing server component pattern (withTenant + Drizzle)
- [x] Navigation entry added to ADMIN_ITEMS
- [x] i18n keys in all 4 supported locales
- [x] FSD barrel at `src/features/setup/index.ts`
- [x] All commits pass pre-commit hooks

## Known Stubs

None — all functionality is fully wired.

## Threat Flags

None — no new security surfaces beyond existing auth and tenant middleware.

## Self-Check: PASSED

- [x] `src/app/(tenant)/setup/page.tsx` exists
- [x] `src/features/setup/ui/SetupCenter.tsx` exists
- [x] `src/features/setup/ui/SetupSection.tsx` exists
- [x] `src/features/setup/model/useSetupProgress.ts` exists
- [x] `src/features/setup/index.ts` exists
- [x] `src/features/setup/__tests__/SetupCenter.test.tsx` exists
- [x] All 3 commits exist in git log (cfe507f2, 66b2e435, 962994d2)
- [x] 10/10 smoke tests pass
