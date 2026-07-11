---
phase: 124-onboarding-defer-provisioning
plan: 04
subsystem: auth
tags: [community-setup, react-hook-form, zod, better-auth, tenant-provisioning]

# Dependency graph
requires:
  - phase: 124-03
    provides: NullTenantLanding with "Create Community" CTA pointing to /create-community
provides:
  - CommunitySetupForm component (extracted from old signup Step 1) — reusable community-naming wizard
  - /create-community auth-gated route hosting the form
affects:
  - 124-05 (API route POST /api/platform/tenants used by CommunitySetupForm)
  - 124-06 (entry point wiring: account menu, Setup Center)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Client-side auth gate pattern: authClient.useSession() → isPending → !session redirect → tenantId check → render'
    - "Form submission with credentials: 'include' for cross-subdomain cookie forwarding"
    - 'React Hook Form + Zod validation via communitySetupSchema from @entities/tenant'

key-files:
  created:
    - src/features/auth/ui/CommunitySetupForm.tsx
    - src/app/(platform)/create-community/page.tsx
  modified:
    - src/features/auth/ui/index.ts (barrel export)

key-decisions:
  - 'E2E verification deferred to end-of-phase UAT — code-level checks (typecheck, ESLint) and CTA wiring pass independently'
  - 'Page-level auth gate is UX-only; real enforcement at API route (plan 124-05)'
  - 'CommunitySetupForm is self-contained (no props) — handles its own state, validation, submission, and redirect'

patterns-established:
  - 'Auth-gated page pattern: session check → LoadingSkeleton → redirect → render'
  - 'Error banner pattern for form submission: bg-red-50 border-red-200 text-red-700'

requirements-completed:
  - TENANT-04

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: 'CommunitySetupForm component — community name + subdomain + plan selection wizard extracted from old signup Step 1'
    requirement: TENANT-04
    verification:
      - kind: unit
        ref: 'pnpm typecheck'
        status: pass
    human_judgment: false
  - id: D2
    description: '/create-community auth-gated route — unauthenticated → /sign-in, provisioned → /dashboard, null-tenant → CommunitySetupForm'
    verification:
      - kind: unit
        ref: 'pnpm typecheck && pnpm lint'
        status: pass
    human_judgment: false
  - id: D3
    description: 'End-to-end flow: sign-up → verify → /home → Create Community CTA → /create-community → form submit → tenant created → /dashboard'
    verification: []
    human_judgment: true
    rationale: 'Full E2E requires live Better Auth session, POST /api/platform/tenants (plan 124-05), and database — deferred to end-of-phase UAT'

# Metrics
duration: 0min
completed: 2026-07-09
status: complete
---

# Phase 124 Plan 04: Community Setup Wizard Relocation Summary

**Relocated the community-naming wizard (community name, subdomain, plan) from the sign-up flow to behind authentication as a reusable CommunitySetupForm component**

## Performance

- **Duration:** 0 min (finalization — production tasks completed in prior wave)
- **Started:** 2026-07-09T14:10:18Z
- **Completed:** 2026-07-09T14:12:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint-approved)
- **Files modified:** 3

## Accomplishments

- `CommunitySetupForm` component extracted from old signup Step 1 — handles community name, subdomain (with `.netbones.co.za` suffix), and plan selection via radio cards fetched from `/api/pricing`
- Validated with `communitySetupSchema` (Zod) from `@entities/tenant`, submitted to `POST /api/platform/tenants` with `credentials: 'include'`
- `/create-community` route with full auth gate: unauthenticated → `/sign-in`, already-provisioned → `/dashboard`, null-tenant → `CommunitySetupForm`
- Entry point from `/home` NullTenantLanding "Create Community" CTA verified as wired (plan 124-03 Task 1)
- Additional entry points (account menu, Setup Center) documented for plan 124-06

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract CommunitySetupForm component** — `49981fcf` (feat)
2. **Task 2: Create /create-community route with auth gate** — `325e6135` (feat)
3. **Task 3: Checkpoint human-verify (E2E flow)** — APPROVED (E2E deferred to end-of-phase UAT; code-level checks pass)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/features/auth/ui/CommunitySetupForm.tsx` — Self-contained community-naming wizard: name input, subdomain with suffix, plan radio cards, error banners, loading state
- `src/features/auth/ui/index.ts` — Barrel export for CommunitySetupForm
- `src/app/(platform)/create-community/page.tsx` — Auth-gated page with PageLayout + PlatformHeader/Footer wrapping CommunitySetupForm

## Decisions Made

- E2E verification deferred to end-of-phase UAT — the checkpoint requires a live end-to-end flow (sign-up → verify email → create community → dashboard) which depends on plan 124-05 (API route) being in place. Code-level verification (typecheck, ESLint, CTA wiring) independently passes.
- Page-level `authClient.useSession()` check is UX convenience, not security — the API route (plan 124-05) is the real enforcement boundary
- `CommunitySetupForm` is self-contained (no props) — handles its own form state, validation, submission, and redirect via `router.push()`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Ready for 124-05 (POST /api/platform/tenants API route) — CommunitySetupForm already calls this endpoint with the correct payload shape
- 124-06 cleanup (account menu entry point, Setup Center link, dead code removal from signup wizard) can proceed

---

_Phase: 124-onboarding-defer-provisioning_
_Completed: 2026-07-09_
