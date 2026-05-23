---
phase: 27-tenant-config-and-gaps
plan: 02
subsystem: api, security, database
tags: [assist-scope, widget-sync, gap-closure, drizzle, migration]

# Dependency graph
requires:
  - phase: 27-tenant-config-and-gaps/01
    provides: settings/[key] route for assist scope guard
provides:
  - AssistSession scope guard (requireAssistScope)
  - Widget DB sync (hydrateFromServer + subscribeWidgetAutoSave)
  - GAPS.md items GAP-05, GAP-10, GAP-13, GAP-15, GAP-16 all closed
affects: [assist-api, content-api, users-api, settings-api, widget-store, admin-dashboard]

# Tech tracking
tech-stack:
  added: []
patterns: [assist-scope-guard, debounced-db-sync, server-wins-on-conflict]

key-files:
  created:
    - src/entities/tenant/api/assist-scope-guard.ts
  modified:
    - src/app/api/content/route.ts
    - src/app/api/users/[id]/route.ts
    - src/app/api/settings/[key]/route.ts
    - src/entities/widget/model/widget-store.ts
    - src/app/(tenant)/admin/page.tsx
    - src/shared/api/db.ts
    - src/db/index.ts
    - src/lib/migrations/migrate-resources.DONE.ts (renamed from .ts)
    - .planning/GAPS.md

key-decisions:
  - 'Assist scope guard applied only to write operations (POST/PATCH/DELETE), not GET — metadata-scoped staff can read everything'
  - 'Widget auto-save uses 500ms debounce (was 2s inline in admin page) via subscribeWidgetAutoSave subscription'
  - 'Server-wins-on-conflict pattern for widget hydration: DB layout overrides localStorage on mount'
  - 'Migration script kept as .DONE.ts (not deleted) per GAPS.md constraint — idempotent, historical reference'

patterns-established:
  - "requireAssistScope(request, 'full'|'metadata'): reusable guard for any API route that needs scope enforcement"
  - 'subscribeWidgetAutoSave(userId): zustand subscribe pattern with debounce for DB sync'
  - 'hydrateFromServer(userId): fetch-merge-set pattern for DB-to-store hydration with server as truth'

requirements-completed: [GAP-05, GAP-10, GAP-13, GAP-15, GAP-16]

# Metrics
duration: 18min
completed: 2026-05-23
---

# Phase 27 Plan 02: Gap Closure Summary

**AssistSession scope guard + widget DB sync + 5 GAPS.md items closed (GAP-05, GAP-10, GAP-13, GAP-15, GAP-16)**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-23T14:00:00Z
- **Completed:** 2026-05-23T14:18:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Closed 5 GAPS.md items: GAP-05 (migration DONE), GAP-10 (assist scope guard), GAP-13 (widget DB sync), GAP-15 (EventsWidget clarified), GAP-16 (singleton DB client confirmed)
- Created `requireAssistScope()` guard that blocks metadata-scoped assist sessions from modifying content, users, or settings
- Added `hydrateFromServer()` and `subscribeWidgetAutoSave()` for widget layout cross-device persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Close GAP-05, GAP-15, GAP-16** - `626833e` (fix)
2. **Task 2: Close GAP-10 + GAP-13** - `8f8e318` (feat)

## Files Created/Modified

- `src/entities/tenant/api/assist-scope-guard.ts` - NEW — requireAssistScope guard for assist session scope enforcement
- `src/app/api/content/route.ts` - Added assist scope guard to POST handler
- `src/app/api/users/[id]/route.ts` - Added assist scope guard to PATCH/DELETE handlers
- `src/app/api/settings/[key]/route.ts` - Added assist scope guard to PATCH handler, fixed null-safety for settingKey
- `src/entities/widget/model/widget-store.ts` - Added hydrateFromServer, subscribeWidgetAutoSave, 500ms debounce
- `src/app/(tenant)/admin/page.tsx` - Updated to use hydrateFromServer + subscribeWidgetAutoSave
- `src/shared/api/db.ts` - Added singleton comment to drizzle() call
- `src/db/index.ts` - Added schema-reexports-only comment
- `src/lib/migrations/migrate-resources.DONE.ts` - Renamed from .ts (already marked COMPLETED)
- `.planning/GAPS.md` - Marked GAP-05, GAP-10, GAP-13, GAP-15, GAP-16 as CLOSED

## Decisions Made

- Assist scope guard applied only to write operations (POST/PATCH/DELETE) — GET routes intentionally unguarded so metadata-scoped staff can still read everything
- Widget auto-save debounce reduced from 2s (inline in admin page) to 500ms via subscribeWidgetAutoSave subscription pattern
- Server-wins-on-conflict pattern for widget hydration: DB layout overrides localStorage on mount, localStorage serves as fast local cache
- Migration script kept as .DONE.ts (not deleted) per GAPS.md constraint — idempotent, serves as historical reference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null-safety in settings/[key] route GET handler**

- **Found during:** Task 1 (GAP-16 verification)
- **Issue:** `settingKey` typed as `string | null` from `key || queryKey`, but `eq(settings.key, settingKey)` requires `string`
- **Fix:** Added early return `if (!settingKey) return 400` before the query, narrowing the type to `string`
- **Files modified:** `src/app/api/settings/[key]/route.ts`
- **Verification:** TypeScript error resolved (125 errors in 8 files, down from 126 in 9)
- **Committed in:** `626833e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal — null-safety fix was necessary for correctness and TypeScript compilation. No scope creep.

## Issues Encountered

- Earlier session edits (db.ts comment, index.ts comment) were not persisted due to git stash/state conflicts — had to re-apply manually during this execution session

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 GAPS.md items for Phase 27 closed
- Assist scope guard pattern established for future route protection
- Widget DB sync ready for resident dashboard page (currently only admin uses it)
- Phase 27 is complete — ready for VERIFICATION.md

---

_Phase: 27-tenant-config-and-gaps_
_Completed: 2026-05-23_

## Self-Check: PASSED

- All 10 key files verified FOUND
- All 5 task commits verified FOUND (7fcc7ef, 15f0fc0, 04b2a80, 626833e, 8f8e318)
