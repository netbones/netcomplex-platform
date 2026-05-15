---
phase: 20-self-service-inception
plan: 01
subsystem: api
tags: [better-auth, drizzle, transaction, tenant-signup, onboarding, password-hashing]

# Dependency graph
requires:
  - phase: 19-schema-corrections-01
    provides: Tenant.ownerId field, user.isPlatformAdmin field
  - phase: 19-schema-corrections-03
    provides: isPlatformAdmin middleware guard, public /platform/signup path
provides:
  - Working self-service signup with proper password hashing via Better Auth
  - Tenant ownerId linked to founding admin user
  - Redirect to onboarding wizard after signup
affects: [20-self-service-inception-02, 20-self-service-inception-03, tenant-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Two-phase creation: create tenant → Better Auth signup → transactional link (ownerId + tenantId)'
    - 'Cleanup on failure: delete orphaned tenant if Better Auth signup fails'
    - 'Forward to Better Auth HTTP endpoint for password hashing instead of raw DB insert'

key-files:
  created: []
  modified:
    - src/app/api/platform/tenants/route.ts
    - src/features/auth/model/useSignupForm.ts

key-decisions:
  - 'Used Better Auth HTTP endpoint (/api/auth/sign-up/email) for password hashing instead of programmatic API'
  - 'Two-phase creation with transactional linking — Better Auth HTTP call cannot be wrapped in db.transaction()'
  - 'Orphan cleanup: delete tenant if Better Auth signup fails to prevent leaked tenants'

patterns-established:
  - 'Platform signup: tenant first, then Better Auth user, then transactional link'
  - 'Response includes tenantId for frontend onboarding redirect'

requirements-completed: [INCEPT-01, INCEPT-02]

# Metrics
duration: 6min
completed: 2026-05-15T13:45:00Z
---

# Phase 20 Plan 01: Self-Service Signup Fix Summary

**Fixed self-service signup to use Better Auth for password hashing, set Tenant.ownerId, and redirect to onboarding wizard**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-15T13:39:00Z
- **Completed:** 2026-05-15T13:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Signup API now creates user via Better Auth's `/api/auth/sign-up/email` endpoint — password properly hashed
- Tenant ownerId set to founding admin user's id via atomic db.transaction()
- Signup form redirects to `/platform/onboarding/{tenantId}` instead of external sign-in URL
- Orphan cleanup: if Better Auth signup fails, the partially-created tenant is deleted
- API response includes `tenantId` for frontend redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix signup API to set ownerId and use Better Auth for password** - `53d74b0` (feat)
2. **Task 2: Update signup form to redirect to onboarding wizard** - `4f8a653` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `src/app/api/platform/tenants/route.ts` - Replaced raw user insert with Better Auth signup, added transactional ownerId/tenantId linking, orphan cleanup, tenantId in response
- `src/features/auth/model/useSignupForm.ts` - Changed redirect from external sign-in URL to `/platform/onboarding/{tenantId}`

## Decisions Made

- Used Better Auth HTTP endpoint instead of programmatic API because `auth.api.signUpEmail()` is not available on the server-side auth instance — the HTTP forward pattern is already established in `/api/auth/signup/route.ts`
- Two-phase creation necessary because Better Auth HTTP call cannot be wrapped in a Drizzle transaction — instead, we create tenant first, call Better Auth, then link both in a transaction
- Added cleanup logic to delete orphaned tenant if Better Auth signup fails — prevents database pollution from partial signups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Self-service signup flow complete: create tenant → hash password → link ownerId → redirect to onboarding
- Ready for next plan in phase 20 (onboarding wizard implementation)
- Requires dev server running to test full signup flow end-to-end

---

_Phase: 20-self-service-inception_
_Completed: 2026-05-15_
