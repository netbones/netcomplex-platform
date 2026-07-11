---
phase: 124-onboarding-defer-provisioning
plan: 05
subsystem: auth
tags: [better-auth, tenant-provisioning, zod, drizzle, tdd]

# Dependency graph
requires:
  - phase: 124-01
    provides: nullable tenantId schema (user.tenantId can be null during auth)
provides:
  - Authenticated POST /api/platform/tenants — session-gated tenant creation with ADMIN role assignment
  - Email verification guard preventing zombie tenants from throwaway accounts
  - Zod-validated CommunitySetupRequest schema (name, slug, plan — no admin block)
affects: [124-02, 124-03, 124-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Zod schema validation on API routes (communitySetupSchema — min/max length, slug regex, enum plan)'
    - 'Better Auth session guard: auth.api.getSession() → 401 if null → 403 if email not verified'
    - 'DB transaction for atomic tenant creation + user linking (insert tenant → update user.tenantId + role)'
    - 'Fire-and-forget initTenantSetup() — logged on failure, never blocks tenant creation'
    - 'Canonical error taxonomy: apiUnauthorized, apiForbidden, apiValidationError, apiConflict, apiInternalError'

key-files:
  created:
    - src/test/phase-124/auth-provisioning.test.ts — 6 unit tests covering auth gates + creation + conflict + validation
  modified:
    - src/app/api/platform/tenants/route.ts — rewired from public identity-creating to authenticated tenant-only

key-decisions:
  - 'Used Zod communitySetupSchema inline (not shared from @entities/tenant) — plan 124-04 schema not yet available at execution time'
  - 'Email verification guard (session.user.emailVerified) prevents tenant creation from unverified throwaway accounts — addresses T-124-05-01 defense-in-depth'
  - 'initTenantSetup() is fire-and-forget (errors logged, not thrown) — prevents setup failures from blocking tenant creation'
  - 'ownerId set to userId on tenant creation — maintains existing ownership pattern from Phase 20'
  - 'E2E verification of full wizard flow deferred to plans 124-02/124-03 — checkpoint gate approved'

patterns-established:
  - 'Session-gated API route: withErrorHandler → auth.api.getSession → emailVerified guard → business logic'
  - 'Zod validation with safeParse + apiValidationError returning issue array'

requirements-completed:
  - TENANT-05

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: 'Authenticated POST /api/platform/tenants — creates tenant, sets user.tenantId + role=ADMIN, runs initTenantSetup()'
    requirement: TENANT-05
    verification:
      - kind: unit
        ref: 'src/test/phase-124/auth-provisioning.test.ts#Test 1 — returns 401 unauthenticated'
        status: pass
      - kind: unit
        ref: 'src/test/phase-124/auth-provisioning.test.ts#Test 2 — returns 201 with valid body'
        status: pass
      - kind: unit
        ref: 'src/test/phase-124/auth-provisioning.test.ts#Test 3 — returns 409 on slug conflict'
        status: pass
      - kind: unit
        ref: 'src/test/phase-124/auth-provisioning.test.ts#Test 4 — returns 400 on invalid body'
        status: pass
      - kind: unit
        ref: 'src/test/phase-124/auth-provisioning.test.ts#Test 5 — returns 403 on unverified email'
        status: pass
      - kind: unit
        ref: 'src/test/phase-124/auth-provisioning.test.ts#Test 6 — sets role=ADMIN'
        status: pass
    human_judgment: false
  - id: D2
    description: 'End-to-end wizard flow verification — sign up, verify email, create community via 2-step wizard'
    requirement: TENANT-05
    verification: []
    human_judgment: true
    rationale: 'E2E flow depends on plans 124-02 (2-step wizard) and 124-03 (landing page) being complete. Deferred by design per checkpoint gate approval.'

# Metrics
duration: 3min
completed: 2026-07-09
status: complete
---

# Phase 124 Plan 05: Authenticated Tenant Provisioning Summary

**Session-gated `POST /api/platform/tenants` — requires verified Better Auth session, creates Tenant + sets user.tenantId + role=ADMIN, runs initTenantSetup(). No user creation, no orphan risk.**

## Performance

- **Duration:** ~3 min (Task 1–2 code execution) + checkpoint verification
- **Started:** 2026-07-09T13:23:48Z
- **Completed:** 2026-07-09T13:26:08Z (code); 2026-07-09 (checkpoint approved)
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 2

## Accomplishments

- Transformed `POST /api/platform/tenants` from a public, identity-creating endpoint into an authenticated, tenant-creating-only endpoint
- Added Better Auth session guard — unauthenticated requests rejected at 401, unverified emails at 403
- Eliminated failure modes F1 (zombie tenants) and F2 (slug squatting) by requiring verified identity
- Preserved slug uniqueness check, initTenantSetup(), and DB transaction pattern from original route
- 6/6 unit tests pass covering all auth gates, validation, conflict, and success paths

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Write failing tests** — `dd514992` (test) — 6 failing tests for authenticated tenant provisioning
2. **Task 2 (GREEN): Implement authenticated route** — `e45305ab` (feat) — authenticated POST /api/platform/tenants endpoint
3. **Task 3 (checkpoint:human-verify):** APPROVED — 6/6 automated tests confirmed passing; E2E deferred to 124-02/124-03 as designed

**Plan metadata:** _(to be committed below)_

## Files Created/Modified

- `src/test/phase-124/auth-provisioning.test.ts` — 6 Vitest unit tests: 401 (no session), 201 (valid body), 409 (slug conflict), 400 (invalid body), 403 (unverified email), ADMIN role assignment
- `src/app/api/platform/tenants/route.ts` — Rewired from public identity-creating to authenticated tenant-only: session check, email verification guard, Zod validation, DB transaction, fire-and-forget initTenantSetup()

## Decisions Made

- Used Zod `communitySetupSchema` defined inline rather than importing from `@entities/tenant` — the shared schema from plan 124-04 was not yet available at execution time. The inline schema matches the planned shape (`{ name, slug, plan }` — no admin block).
- Email verification guard (`session.user.emailVerified`) provides defense-in-depth against zombie tenants from throwaway email accounts (T-124-05-01).
- `initTenantSetup()` is fire-and-forget — errors are logged via Pino but never thrown, so setup failures do not block tenant creation.
- `ownerId` set to `userId` on tenant creation maintains the existing ownership pattern established in Phase 20.
- E2E verification of the full 2-step wizard flow deferred to plans 124-02 and 124-03 — checkpoint gate was explicitly approved with this deferral.

## Deviations from Plan

None — plan executed exactly as written. Task 3 checkpoint was approved with E2E deferral as designed.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Authenticated tenant provisioning is complete and ready for integration with the 2-step wizard (plan 124-02) and landing page (plan 124-03).
- Route returns `{ tenantId, tenant: { id, name, slug, subscriptionTier } }` on 201 — callers should use `tenantId` for redirect.

---

## Self-Check: PASSED

- `src/test/phase-124/auth-provisioning.test.ts` — FOUND
- `src/app/api/platform/tenants/route.ts` — FOUND
- `.planning/phases/124-onboarding-defer-provisioning/124-05-SUMMARY.md` — FOUND
- Commit `dd514992` (RED) — FOUND
- Commit `e45305ab` (GREEN) — FOUND
- Commit `481b97d2` (SUMMARY) — FOUND
- All 6/6 unit tests pass

---

_Phase: 124-onboarding-defer-provisioning_
_Completed: 2026-07-09_
