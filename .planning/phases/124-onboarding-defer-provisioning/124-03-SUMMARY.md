---
phase: 124-onboarding-defer-provisioning
plan: 03
subsystem: ui
tags: [react, nextjs, better-auth, tailwind, landing-page, null-tenant]

requires:
  - phase: 124-01
    provides: Nullable tenantId at every layer (DB, ORM, auth, RLS)
  - phase: 124-02
    provides: Collapsed signup form (2-step, identity only)
provides:
  - Auth-gated null-tenant landing page at /home with two-card choice UI
  - NullTenantLanding component with loading, demo, and create community cards
  - Return-visit detection via localStorage
affects:
  - 124-04 (create-community route renders after landing CTA)
  - 124-06 (cleanup — old marketing sections may be reorganized)

tech-stack:
  added: []
  patterns:
    - 'Auth gating pattern: authClient.useSession() → isPending/!session/tenantId check → redirect/render'
    - 'inferAdditionalFields for Better Auth type augmentation on client'

key-files:
  created:
    - src/features/platform/ui/NullTenantLanding.tsx
  modified:
    - src/app/(platform)/home/page.tsx
    - src/features/platform/ui/index.ts
    - src/shared/api/auth-client.ts

key-decisions:
  - 'Demo card hidden behind TODO(G2) comment — showDemo=false until demo tenant exists and feature flag enable-demo-tenant is wired'
  - 'Return-visit detection uses localStorage key visited-landing — simple, no server round-trip'
  - 'Unauthenticated users see the existing marketing page (preserved) — auth gating is additive, not destructive'

patterns-established:
  - 'Pattern 1: Null-tenant landing page auth gating — useSession → isPending(loading) → !session(marketing) → tenantId!=null(redirect) → tenantId==null(landing)'
  - 'Pattern 2: inferAdditionalFields augmentation — client-side type safety for Better Auth custom user fields'

requirements-completed:
  - TENANT-03

coverage:
  - id: D1
    description: 'NullTenantLanding component with two-card UI (demo + create community)'
    requirement: 'TENANT-03'
    verification:
      - kind: unit
        ref: 'pnpm typecheck — no TS2339 on tenantId, no errors in platform/ui'
        status: pass
    human_judgment: true
    rationale: 'Visual layout, responsive behavior, and interactive card CTAs require browser verification'
  - id: D2
    description: '/home page auth-gated — loading skeleton, marketing fallback, tenant redirect, null-tenant landing'
    verification:
      - kind: unit
        ref: 'pnpm typecheck — home/page.tsx compiles cleanly'
        status: pass
      - kind: unit
        ref: 'pnpm lint — home/page.tsx passes ESLint'
        status: pass
    human_judgment: true
    rationale: 'Full auth flow (signup → verify → /home → tenantId check) requires running dev server with database. Deferred to end-of-phase UAT.'

duration: 6min
completed: 2026-07-09
status: complete
---

# Phase 124 Plan 03: Null-Tenant Landing — /home Auth-Gated Two-Card Choice UI

**Auth-gated `/home` route: NullTenantLanding component with two-card choice (Demo + Create Community), session check, tenantId redirect, and return-visit detection — public marketing page preserved for unauthenticated visitors**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-09T13:54:26Z
- **Completed:** 2026-07-09T14:00:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `NullTenantLanding` client component with hero heading, two-card grid (demo + create community), sign-out link, and loading skeleton state
- Rewrote `/home` page with auth gating: loading skeleton during session check, marketing page for unauthenticated visitors, dashboard redirect for existing tenants, landing UI for null-tenant users
- Added `tenantId` to `inferAdditionalFields` in `auth-client.ts` for client-side TypeScript type safety
- Demo card hidden behind `TODO(G2)` comment — `showDemo=false` until demo tenant exists
- Return-visit detection via `localStorage` key `visited-landing` — heading changes on subsequent visits

## Task Commits

Each task was committed atomically:

1. **Task 1: Create NullTenantLanding component** — `4dae3e02` (feat: create NullTenantLanding component with two-card choice UI)
2. **Task 2: Rewrite /home page as auth-gated landing** — `b499995e` (feat: rewrite /home as auth-gated landing with session + tenantId checks)

