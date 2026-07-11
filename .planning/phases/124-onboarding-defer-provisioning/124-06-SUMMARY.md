---
phase: 124-onboarding-defer-provisioning
plan: 06
subsystem: auth
tags: [onboarding, signup, cleanup, tenant-provisioning, dead-code]

# Dependency graph
requires:
  - phase: 124-02
    provides: identity-only sign-up (no tenant creation in sign-up flow)
  - phase: 124-04
    provides: community wizard relocated behind auth at /create-community
  - phase: 124-05
    provides: authenticated tenant provisioning endpoint (POST /api/platform/tenants requires session)
provides:
  - clean sign-up flow with zero references to tenant/plan creation
affects: [onboarding, signup, auth]

# Tech tracking
tech-stack:
  added: []
  patterns: [remove-unused-imports-on-cleanup, grep-gating-for-dead-code-removal]

key-files:
  created: []
  modified:
    - src/app/(platform)/signup/page.tsx

key-decisions:
  - 'Confirmed useSignupForm.ts and auth.ts were already clean from 124-01/124-02 — no changes needed there'
  - 'Removed unused pricing-plan state from signup page rather than leaving it dormant'
  - 'No reaper/TTL/reservation table added (explicitly rejected per ADVISORY-031 Option C)'
  - 'Documented community-creation entry points in SUMMARY rather than touching unrelated account-menu component'

patterns-established:
  - 'Cleanup plans verify residual removal with grep gates (POST /api/platform/tenants, defaultSlug, createTenant) before declaring done'

requirements-completed: [TENANT-06]

coverage:
  - id: D1
    description: 'No residual eager-provisioning references remain in the sign-up flow'
    requirement: TENANT-06
    verification:
      - kind: other
        ref: "rg 'POST /api/platform/tenants' src/features/auth/ src/app/(platform)/signup/ (zero matches)"
        status: pass
      - kind: other
        ref: "rg 'tenantConfig.defaultSlug' src/shared/api/auth.ts (zero matches in user.create.before hook)"
        status: pass
    human_judgment: false
  - id: D2
    description: 'Unused pricing-plan state removed from signup page; typecheck + lint clean'
    requirement: TENANT-06
    verification:
      - kind: other
        ref: 'pnpm typecheck (signup/page.tsx has no errors) + eslint src/app/(platform)/signup/page.tsx (exit 0)'
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-07-09
status: complete
---

# Phase 124 Plan 06: Retire Dead Eager-Provisioning Code Summary

**Removed residual eager-provisioning pricing state from the sign-up page, confirming `useSignupForm.ts` and `auth.ts` were already clean from prior plans — zero tenant-creation references remain in the sign-up flow, with no reaper/TTL added.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-09T17:23:52Z
- **Completed:** 2026-07-09T17:35:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Removed unused pricing-plan state (`plans`, `plansLoading`, `fetchPlans` useEffect) and now-unused imports (`useEffect`, `useState`, `PricingConfig`, `createComponentLogger`) from `src/app/(platform)/signup/page.tsx`.
- Verified `src/features/auth/model/useSignupForm.ts` already uses `authClient.signUp.email()` (no `fetch('/api/platform/tenants')`, no `handleSubdomainChange`, no `signupSchema` community fields) — leftover from 124-02.
- Verified `src/shared/api/auth.ts` `user.create.before` hook fallback is `tenant?.id ?? rawTenantId ?? null` with no `tenantConfig.defaultSlug` (leftover from 124-01). The `tenantConfig` import is retained because it is still used by twoFactor issuer, cookiePrefix, and allowedHosts.
- Confirmed `src/features/auth/ui/index.ts` already exports `CommunitySetupForm` (added in 124-04).
- Confirmed zero `eager.provision` / `createTenant` references and zero reaper/TTL/cron/reservation code across the auth feature and sign-up flow.
- Documented the community-creation entry points (NullTenantLanding "Create Community" CTA → `/create-community`; account-menu "Create Community" item; future Setup Center integration owned by Phase 123).

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove residual tenant-creation code from sign-up flow** - `7f08f808` (fix)
2. **Task 2: Document entry points + barrel audit + cross-plan verification** - verification only, no code changes (no commit).

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `src/app/(platform)/signup/page.tsx` - Removed unused pricing-plan state and imports; sign-up is now identity-only with no tenant/plan data fetch.

## Decisions Made

- **useSignupForm.ts / auth.ts left unchanged:** Both were already compliant with the deferred-provisioning model from plans 124-01 and 124-02. The cleanup sweep confirmed this via grep gates rather than making redundant edits.
- **No reaper/TTL:** Per ADVISORY-031 Option C (explicitly rejected), no reservation table, TTL column, cron job, or cleanup reaper was added. The null-tenant state is durable and indefinite by design.
- **Entry points documented in SUMMARY:** Rather than editing the unrelated account-menu component (scope boundary), the community-creation entry points are documented here as the canonical reference for future wiring.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as written. The residual code to remove was confined to `signup/page.tsx`; the other two audited files were already clean.

### Pre-existing out-of-scope typecheck noise

**1. [Scope boundary - Pre-existing] Full `pnpm typecheck` shows errors in committed test files**

- **Found during:** Task 2 verification
- **Issue:** `pnpm typecheck` reports type errors in `src/test/phase-124/auth-provisioning.test.ts` (NextRequest/Request mismatch, committed in 124-05) and `src/test/api/trpc-error-codes.test.ts`. These are pre-existing in committed files from prior phase plans, NOT introduced by this cleanup.
- **Fix:** None applied — out of scope per the deviation scope-boundary rule (do not auto-fix pre-existing issues in unrelated files). The files touched by this plan (`signup/page.tsx`, `useSignupForm.ts`, `auth.ts`) compile cleanly and produce zero new typecheck/lint errors.
- **Files modified:** none (verification only)
- **Verification:** `signup/page.tsx` has no type errors in the full typecheck output; ESLint on the file exits 0.

---

**Total deviations:** 0 auto-fixed for plan tasks. 1 documented pre-existing condition (out of scope, no change).
**Impact on plan:** Cleanup is complete and isolated; no scope creep. Pre-existing test-file type errors remain owned by their originating plans.

## Issues Encountered

- Pre-existing `pnpm typecheck` failures in committed phase-124 test files (introduced by 124-05). Out of scope for this cleanup plan; flagged for the originating plan's owner. No blocker to declaring the cleanup complete.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 124 (Onboarding Refactor — Defer Tenant Provisioning) is complete: 6/6 plans executed (124-01 nullable tenantId → 124-02 identity sign-up → 124-03 null-tenant landing → 124-04 relocated wizard → 124-05 authenticated provisioning → 124-06 cleanup).
- The sign-up flow is now fully decoupled from tenant creation. Community creation is an authenticated, re-invocable action via `/create-community`.
- **Merge gate:** Per ROADMAP, review by **DavDev** is required before `wt merge`. This phase rewrites the sign-up path and introduces the null-tenant identity state.
- No reaper/TTL was added; the null-tenant state is durable by design.

---

_Phase: 124-onboarding-defer-provisioning_
_Completed: 2026-07-09_
