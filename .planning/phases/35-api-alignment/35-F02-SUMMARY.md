---
phase: 35-api-alignment
plan: F02
subsystem: api-governance
tags: [compliance-sweep, schema-ownership, role-checks, response-envelope, error-codes]
requires: [35-F01]
provides: [api-governance-complete]
affects: [src/shared/api, src/entities/*/schema, src/app/api/*/route]
tech-stack:
  added: [apiConflict(), apiGone(), requireRole()]
  patterns:
    - Entity-owned schema modules with shared re-exports
    - Canonical requireRole() gate helper for route handlers
    - Canonical apiConflict()/apiGone() for 409/410 responses
key-files:
  created:
    - src/entities/booking/schema.ts
    - src/entities/chat/schema.ts
    - src/entities/content/schema.ts
    - src/entities/events/schema.ts
    - src/entities/maintenance/schema.ts
    - src/entities/tenant/schema.ts
  modified:
    - src/shared/api/schemas.ts (re-exports from entity modules)
    - src/shared/api/api-response.ts (added CONFLICT, GONE codes + wrappers)
    - src/entities/tenant/api/permissions.ts (added requireRole())
    - src/app/api/*/route.ts (16 route files fixed for compliance)
decisions:
  - Schema ownership: Entity-owned schema.ts files created for 6 entities, re-exported from shared location
  - requireRole() helper added to permissions.ts for canonical role gating in route handlers
  - CONFLICT (409) and GONE (410) added to canonical error taxonomy
  - Direct role comparisons (role !== 'ADMIN') replaced with isAdmin()/hasPermission() calls
metrics:
  duration: 17m34s
  completed: 2026-05-28
  files_created: 6
  files_modified: 22
  tasks: 2
  commits: 3
---

# Phase 35 Plan F02: Final Compliance Sweep Summary

**Objective:** Close remaining P1 gaps from the audit — schema ownership reorganization, inline role check replacement, response envelope completeness, and error code taxonomy adoption.

One-liner: Distribute 8 schemas to 6 entity-owned modules, replace 7 direct role comparisons with canonical helpers, add CONFLICT/GONE error codes, and fix 11 non-canonical apiSuccess+error patterns across routes.

---

## Tasks Executed

| Task | Name                                                  | Commit    | Key Files                                                                                                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Schema ownership reorganization and inline role check | `7749ffe` | src/entities/{booking,chat,content,events,maintenance,tenant}/schema.ts, src/shared/api/schemas.ts, src/entities/tenant/api/permissions.ts, src/app/api/messages/route.ts, src/app/api/resources/route.ts, src/app/api/groups/[id]/route.ts, src/app/api/admin/settings/page-flags/route.ts                 |
| 2    | Response envelope and error code adoption audit       | `29bd75b` | src/shared/api/api-response.ts, src/app/api/auth/signup/route.ts, src/app/api/platform/tenants/route.ts, src/app/api/seats/route.ts, src/app/api/users/[id]/suspend/route.ts, src/app/api/users/[id]/unsuspend/route.ts, src/app/api/invitations/validate/route.ts, src/app/api/invitations/accept/route.ts |
| 2b   | Remaining apiSuccess+error fixes                      | `80a8ff0` | src/app/api/settings/[key]/route.ts, src/app/api/groups/membership-requests/[id]/route.ts, src/app/api/admin/platform/assist/{[id],}/route.ts, src/app/api/community-services/{reviews,inquiries}/route.ts, src/app/api/premium/{listings,portfolio}/route.ts                                               |

## Schema Ownership Changes

| Schema                     | Moved To                       | Status                             |
| -------------------------- | ------------------------------ | ---------------------------------- |
| `bookingSchema`            | `@entities/booking/schema`     | Created + re-export                |
| `messageSchema`            | `@entities/chat/schema`        | Created + re-export                |
| `conversationSchema`       | `@entities/chat/schema`        | Created + re-export                |
| `contentSchema`            | `@entities/content/schema`     | Created + re-export                |
| `groupSchema`              | `@entities/content/schema`     | Created + re-export                |
| `surveySchema`             | `@entities/content/schema`     | Created + re-export                |
| `announcementSchema`       | `@entities/content/schema`     | Created + re-export                |
| `eventSchema`              | `@entities/events/schema`      | Created + re-export                |
| `adminEventSchema`         | `@entities/events/schema`      | Created + re-export                |
| `adminCompetitionSchema`   | `@entities/events/schema`      | Created + re-export                |
| `maintenanceRequestSchema` | `@entities/maintenance/schema` | Created + re-export                |
| `signupSchema`             | `@entities/tenant/schema`      | Created + re-export                |
| `userProfileSchema`        | `src/shared/api/schemas.ts`    | Kept — no user entity api/ dir yet |

## Inline Role Check Changes

| Route File                           | Change                                              |
| ------------------------------------ | --------------------------------------------------- |
| `messages/route.ts`                  | `role !== 'ADMIN'` → `hasPermission(role, 'admin')` |
| `admin/settings/page-flags/route.ts` | `role !== 'ADMIN'` → `isAdmin(role)`                |
| `groups/[id]/route.ts`               | Added missing auth checks on PATCH and DELETE       |

## Error Code Taxonomy Additions

| Code     | Wrapper            | HTTP Status |
| -------- | ------------------ | ----------- |
| CONFLICT | `apiConflict(msg)` | 409         |
| GONE     | `apiGone(msg)`     | 410         |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing auth checks on groups/[id]/route.ts PATCH and DELETE**

- **Found during:** Task 1
- **Issue:** PATCH and DELETE handlers had no authentication or role checks at all — anyone could modify or delete any group
- **Fix:** Added session verification and `hasPermission()` role check for `groups`/`groupsOwn` permissions
- **Files modified:** `src/app/api/groups/[id]/route.ts`
- **Commit:** `7749ffe`

**2. [Rule 2 - Missing Critical Functionality] Non-canonical apiSuccess+error patterns in 11 route files**

- **Found during:** Task 2 sweep
- **Issue:** 11 route handlers used `apiSuccess({ error: ... })` instead of `apiError()` or canonical error wrappers — this corrupts the response envelope
- **Fix:** Replaced with `apiError('VALIDATION_ERROR', ..., 400)`, `apiForbidden(...)`, `apiConflict(...)`, `apiGone(...)`, and `apiInternalError(...)` as appropriate
- **Files modified:** 11 route files across auth, platform, invitations, groups, assist, community-services, premium, settings
- **Commits:** `29bd75b`, `80a8ff0`

**3. [Rule 2 - Missing Critical Functionality] apiConflict/apiGone wrappers did not exist**

- **Found during:** Task 2
- **Issue:** Routes used `apiError('VALIDATION_ERROR', ..., 409)` and `apiError('VALIDATION_ERROR', ..., 410)` with non-matching error codes
- **Fix:** Added `CONFLICT` and `GONE` to the canonical error taxonomy with `apiConflict()` and `apiGone()` convenience wrappers. Updated all 13 instances.
- **Files modified:** `src/shared/api/api-response.ts`, 7 route files
- **Commit:** `29bd75b`

**4. [Rule 1 - Bug] Non-canonical response in platform/tenants route's auth error handler**

- **Found during:** Task 2
- **Issue:** Auth error in tenant creation returned `apiSuccess({ error: ... }, { status: authResponse.status })` instead of proper error
- **Fix:** Replaced with `apiError()` or `apiInternalError()` as appropriate
- **Files modified:** `src/app/api/platform/tenants/route.ts`
- **Commit:** `29bd75b`

## Verification Results

| Check                             | Result                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| `npx tsc --noEmit`                | Passes — only pre-existing prisma/seed.ts errors (36)            |
| `NextResponse.json` in routes     | **0 instances** — all using canonical helpers                    |
| `new Response()` in routes        | **0 instances** (excluding health/route.ts)                      |
| `apiSuccess({error})` patterns    | **0 instances** — all using canonical error helpers              |
| Direct role comparisons in routes | **0 instances** — all using canonical permission helpers         |
| Error code taxonomy               | **12 codes** — covers all HTTP scenarios                         |
| Schema ownership                  | **6 entity-owned schema.ts files** — all re-exported from shared |

## Deferred Items

- `userProfileSchema` remains in `src/shared/api/schemas.ts` — the `user` entity has no `api/` directory yet. Move when user entity is modularized.

- `adminCompetitionSchema` placed in `@entities/events/schema` as a pragmatic choice — competitions don't have their own entity module yet. Move when competitions become a standalone entity.

## Self-Check: PASSED

- [x] 6 entity schema files created and verified
- [x] All re-exports from shared schemas.ts verified
- [x] 3 commits made with proper format
- [x] 16 route files modified with canonical patterns
- [x] Zero non-canonical response patterns remain
- [x] Zero direct role comparisons in route handlers
- [x] CONFLICT and GONE added to error taxonomy
- [x] TypeScript compiles (zero errors from modified files)