## Files Created/Modified

- `src/features/platform/ui/NullTenantLanding.tsx` — Two-card landing component (demo + create community, loading skeleton, sign-out)
- `src/features/platform/ui/index.ts` — Barrel export added for NullTenantLanding
- `src/app/(platform)/home/page.tsx` — Rewritten as auth-gated client component with session/tenantId checks
- `src/shared/api/auth-client.ts` — Added `tenantId: { type: 'string', nullable: true }` to `inferAdditionalFields`

## Decisions Made

- Demo card is hidden (`showDemo=false`) with `TODO(G2)` comment — feature flag `enable-demo-tenant` wire point is documented
- Return-visit detection uses localStorage — simple, no server round-trip, UX is cosmetic (heading text change only)
- Unauthenticated visitor path (marketing page) is fully preserved — auth gating is additive, not a rewrite
- `isReturnVisit` prop passed from parent page (where localStorage is checked) to component — separation of concerns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing tenantId from Better Auth client type inference**

- **Found during:** Task 2 (typecheck)
- **Issue:** `session.user.tenantId` caused TS2339 — `inferAdditionalFields` in `auth-client.ts` only inferred `role`, not `tenantId`
- **Fix:** Added `tenantId: { type: 'string', nullable: true }` to `inferAdditionalFields` user config
- **Files modified:** `src/shared/api/auth-client.ts`
- **Verification:** `pnpm typecheck` passes with no errors on home/page.tsx
- **Committed in:** `b499995e` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Type safety fix for Better Auth client — enables TypeScript-aware access to `session.user.tenantId`. No behavioral change.

## Issues Encountered

None — plan executed with one auto-fixed type inference gap.

## Checkpoint Deferred

A `checkpoint:human-verify` (Task 3) was deferred to end-of-phase UAT per plan directive: _"For human-verify checkpoints that are self-satisfiable via typecheck/tests, or that the plan defers to end-of-phase UAT, complete them and continue."_

The verification steps:

1. Sign up via 2-step wizard, verify email
2. Confirm landing on /home with "Welcome to NetComplex" heading + two cards
3. Click "Create Community" → navigates to /create-community (built in 124-04)
4. Visit /home unauthenticated → shows marketing page
5. Sign in with existing tenant → redirects to /dashboard

These require a running dev server with full signup flow — typecheck alone cannot validate.

## Threat Flags

None. All threat model mitigations from plan's STRIDE register are honored:

- T-124-03-01 (Info Disclosure): `/home` is a platform-plane route — no tenant-scoped data. ✓ accepted
- T-124-03-02 (Elevation of Privilege): `tenantId !== null` → dashboard redirect. ✓ accepted
- T-124-03-03 (Spoofing): Demo card hidden (`showDemo=false`) until G2 resolved. ✓ deferred to G2
- T-124-03-SC (Tampering): No new packages. ✓ mitigated

## Next Phase Readiness

- Ready for 124-04 (create-community route — `/create-community` page with CommunitySetupForm)
- `/create-community` route is already wired in NullTenantLanding CTA button — will resolve when 124-04 lands
- `auth-client.ts` `inferAdditionalFields` now includes `tenantId` — all downstream plans that read `session.user.tenantId` on the client will have correct types

---

_Phase: 124-onboarding-defer-provisioning_
_Completed: 2026-07-09_

## Self-Check: PASSED

- [x] `src/features/platform/ui/NullTenantLanding.tsx` exists
- [x] `src/features/platform/ui/index.ts` barrel updated
- [x] `src/app/(platform)/home/page.tsx` rewritten with auth gating
- [x] `src/shared/api/auth-client.ts` inferAdditionalFields includes tenantId
- [x] Commit `4dae3e02` — Task 1: NullTenantLanding component
- [x] Commit `b499995e` — Task 2: /home page rewrite
- [x] Commit `ceec4cd0` — docs: complete plan
- [x] `pnpm typecheck` — no errors on any plan-modified files
- [x] `pnpm lint` — passes on all plan-modified files
