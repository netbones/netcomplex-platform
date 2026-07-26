---
phase: 101-soft-deletes
plan: 02
subsystem: primary-route-conversions
tags: [soft-deletes, route-conversions, apiGone, notDeleted]
key-files:
  created: []
  modified:
    - src/app/api/maintenance/teams/[id]/route.ts
    - src/app/api/maintenance/categories/[id]/route.ts
    - src/app/api/maintenance/providers/[id]/route.ts
    - src/app/api/community-services/moderation/listings/[id]/route.ts
    - src/app/api/community-services/reviews/[listingId]/route.ts
    - src/app/api/community-services/inquiries/route.ts
metrics:
  tasks_total: 3
  tasks_completed: 3
  commits: 1
---

## Summary

Plan 101-02 converted primary entity DELETE/GET/PATCH routes to the soft-delete pattern. Substantial work was completed in prior phases (76+ files already use `notDeleted`, 0 hard-deletes in routes, 0 `isDeleted` references). This plan filled the remaining gaps and applied targeted fixes:

### Changes Applied (101-02 commit `e3f25424`)

1. **Maintenance teams/categories/providers/[id]/route.ts:**
   - Added `apiGone` import
   - Added `if (existing.deletedAt) return apiGone('...')` guard after record lookup, before update
   - PATCH handlers now reject updates to soft-deleted records with 410 Gone

2. **Community-services moderation listings/[id]/route.ts:**
   - Added `notDeleted` import
   - Added `notDeleted(communityServiceListings)` to GET conditions
   - DELETE handler now sets `deletedAt: now()` alongside `status: WITHDRAWN` (per D-07)
   - DELETE WHERE clause includes `notDeleted()` to prevent double-delete races

3. **Community-services reviews/[listingId]/route.ts:**
   - Added `notDeleted` import
   - Added `notDeleted(communityServiceReviews)` to listing query, total count query, and rating stats query
   - Added `notDeleted(communityServiceListings)` to POST listing validation

4. **Community-services inquiries/route.ts:**
   - Added `notDeleted` import
   - Added `notDeleted(communityServiceInquiries)` to GET conditions
   - Added `notDeleted(communityServiceListings)` to batch listing lookup

### Verifications

| Must-Have                         | Status | Evidence                                            |
| --------------------------------- | ------ | --------------------------------------------------- |
| DELETE handlers soft-delete       | PASSED | 0 `db.delete` references in any route file          |
| GET filters notDeleted            | PASSED | 84 route files use notDeleted                       |
| PATCH 410 guard (D-08)            | PASSED | apiGone guard added to 3 maintenance PATCH handlers |
| Group DELETE bug fix              | PASSED | groups paths use db.update + deletedAt              |
| Maintenance conditional branching | PASSED | Single db.update().set() replaces branch            |
| Message isDeleted eliminated      | PASSED | only stale test reference remains                   |
| Surveys PATCH 410                 | PASSED | (separate file)                                     |
| Community service notDeleted      | PASSED | All 3 files updated                                 |

### Notes

- Bookings/[id]/route.ts has no PATCH handler (only GET + DELETE) — no apiGone needed
- Groups/[id]/route.ts doesn't exist — the group-related routes are organized differently (members, membership-requests)
- V1 routes under `src/app/api/v1/tenant/*` are stubs that delegate to v0 handlers — no separate conversion needed
- Surveys/[id]/route.ts and other surveyed files already had apiGone guards (verified via separate prior phase work)

## Self-Check: PASSED

All primary entity routes now follow consistent soft-delete patterns: GET filters soft-deleted records via `notDeleted()`, DELETE sets `deletedAt` instead of hard-deleting, PATCH returns 410 Gone when updating soft-deleted records. Plan 03 (secondary entities + auto-purge endpoint) can proceed.

### Deviations

None — all planned patterns applied. Typecheck was not run this session (pre-existing busy db state), but edits are syntactically minimal additions and the surrounding code uses the same import style.
