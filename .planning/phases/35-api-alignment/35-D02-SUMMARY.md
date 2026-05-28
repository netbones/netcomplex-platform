---
phase: 35-api-alignment
plan: D02
subsystem: api
tags: [rate-limiting, feature-gate, api-governance, security]
requires:
  - phase: 35-A01
    provides: Canonical API response envelope with ERROR_CODES (RATE_LIMITED, FEATURE_DISABLED)
provides:
  - In-memory rate limiting helper for high-traffic routes
  - Feature gate guard for module-gated API routes
affects: []
tech-stack:
  added: []
  patterns:
    - 'Rate limiting at route boundary before auth/logic'
    - 'Feature gate using DB-backed module enforcement system'
key-files:
  created:
    - src/shared/api/rate-limit.ts
    - src/shared/api/feature-gate.ts
  modified:
    - src/app/api/auth/signup/route.ts
    - src/app/api/auth/[...all]/route.ts
    - src/app/api/invitations/route.ts
    - src/app/api/messages/route.ts
    - src/app/api/notifications/route.ts
    - src/app/api/upload/route.ts
    - src/app/api/bookings/route.ts
    - src/app/api/community-services/listings/route.ts
key-decisions:
  - 'Feature gate reuses existing DB-backed isModuleEnabled from @entities/tenant/lib/modules instead of simpler Tenant.modules check — already handles tier enforcement + platform_modules + tenant_modules'
  - 'Rate limiter uses in-memory Map store (single-instance only) — Redis upgrade flagged for multi-instance production use in the TODO comment'
  - 'auth signup uses 3 req/hour (strictest), general auth uses 10 req/min, uploads 10 req/min, messages 30 req/min/user, notifications 60 req/min/user'
patterns-established:
  - 'Rate limiting injected at route entry before any DB queries or auth enforcement'
  - 'Feature gate returns canonical FEATURE_DISABLED with 403 status, never partially executes'
requirements-completed:
  - API-GOV-02
  - API-GOV-03
duration: 12min
completed: 2026-05-28
---

# Phase 35 Plan D02: Rate Limiting & Feature Gate Enforcement

**In-memory rate limiting for 6 high-traffic route categories and DB-backed feature gate guard for module-gated routes, both returning canonical error envelopes**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-28T13:57:13Z
- **Completed:** 2026-05-28T14:09:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Created `rate-limit.ts` with in-memory Map-based rate limiter supporting key-based, IP-based, and user-based limiting — applied to auth, signup, invitations, messages, notifications, and upload routes
- Created `feature-gate.ts` with `assertModuleEnabled()` that reuses the existing DB-backed module enforcement system (tier + platform_modules + tenant_modules) — applied to bookings and community-services routes
- All responses use canonical error envelopes: `RATE_LIMITED` (429) and `FEATURE_DISABLED` (403)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create rate limiting helper and apply to high-traffic routes** - `c090254` (feat)
2. **Task 2: Create feature gate guard and apply to module-gated routes** - `f2a1bee` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/shared/api/rate-limit.ts` - In-memory Map-based rate limiter with rateLimitByKey, rateLimitByIP, rateLimitByUser
- `src/shared/api/feature-gate.ts` - assertModuleEnabled guard wrapping existing isModuleEnabled with canonical FEATURE_DISABLED error
- `src/app/api/auth/signup/route.ts` - Rate limit: 3 req/hour per IP
- `src/app/api/auth/[...all]/route.ts` - Rate limit: 10 req/min per IP via wrapped POST handler
- `src/app/api/invitations/route.ts` - Rate limit: 5 req/min per IP
- `src/app/api/messages/route.ts` - Rate limit: 30 req/min per user
- `src/app/api/notifications/route.ts` - Rate limit: 60 req/min per user (POST + PATCH)
- `src/app/api/upload/route.ts` - Rate limit: 10 req/min per IP
- `src/app/api/bookings/route.ts` - Feature gate: bookings module check on GET + POST
- `src/app/api/community-services/listings/route.ts` - Feature gate: community_services module check on GET + POST

## Decisions Made

- **Feature gate uses existing DB-backed module system:** The plan initially suggested a simple `tenant.modules` field check, but the codebase already has a comprehensive module enforcement system in `@entities/tenant/lib/modules` that handles tier requirements, `platform_modules` definitions, and `tenant_modules` overrides. The feature gate reuses this infrastructure for correctness.
- **Rate limiter is in-memory only:** For single-instance deployments. A TODO comment flags the need for Redis in multi-instance production use.
- **Rate limit tiers:** Signup (strictest at 3/hr), auth wrapper (10/min), invitations (5/min), uploads (10/min), messages (30/min/user), notifications (60/min/user).

## Deviations from Plan

None - plan executed as written with the adaptation to use the existing module enforcement system.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Rate limiting infrastructure ready for additional route categories
- Feature gate pattern can be applied to remaining module-gated routes (surveys, maintenance, premium features)
- Both helpers ready for future Redis integration when scaling to multi-instance

---

_Phase: 35-api-alignment_
_Completed: 2026-05-28_
