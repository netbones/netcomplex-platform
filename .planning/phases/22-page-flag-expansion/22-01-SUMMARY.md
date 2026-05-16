---
phase: 22-page-flag-expansion
plan: 01
subsystem: settings
tags: [flags, dynamic-pages, settings, hooks]
dependency_graph:
  requires: []
  provides: [PAGE-FLAGS-API]
  affects: [navigation, dashboard]
tech_stack:
  added: []
  patterns: [client-hook, isr-flags]
key_files:
  - src/entities/tenant/api/settings.ts
  - src/entities/tenant/api/flags/platform-flags.ts
  - src/shared/lib/hooks/usePageFlags.ts
decisions:
  - "Added 6 new page visibility flags to PlatformPageFlags interface with default value 'true'."
  - "Implemented a simple client-side hook 'usePageFlags' using native fetch to avoid adding complex dependencies for now."
metrics:
  duration: 20m
  completed_date: "2024-05-20"
---

# Phase 22 Plan 01: Page Flag Expansion Summary

Established the data foundation, API support, and testing for expanded page visibility flags.

## Key Changes

### 1. Data Foundation
- Updated `SETTINGS_KEYS` in `src/entities/tenant/api/settings.ts` to include 6 new keys:
  - `page_groups_enabled`
  - `page_services_enabled`
  - `page_resources_enabled`
  - `page_maintenance_enabled`
  - `page_surveys_enabled`
  - `page_competitions_enabled`
- Expanded `PlatformPageFlags` interface and `DEFAULT_PAGE_FLAGS` in `src/entities/tenant/api/flags/platform-flags.ts`.
- Updated `getPlatformPageFlags` to correctly map these new settings from the database.

### 2. API Support
- Updated `src/app/api/admin/settings/page-flags/route.ts` (POST) to allow admins to toggle the new flags.
- Updated `src/app/api/flags/route.ts` (GET) to expose the new flags to the frontend.

### 3. Client Integration
- Created `src/shared/lib/hooks/usePageFlags.ts`, a client-side hook for fetching and consuming page visibility flags in UI components.

### 4. Quality Assurance
- Created `src/entities/tenant/api/flags/platform-flags.test.ts` with comprehensive unit tests for flag retrieval and mapping logic.
- All tests passed.

## Deviations from Plan
- None - plan executed exactly as written.

## Self-Check: PASSED
- [x] All new settings keys are defined.
- [x] getPlatformPageFlags returns the expanded flag set.
- [x] Both public and admin APIs recognize the new flag keys.
- [x] usePageFlags hook is ready for use.
- [x] Unit tests pass.
