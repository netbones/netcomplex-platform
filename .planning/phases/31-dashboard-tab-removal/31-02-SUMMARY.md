---
phase: 31-dashboard-tab-removal
plan: 02
subsystem: ui
tags: [feature-flag, tab-removal, dashboard, cleanup, barrel-exports]

# Dependency graph
requires:
  - phase: 31-dashboard-tab-removal (plan 01 — widget store migration)
provides:
  - Old tab-mode files deleted (DashboardTabs, DashboardPage, admin-config, tab-migration-map)
  - Feature flag NEXT_PUBLIC_FOCUS_SPACES removed from dashboard routes
  - Barrel exports cleaned (DashboardTabs removed from widgets/dashboard/index.ts)
affects: [31-03, dashboard, admin]

# Tech tracking
tech-stack:
  added: []
  patterns: [feature-flag removal, always-on space rendering]

key-files:
  created: []
  modified:
    - src/app/(tenant)/dashboard/page.tsx
    - src/app/(tenant)/dashboard/layout.tsx
    - src/widgets/dashboard/index.ts
  deleted:
    - src/widgets/dashboard/ui/DashboardTabs.tsx
    - src/page-modules/dashboard/ui/DashboardPage.tsx
    - src/page-modules/dashboard/index.ts
    - src/entities/widget/model/tab-migration-map.ts
    - src/entities/admin/model/admin-config.ts

key-decisions:
  - 'dashboard/page.tsx simplified to always render HomeLayer + MyHomeSpace (no conditional flag branch)'
  - 'dashboard/layout.tsx simplified to always render SpaceLauncher + MobileSpaceBar (no conditional flag branch)'
  - 'NEXT_PUBLIC_FOCUS_SPACES was not present in .env.local — no env cleanup needed'
  - 'admin-config.ts safe to delete — not exported from entities/admin barrel, only used DashboardTab type from deleted DashboardTabs.tsx'

# Metrics
duration: 281m
completed: 2026-06-02T23:50:48Z
---

# Phase 31 Plan 02: Delete Tab-Mode Files & Remove Feature Flag Summary

Deleted all old tab-mode dashboard files and removed the NEXT_PUBLIC_FOCUS_SPACES feature flag from dashboard routes, making the space-based layout the always-on default.

## One-liner

Removed 5 tab-mode files and eliminated feature flag from dashboard routes, making space-based navigation unconditional.

## Tasks Completed

| Task | Description                                                        | Commit  | Files                          |
| ---- | ------------------------------------------------------------------ | ------- | ------------------------------ |
| 1    | Delete old tab-mode files                                          | d5da5d9 | 5 files deleted                |
| 2    | Remove feature flag from dashboard routes and clean barrel exports | 7b14b1d | page.tsx, layout.tsx, index.ts |

## Detailed Changes

### Task 1: Delete old tab-mode files

Deleted 5 files that are no longer needed after the space-based navigation migration:

- `src/widgets/dashboard/ui/DashboardTabs.tsx` — Old tab-based navigation component (replaced by SpaceLauncher)
- `src/page-modules/dashboard/ui/DashboardPage.tsx` — Old tab-mode page module (replaced by space-based dashboard page)
- `src/page-modules/dashboard/index.ts` — Barrel for deleted page module
- `src/entities/widget/model/tab-migration-map.ts` — Tab→space migration map (inlined in widget-store.ts in Plan 31-01)
- `src/entities/admin/model/admin-config.ts` — ADMIN_TABS and admin widget helpers (replaced by AdminLayer in Phase 37)

Verified: `/admin` page untouched — still imports AdminLayer directly.

### Task 2: Remove feature flag from dashboard routes and clean barrel exports

- **dashboard/page.tsx** — Removed feature flag conditional; now always renders `HomeLayer` + `MyHomeSpaceWithErrorBoundary`
- **dashboard/layout.tsx** — Removed `FOCUS_SPACES_ENABLED` flag check; now always renders `SpaceLauncher` + `MobileSpaceBar`
- **widgets/dashboard/index.ts** — Removed `export * from './ui/DashboardTabs'` (file deleted)
- **.env.local** — `NEXT_PUBLIC_FOCUS_SPACES` not present (no-op)

## Verification

All success criteria verified:

- [x] 5 tab-mode files deleted
- [x] /admin page untouched (AdminLayer still imported)
- [x] dashboard/page.tsx always renders HomeLayer + MyHomeSpace (no flag)
- [x] dashboard/layout.tsx always renders SpaceLauncher + MobileSpaceBar (no flag)
- [x] Barrel no longer exports DashboardTabs
- [x] NEXT_PUBLIC_FOCUS_SPACES not in .env.local
- [x] Typecheck: only 1 phase-31-related error remains (`default-layouts.ts` importing `./tab-migration-map` — scheduled for Plan 31-03)

## Deviations from Plan

None — plan executed exactly as written.

## Known Remaining Work (Plan 31-03)

- `src/entities/widget/model/default-layouts.ts` still imports from `./tab-migration-map` (deleted) — will be fixed in Plan 31-03

## Self-Check: PASSED

- [x] 31-02-SUMMARY.md exists
- [x] Commit d5da5d9 (Task 1: delete tab-mode files)
- [x] Commit 7b14b1d (Task 2: remove feature flag + clean barrels)
