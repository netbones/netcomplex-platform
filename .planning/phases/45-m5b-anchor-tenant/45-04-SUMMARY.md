---
phase: 45
plan: 04
subsystem: i18n
tags: [react-i18next, useSafeTranslation, hydration, widgets]

# Dependency graph
requires:
  - phase: 42
    provides: useSafeTranslation hook, tx() pattern
provides:
  - Migration of 23 widget files from useTranslation to useSafeTranslation
  - English fallbacks for all translated text in dashboard, chat, services, marketing, and platform widgets
affects: [45-05, future i18n phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'tx(key, fallback): useSafeTranslation pattern for hydration-safe translation'
    - 'Domain fallback maps for dynamic labelKey/descriptionKey lookups'
    - 'Latest-segment-title-case for unknown translation keys'

key-files:
  created: []
  modified:
    - src/widgets/dashboard/ui/SpaceLauncher.tsx
    - src/widgets/dashboard/ui/MobileSpaceBar.tsx
    - src/widgets/dashboard/ui/AdminLayer.tsx
    - src/widgets/dashboard/ui/AdminSubLauncher.tsx
    - src/widgets/dashboard/ui/SpaceLayout.tsx
    - src/widgets/dashboard/ui/ServicesLayer.tsx
    - src/widgets/dashboard/ui/MessagesLayer.tsx
    - src/widgets/dashboard/ui/WidgetCard.tsx
    - src/widgets/dashboard/ui/DraggableWidget.tsx
    - src/widgets/dashboard/ui/QuickActionsWidget.tsx
    - src/widgets/dashboard/ui/DashboardStats.tsx
    - src/widgets/dashboard/ui/QuickStatsWidget.tsx
    - src/widgets/dashboard/ui/MessagesWidget.tsx
    - src/widgets/dashboard/ui/RecentActivityWidget.tsx
    - src/widgets/chat/ui/MessagesWidget.tsx
    - src/widgets/service/ui/MyServicesWidget.tsx
    - src/widgets/service/ui/ServiceInquiriesWidget.tsx
    - src/app/resident/[id]/page.tsx
    - src/features/marketing/ui/HeroSection.tsx
    - src/features/marketing/ui/FeaturesSection.tsx
    - src/features/marketing/ui/MissionSection.tsx
    - src/features/marketing/ui/CTASection.tsx
    - src/features/platform/ui/PlatformHeader.tsx

key-decisions:
  - 'Used SPACE_FALLBACKS map for SpaceLauncher/MobileSpaceBar/SpaceLayout dynamic labelKeys'
  - 'Used DOMAIN_FALLBACKS map for AdminLayer, AdminSubLauncher, ServicesLayer, MessagesLayer dynamic labelKeys'
  - 'HomeLayer skipped — already uses hardcoded English text, no useTranslation to migrate'

patterns-established:
  - 'SPACE_FALLBACKS pattern: Record<string, string> for space labelKey → English text'
  - 'DOMAIN_FALLBACKS pattern: per-namespace record for domain labelKey/descriptionKey → English text'
  - 'Marketing pages: use tx() with ready check from useSafeTranslation (same API surface as useTranslation for ready flag)'

requirements-completed: [l23]

# Metrics
duration: 12min
completed: 2026-06-19
---

# Phase 45 Plan 04: i18n Batch — Migrate 23 widgets from useTranslation to useSafeTranslation

**23 widget files migrated to useSafeTranslation with tx(key, fallback) — eliminating React hydration mismatches in dashboard, chat, services, marketing, and platform widgets.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-19T11:00:00Z
- **Completed:** 2026-06-19T11:12:00Z
- **Tasks:** 3
- **Files modified:** 23

## Accomplishments

- All 23 widget files migrated from raw `useTranslation` to `useSafeTranslation`
- Every `t()` call replaced with `tx(key, 'English fallback')` pattern
- Space navigation shell (5 files): SpaceLauncher, MobileSpaceBar, AdminLayer, AdminSubLauncher, SpaceLayout
- Space layer components (3 files): ServicesLayer, MessagesLayer (HomeLayer already hardcoded)
- Key widgets (7 files): WidgetCard, DraggableWidget, QuickActionsWidget, DashboardStats, QuickStatsWidget, MessagesWidget, RecentActivityWidget
- Cross-widget migration (5 files): chat MessagesWidget, MyServicesWidget, ServiceInquiriesWidget, resident profile page, platform header
- Marketing sections (4 files): HeroSection, FeaturesSection, MissionSection, CTASection
- Zero type errors from migrated files
- Grep audit confirms zero raw `useTranslation` in migrated directories

## Task Commits

All tasks committed atomically in single plan commit:

- **Plan 45-04 commit:** `41a0be2f` (feat)

## Files Modified

- `src/widgets/dashboard/ui/SpaceLauncher.tsx` — space name keys with SPACE_FALLBACKS map
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx` — space name keys with SPACE_FALLBACKS map
- `src/widgets/dashboard/ui/AdminLayer.tsx` — domain label/description keys with DOMAIN_FALLBACKS map
- `src/widgets/dashboard/ui/AdminSubLauncher.tsx` — domain label/description keys with DOMAIN_FALLBACKS map
- `src/widgets/dashboard/ui/SpaceLayout.tsx` — space name keys with SPACE_FALLBACKS map
- `src/widgets/dashboard/ui/ServicesLayer.tsx` — services domain label/description keys with DOMAIN_FALLBACKS map
- `src/widgets/dashboard/ui/MessagesLayer.tsx` — messages domain label/description keys with DOMAIN_FALLBACKS map
- `src/widgets/dashboard/ui/WidgetCard.tsx` — expand/collapse/remove widget labels
- `src/widgets/dashboard/ui/DraggableWidget.tsx` — expand/collapse/remove widget labels
- `src/widgets/dashboard/ui/QuickActionsWidget.tsx` — submit request, book facility, create content, view profile
- `src/widgets/dashboard/ui/DashboardStats.tsx` — my requests, my bookings, messages, notifications
- `src/widgets/dashboard/ui/QuickStatsWidget.tsx` — quick stats label
- `src/widgets/dashboard/ui/MessagesWidget.tsx` — migrated (t was already unused)
- `src/widgets/dashboard/ui/RecentActivityWidget.tsx` — no activity, activity will appear
- `src/widgets/chat/ui/MessagesWidget.tsx` — migrated (t was already unused)
- `src/widgets/service/ui/MyServicesWidget.tsx` — migrated (t was already unused)
- `src/widgets/service/ui/ServiceInquiriesWidget.tsx` — migrated (t was already unused)
- `src/app/resident/[id]/page.tsx` — nav.home, nav.directory with English fallbacks
- `src/features/marketing/ui/HeroSection.tsx` — hero tagline, title, attribution, subtitle, cta keys
- `src/features/marketing/ui/FeaturesSection.tsx` — features title, subtitle, show more/less, dynamic feature keys
- `src/features/marketing/ui/MissionSection.tsx` — mission title, description, core belief keys
- `src/features/marketing/ui/CTASection.tsx` — cta title, description, primary/secondary action keys
- `src/features/platform/ui/PlatformHeader.tsx` — header nav labels with English fallbacks

## Decisions Made

- HomeLayer.tsx was NOT migrated because it never used `useTranslation` — all text is already hardcoded English, which is the desired end state
- For dynamic keys (space.labelKey, domain.labelKey), used Record<string, string> fallback maps rather than per-component inline fallbacks
- For platform/marketing pages, used realistic English fallbacks descriptive of the expected content (e.g., 'Features' for features.title, 'Get Started' for hero.cta.signup)
- The `pnpm build` step fails on missing environment variables (BETTER_AUTH_SECRET, etc.) — this is a pre-existing condition unrelated to this migration

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `pnpm build` fails on missing environment variables (pre-existing, not caused by migration)
- Some migrated files (MyServicesWidget, ServiceInquiriesWidget, chat MessagesWidget) had `t` imported but unused even before migration — `tx` is now similarly unused (lint warning, pre-existing)

## Next Phase Readiness

- Plan 45-05 depends on this plan's completion of the resident profile page migration
- All widget migration targets achieved — grep audit clean for migrated directories

---

_Phase: 45-m5b-anchor-tenant_
_Completed: 2026-06-19_
