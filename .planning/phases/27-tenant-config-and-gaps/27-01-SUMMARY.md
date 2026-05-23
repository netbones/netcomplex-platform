---
phase: 27-tenant-config-and-gaps
plan: 01
subsystem: api
tags: [drizzle, settings, onboarding, bookings, maintenance, tenant-config]

# Dependency graph
requires:
  - phase: 20-self-service-inception
    provides: onboarding wizard infrastructure, settings table, withTenant
provides:
  - PRESET_FACILITIES and PRESET_CATEGORIES catalogs
  - settings/[key] API route for tenant-specific configuration
  - FacilitiesStep and MaintenanceStep onboarding components
  - useTenantCategories hook for dynamic maintenance categories
  - Tenant-configurable facility validation in bookings API
affects: [booking-form, maintenance-form, onboarding, admin-settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [tenant-configurable-options, preset-catalog-with-custom-additions, settings-api-single-key]

key-files:
  created:
    - src/app/api/settings/[key]/route.ts
    - src/features/onboarding/ui/steps/FacilitiesStep.tsx
    - src/features/onboarding/ui/steps/MaintenanceStep.tsx
    - src/entities/maintenance/model/constants.ts
  modified:
    - src/entities/booking/model/constants.ts
    - src/entities/booking/model/types.ts
    - src/features/booking/ui/BookingForm.tsx
    - src/app/api/bookings/route.ts
    - src/features/onboarding/model/useOnboarding.ts
    - src/features/onboarding/ui/OnboardingWizard.tsx
    - src/shared/api/schemas.ts

key-decisions:
  - 'Facility type changed from fixed union to string — tenant-configurable, backward-compatible'
  - 'Preset catalogs provide curated defaults; tenants add custom options during onboarding'
  - 'settings/[key] route uses upsert pattern for single-key CRUD, stores JSON strings'
  - 'Booking API validates facility against tenant settings, falls back to DEFAULT_FACILITIES'

patterns-established:
  - 'Preset catalog pattern: PRESET_X arrays with {value, label} for onboarding + DEFAULT_X for backward compat'
  - 'Settings key pattern: booking_facilities and maintenance_categories stored as JSON arrays in Setting table'
  - 'Tenant config hook pattern: useTenantX() hooks fetch from /api/settings, fall back to defaults'

requirements-completed: [CFG-01, CFG-02, CFG-03]

# Metrics
duration: 22min
completed: 2026-05-22
---

# Phase 27 Plan 01: Tenant-Configurable Facilities & Maintenance Summary

**Preset catalogs + settings/[key] API + onboarding config steps + dynamic booking/maintenance forms**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-22T13:55:00Z
- **Completed:** 2026-05-22T14:23:41Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Booking facilities and maintenance categories are now tenant-configurable instead of hardcoded
- 7-step onboarding wizard includes Facilities and Maintenance configuration steps
- Settings/[key] API enables per-tenant facility/category persistence
- Booking form dropdown dynamically loads tenant's configured facilities

## Task Commits

Each task was committed atomically:

1. **Task 1: Preset catalogs + tenant settings API for facilities and categories** - `7fcc7ef` (feat)
2. **Task 2: Onboarding facility + maintenance config steps** - `15f0fc0` (feat)
3. **Task 3: Booking + maintenance forms read tenant config from settings** - `04b2a80` (feat)

## Files Created/Modified

- `src/entities/booking/model/constants.ts` - PRESET_FACILITIES (15 options), DEFAULT_FACILITIES, TenantFacility type
- `src/entities/booking/model/types.ts` - Facility type changed from union to string
- `src/entities/maintenance/model/constants.ts` - PRESET_CATEGORIES (14 options), DEFAULT_CATEGORIES, TenantCategory type
- `src/app/api/settings/[key]/route.ts` - GET/PATCH single-key tenant settings API
- `src/features/onboarding/ui/steps/FacilitiesStep.tsx` - Onboarding step with preset checkboxes + custom input
- `src/features/onboarding/ui/steps/MaintenanceStep.tsx` - Onboarding step for maintenance categories
- `src/features/onboarding/model/useOnboarding.ts` - Extended to 7-step flow with facilities/maintenanceCategories
- `src/features/onboarding/ui/OnboardingWizard.tsx` - 7-step wizard with new step imports
- `src/features/booking/ui/BookingForm.tsx` - Fetches tenant facilities from settings, dynamic dropdown
- `src/app/api/bookings/route.ts` - Tenant facility validation via getTenantFacilities helper
- `src/shared/api/schemas.ts` - bookingSchema facility → z.string(), maintenanceRequestSchema category → z.string()
- `src/features/maintenance/model/useMaintenanceForm.ts` - useTenantCategories hook, removed hardcoded array

## Decisions Made

- **Facility type as string:** The original union type ('POOL'|'GYM'|...) was replaced with `string` since tenant-configurable facilities can't be a fixed enum. Prisma schema already had `facility String` so no DB migration needed.
- **Preset catalog pattern:** PRESET_FACILITIES (15) and PRESET_CATEGORIES (14) provide curated options for onboarding. DEFAULT_FACILITIES (5) and DEFAULT_CATEGORIES (8) preserve backward compatibility.
- **Settings key names:** `booking_facilities` and `maintenance_categories` stored as JSON arrays of `{value, label}` in the existing Setting table.
- **Custom facility handling:** Preset options are toggleable (checkbox), custom additions have a remove button. Presets can't be removed, only unchecked.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Settings/[key] API ready for Plan 27-02 assist-scope guard integration
- Tenant-configurable facility pattern ready for admin settings page (future)
- All backward compatibility maintained — tenants without config fall back to defaults

---

_Phase: 27-tenant-config-and-gaps_
_Completed: 2026-05-22_

## Self-Check: PASSED

- All key files verified FOUND
- All 3 task commits verified FOUND (7fcc7ef, 15f0fc0, 04b2a80)
