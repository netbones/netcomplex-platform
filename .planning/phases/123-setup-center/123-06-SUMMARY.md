---
phase: 123-setup-center
plan: 123-06
title: Dashboard Integration — HomeLayer setup card + redirect change + health dashboard
status: complete
completed: 2026-07-07T08:42:23Z
duration_seconds: 388
tasks_completed: 5
tasks_total: 5
subsystem: setup
tags: [dashboard, home-layer, setup-card, signup-redirect, health-dashboard, integration-test]
requires:
  - plan: 123-03
    provides: 'SetupCenter shell, SetupSection accordion, useSetupProgress hook'
  - plan: 123-04
    provides: 'LaunchSection, PopulateSection, useAutoSaveSetting hook'
provides:
  - 'SetupProgressCard: compact card with percentage + progress bar + Continue Setup link'
  - 'HomeLayer integration: card rendered above UrgencyZone when setup incomplete'
  - 'Post-signup redirect: /setup when enable-setup-center flag is on, fallback to /onboarding'
  - 'HealthSection: Community Health readiness breakdown for post-launch tenants'
  - '4 integration smoke tests'
affects:
  - 'src/features/setup/ui/SetupProgressCard.tsx (created)'
  - 'src/widgets/dashboard/ui/HomeLayer.tsx (modified)'
  - 'src/features/auth/model/useSignupForm.ts (modified)'
  - 'src/features/setup/ui/sections/HealthSection.tsx (created)'
  - 'src/features/setup/index.ts (modified)'
  - 'src/widgets/dashboard/__tests__/HomeLayer-setup.test.tsx (created)'
tech-stack:
  added: []
  patterns:
    - 'SetupProgressCard: self-contained card using useSetupProgress hook; returns null when complete'
    - 'Feature-gated signup redirect via hasFeature from @entities/tenant'
    - 'HealthSection: mission-key mapping for post-launch readiness breakdown'
    - 'Integration test: mocked useSetupProgress + useTenant + fetch to verify card visibility'
key-files:
  created:
    - src/features/setup/ui/SetupProgressCard.tsx
    - src/features/setup/ui/sections/HealthSection.tsx
    - src/widgets/dashboard/__tests__/HomeLayer-setup.test.tsx
  modified:
    - src/widgets/dashboard/ui/HomeLayer.tsx
    - src/features/auth/model/useSignupForm.ts
    - src/features/setup/index.ts
decisions:
  - 'SetupProgressCard placed above UrgencyZone in HomeLayer — visible before "Needs Attention" when setup is incomplete'
  - 'Post-signup redirect uses hasFeature with selected plan as tier — all foundation+ features are on by default'
  - 'HealthSection shows 7 health rows mapped from DEFAULT_MISSIONS missionKeys; AI Assistant always "Available" (platform feature)'
  - 'Smoke test mocks SetupProgressCard inline rather than importing real component — isolates HomeLayer integration from card internals'
requirements-completed: []
---

# Phase 123 Plan 06: Dashboard Integration — Summary

## One-Liner

Integrated Setup Center into HomeLayer with a progress card in the urgency zone, feature-flagged post-signup redirect to /setup, and a Community Health readiness dashboard for post-launch tenants — all with 4 passing smoke tests.

## What Was Built

### Task 1: SetupProgressCard Component

- **`src/features/setup/ui/SetupProgressCard.tsx`** — Compact client component card:
  - Accepts `tenantId` prop, uses `useSetupProgress(tenantId)` hook
  - Shows completion percentage + progress bar with `role="progressbar"` ARIA
  - "Continue Setup" link to `/setup` with arrow icon
  - Returns `null` when `completionPercent >= 100` or no setup data exists
  - `LoadingSkeleton` from `@shared/ui` for loading state
  - Card styling: `bg-white rounded-lg shadow-sm border border-soralia-primary/20`
  - Exported via `src/features/setup/index.ts` barrel

### Task 2: HomeLayer Integration

- **`src/widgets/dashboard/ui/HomeLayer.tsx`** — Modified:
  - Imports `SetupProgressCard` from `@/features/setup` and `useTenant` from `@entities/tenant`
  - Renders `{tenant?.id && <SetupProgressCard tenantId={tenant.id} />}` above `<UrgencyZone>`
  - Zero structural changes to existing HomeLayer layout
  - Card auto-hides when setup is complete (component returns null)
  - Works for both loading state (skeleton) and complete state (hidden)

### Task 3: Post-Signup Redirect

- **`src/features/auth/model/useSignupForm.ts`** — Modified:
  - Imports `hasFeature` and `TierLevel` from `@entities/tenant`
  - After successful signup, checks `hasFeature('feature.enable-setup-center', data.plan)`
  - If flag is on → `router.push('/setup')`
  - If flag is off → `router.push('/onboarding/${tenantId}')` (existing behavior)
  - `enable-setup-center` is at `foundation` tier, so all new signups route to `/setup`

### Task 4: Community Health View

- **`src/features/setup/ui/sections/HealthSection.tsx`** — Post-launch dashboard:
  - Returns `null` when `launchedAt` is not set (pre-launch tenants)
  - Flattens all missions into a lookup map by `missionKey`
  - 7 health rows: Branding, Residents, Maintenance, Bookings, Payments, AI Assistant, Achievements
  - Each row shows green checkmark + status label when missions are complete, gray circle + pending label when not
  - "Overall Readiness" footer shows `completionPercent`
  - `LoadingSkeleton` for loading state

### Task 5: Integration Smoke Test

- **`src/widgets/dashboard/__tests__/HomeLayer-setup.test.tsx`** — 4 tests:
  1. Renders `SetupProgressCard` when setup is incomplete (45%)
  2. Shows correct percentage (72%) and link to `/setup`
  3. Hides card when setup is complete (100%)
  4. Passes `tenantId` to card component
  - All mocks: i18n, auth client, useLanguage, useTenant, useSetupProgress, global.fetch

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] 4/4 integration smoke tests pass (`pnpm vitest run`)
- [x] ESLint passes on all modified files (pre-commit hooks)
- [x] Prettier formatting applied (pre-commit hooks)
- [x] HomeLayer renders card when incomplete, hides when complete
- [x] Post-signup redirects to `/setup` for all tiers (feature at foundation)
- [x] HealthSection shows readiness breakdown for post-launch tenants
- [x] Zero regression on existing HomeLayer layout

## Known Stubs

None — all functionality is fully wired.

## Threat Flags

None — no new security surfaces beyond existing auth and tenant middleware.

## Self-Check: PASSED

- [x] `src/features/setup/ui/SetupProgressCard.tsx` exists
- [x] `src/features/setup/ui/sections/HealthSection.tsx` exists
- [x] `src/widgets/dashboard/ui/HomeLayer.tsx` modified with SetupProgressCard
- [x] `src/features/auth/model/useSignupForm.ts` modified with feature flag check
- [x] `src/widgets/dashboard/__tests__/HomeLayer-setup.test.tsx` exists
- [x] All 5 commits in git log (76c9dc37, 86e2a830, b9830c1f, 4ad0528b, 1ef30fc7)
- [x] 4/4 smoke tests pass
