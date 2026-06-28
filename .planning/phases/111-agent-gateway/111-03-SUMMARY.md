---
phase: 111-agent-gateway
plan: 03
subsystem: auth
tags: [agent-gateway, jwt, access-control, delegation, scope-resolution]

# Dependency graph
requires:
  - phase: 111-01
    provides: AgentToken model, validateToken(), AgentScopeConfig types
  - phase: 111-02
    provides: AgentAccess model, delegation API foundation
  - phase: 110-page-nav-access-control
    provides: resolvePageAccess() pipeline, /api/access endpoint, usePageAccess() hook
provides:
  - resolveAgentScope() — 4-step async pipeline (JWT → delegation → suspension → flags)
  - Updated resolveAgent() — real scope resolution replacing the stub
  - Async resolvePageAccess() — passes tenantId + flags to agent resolver
  - Richer AccessResolution.agent — tokenId + delegationId for audit trail
  - Agent-ready usePageAccess() — optional agentToken param
  - Agent-scoped canAccessClient() — optional agentScope parameter
affects: [phase-111-04, phase-110, agent-widget, resident-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [async-access-pipeline, agent-scope-intersection, delegation-scope-to-agent-scope]

key-files:
  created:
    - src/entities/access/types.test.ts
  modified:
    - src/entities/access/resolver.ts
    - src/entities/access/types.ts
    - src/entities/access/resolver.test.ts
    - src/app/api/access/route.ts
    - src/shared/lib/hooks/usePageAccess.ts
    - src/features/gate/model/gate.ts

key-decisions:
  - 'resolveAgentScope() — 4-step pipeline: validate JWT → check delegation → check owner suspension → intersect flags'
  - 'Drizzle queries used (not Prisma) — db.select().from(agentAccesses).where() etc.'
  - 'Scope intersection narrows only — never expands beyond tenant feature flag ceiling'
  - 'Resident opt-out via D-17: suspended owner → delegation paused → resolveAgentScope returns null'
  - 'canAccessClient() agent scope is non-breaking: optional parameter, defaults to absent'

patterns-established:
  - 'Agent scope resolution: async pipeline with early-return null on ANY failure (fail-closed)'
  - 'Scope intersection pattern: filter spaces/pages by tenant flags, strip disabled features'
  - 'Delegation-to-scope conversion: AgentPermission[] → AgentScopeConfig with API mapping'

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-06-28
---

# Phase 111 Plan 03: Agent Gateway Scope Pipeline Summary

**Wire resolveAgentScope() into Phase 110 access pipeline — replaces agent stub with real JWT validation, delegation checking, owner suspension awareness, and feature flag intersection. Client hooks extended for agent token transport and scope-gated access.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-28T05:11:23Z
- **Completed:** 2026-06-28T05:26:01Z
- **Tasks:** 5
- **Files modified/created:** 7 (6 modified, 1 created)

## Accomplishments

- `resolveAgentScope()` — 4-step async pipeline that validates agent JWT tokens, checks delegation status (ACTIVE), verifies granting owner is not suspended (D-17), and intersects allowed scope with tenant feature flags
- Phase 110's `/api/access?caller=agent&token=X` now returns real agent scopes (tokenId, delegationId, scope) instead of an empty stub
- Invalid/expired/revoked tokens and suspended owners result in `agent: null` (fail-closed — no access granted)
- Client-side `usePageAccess()` accepts optional `agentToken` parameter for agent-driven UI navigation
- `canAccessClient()` extended with optional `agentScope` parameter — non-breaking, existing callers unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing tests for resolveAgentScope** — `72ed3f2b` (test)
2. **Task 1 GREEN: implement resolveAgentScope** — `5ff1e03b` (feat)
3. **Task 2 RED: failing type tests for richer agent shape** — `332e350f` (test)
4. **Task 2 GREEN: update access types** — `345474e6` (feat)
5. **Task 3: update /api/access route** — `30004cb4` (feat)
6. **Task 5: extend usePageAccess + canAccessClient** — `0371ab1d` (feat)

_Note: Task 4 (test updates) was absorbed into Task 1 RED — all tests were updated to `await` during the RED phase._

## Files Created/Modified

- `src/entities/access/resolver.ts` — Added resolveAgentScope(), delegationScopeToAgentScope(), intersectScopeWithFlags(); updated resolveAgent() and resolvePageAccess() to async
- `src/entities/access/types.ts` — AccessResolution.agent now includes tokenId + delegationId; JSDoc updated
- `src/entities/access/types.test.ts` — New type-level tests for updated access contracts (6 tests)
- `src/entities/access/resolver.test.ts` — Added Layer 4 agent resolution tests; all tests migrated to `await`
- `src/app/api/access/route.ts` — await resolvePageAccess(); agent token comment updated
- `src/shared/lib/hooks/usePageAccess.ts` — usePageAccess(agentToken?); useVisibleSpaces(flags?, agentToken?)
- `src/features/gate/model/gate.ts` — canAccessClient() extended with optional agentScope parameter

## Decisions Made

- Used Drizzle queries throughout (not Prisma) — `db.select().from(agentAccesses).where(eq(...))` for delegation lookup, `db.select().from(users).where(eq(...))` for owner lookup, `db.select().from(platformSuspensions).where(and(...))` for suspension check
- Scope intersection via `intersectScopeWithFlags()` narrows only — spaces/pages stripped when their corresponding tenant flag is `false`; no flag key → allowed (no gating)
- `delegationScopeToAgentScope()` maps AgentPermission[] strings to structured AgentScopeConfig with API scope patterns and write action detection
- All existing callers of `useVisibleSpaces(flags)` and `canAccessClient(ctx, feature, opts)` remain backward-compatible (new parameters are optional)

## Deviations from Plan

None — plan executed exactly as written, with one adaptation:

**Adaptation: Drizzle instead of Prisma** — The plan's action code used Prisma syntax (`db.agentAccess.findUnique()`), but the project uses Drizzle for all queries. Adapted to Drizzle query patterns: `db.select().from(agentAccesses).where(eq(...)).limit(1)`. This is an implementation detail, not a deviation — same pipeline logic, same safety guarantees.

## Threat Flags

| Flag                  | File                            | Description                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| threat_flag: db-query | src/entities/access/resolver.ts | resolveAgentScope() makes up to 3 DB queries per agent call (token validation via validateToken, delegation lookup, user+suspension check). Threat T-111-17 (DoS) mitigated by ISR caching at route level (max-age=30) and maxDuration=5s cap. |

## Issues Encountered

None — implementation proceeded smoothly. All typecheck, lint, and test gates passed on first attempt.

## Known Stubs

None — the agent stub (`return { scope: [], expiresAt: null }`) was fully replaced with real scope resolution. Verified via `grep -rn "stub" src/entities/access/resolver.ts | grep -i agent` → 0 matches.

## Next Phase Readiness

- Agent scope pipeline complete — ready for Phase 111-04 (resident delegation widget)
- `resolveAgentScope()` is exported and ready for use in other server contexts
- `usePageAccess(agentToken)` enables agent-driven client navigation
- `canAccessClient(ctx, feature, opts, agentScope)` gates features by agent scope

---

_Phase: 111-agent-gateway_
_Completed: 2026-06-28_
