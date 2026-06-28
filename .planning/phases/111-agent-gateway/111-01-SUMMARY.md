---
phase: 111-agent-gateway
plan: 01
subsystem: auth
tags: [prisma, drizzle, jwt, jose, es256, agent-token, delegation]

# Dependency graph
requires: []
provides:
  - AgentToken model (tokenHash unique, scope jsonb, revokedAt, lastUsedAt)
  - DelegationAction model (audit log with delegationId/tenantId/actorId indexes)
  - ResidentDelegation model (owner→renter scoped initiation rights)
  - DelegationStatus enum (PENDING/ACTIVE/REJECTED/REVOKED/EXPIRED)
  - AgentAccess evolution (isActive→status, originalPermissions, timestamps)
  - Agent entity type layer (Agent union, AgentTokenPayload, AgentScopeConfig, AGENT_SCOPES)
  - Token utility module (signAgentToken, hashToken, validateToken, parseAgentToken)
  - Token CRUD API (POST /api/agent/tokens, GET list, PATCH revoke)
  - CredentialVerifier abstraction (jwt_es256 default, pluggable for future wallet/on-chain)
affects: [111-agent-gateway, agent-auth, token-resolution]

# Tech tracking
tech-stack:
  added: [jose@6.2.3]
  patterns:
    - 'ES256 asymmetric JWT via jose generateKeyPair — private key signs, public key verifies'
    - 'AgentPermission enum removed; permissions stored as String[] validated against AgentScopeRegistry'
    - 'Drizzle queries for all API operations (db.insert, db.select, db.update patterns)'
    - 'CredentialVerifier interface for pluggable verifiers (future wallet/on-chain support)'
    - 'X-Agent-Token header with Bearer prefix support'

key-files:
  created:
    - prisma/schema.prisma (AgentToken, DelegationAction, ResidentDelegation models)
    - src/entities/agent/types.ts (Agent union, AgentTokenPayload, EffectiveScope)
    - src/entities/agent/scopes.ts (AGENT_SCOPES, SCOPE_BUNDLES, validateScopes)
    - src/entities/agent/index.ts (barrel)
    - src/shared/lib/agent-token.ts (signAgentToken, validateToken, parseAgentToken)
    - src/app/api/agent/tokens/route.ts (POST + GET)
    - src/app/api/agent/tokens/[id]/revoke/route.ts (PATCH revoke)
    - src/entities/agent/__tests__/schema.test.ts (19 tests)
    - src/entities/agent/__tests__/types.test.ts (9 tests)
    - src/shared/lib/__tests__/agent-token.test.ts (9 tests)
  modified:
    - src/server/routers/agents.ts (isActive→status)
    - src/server/routers/identity.ts (isActive→status, agentAccessSchema update)
    - src/shared/lib/index.ts (agent-token exports barrel)
    - src/db/schema/agent-accesses.ts (Drizzle generated)
    - src/db/schema/agent-accesses-relations.ts (Drizzle generated)

key-decisions:
  - 'D-01: AgentToken complements AgentAccess — AgentAccess is the grant, AgentToken is the issued credential'
  - 'D-02: AgentAccess.status replaces isActive with PENDING/ACTIVE/REJECTED/REVOKED/EXPIRED workflow'
  - 'D-03: AgentPermission enum removed; permissions stored as String[] validated against AgentScopeRegistry'
  - 'D-12: ES256 asymmetric keypair via jose generateKeyPair'
  - 'D-13: CredentialVerifier abstraction for pluggable verifiers'
  - 'D-14: Raw token returned only on creation; tokenHash stored in DB'
  - 'D-22: ResidentDelegation model for owner→renter scoped initiation rights'

requirements-completed: []

# Metrics
duration: 28min
completed: 2026-06-28
---

# Phase 111 Plan 01: Agent Token Data Model & Lifecycle Summary

**AgentToken model with ES256 JWT signing via jose, DelegationAction audit log, AgentAccess status workflow evolution, and token CRUD API — foundation for all Phase 111 agent authentication**

## Performance

- **Duration:** 28 min
- **Started:** 2026-06-28T04:22:22Z
- **Completed:** 2026-06-28T04:50:45Z
- **Tasks:** 4
- **Files modified:** 15

## Accomplishments

- AgentToken table created with tokenHash (unique), scope (jsonb), credentialType, revokedAt, lastUsedAt — 7 Drizzle schema files generated
- AgentAccess evolved: isActive→DelegationStatus enum (PENDING/ACTIVE/REJECTED/REVOKED/EXPIRED), added originalPermissions (immutable ceiling), acceptedAt/rejectedAt/revokedAt timestamps
- DelegationAction audit log with delegationId, tenantId, and actorId indexes for lifecycle event tracking
- ResidentDelegation model for owner→renter scoped initiation rights
- Agent entity type layer: Agent union type (HumanAgent/AIAgent/CronAgent/DelegatedProviderAgent), AgentTokenPayload, EffectiveScope, TokenValidationResult, AGENT_SCOPES registry (20 domain:action scopes), SCOPE_BUNDLES (4 bundles)
- Token utility module: signAgentToken (ES256), hashToken (sha256), validateToken (end-to-end with DB revocation check), parseAgentToken (X-Agent-Token header), CredentialVerifier abstraction
- Token CRUD API: POST /api/agent/tokens (issue scoped JWT, admin-only), GET /api/agent/tokens (list, no raw tokens), PATCH /api/agent/tokens/[id]/revoke (revoke, admin-only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma migration (TDD)** — `063890a0` (test), `6f3b20fe` (feat)
2. **Task 2: Agent types (TDD)** — `3354e5eb` (test), `ab24295b` (feat)
3. **Task 3: Token utilities (TDD)** — `435456f6` (test + jose install), `60a75f51` (feat)
4. **Task 4: API routes** — `bac30b7e` (feat)

_Note: TDD tasks 1-3 have RED (test) + GREEN (feat) commits. No REFACTOR phase was needed for any task._

## Files Created/Modified

- `prisma/schema.prisma` — AgentToken, DelegationAction, ResidentDelegation models; DelegationStatus enum; AgentAccess evolution; AgentPermission enum removal; back-relations on user/Profile/Property/AgentAccess
- `src/entities/agent/types.ts` — Agent union type, AgentScopeConfig, AgentTokenPayload, EffectiveScope, TokenValidationResult
- `src/entities/agent/scopes.ts` — AGENT_SCOPES (20 scopes), SCOPE_BUNDLES (4 bundles), validateScopes()
- `src/entities/agent/index.ts` — Barrel re-exporting types and runtime values
- `src/shared/lib/agent-token.ts` — signAgentToken, hashToken, validateToken, parseAgentToken, verifyAndDecodeToken, CredentialVerifier, jwtVerifier, selectVerifier
- `src/app/api/agent/tokens/route.ts` — POST (issue token) + GET (list tokens)
- `src/app/api/agent/tokens/[id]/revoke/route.ts` — PATCH revoke token
- `src/entities/agent/__tests__/schema.test.ts` — 19 Drizzle schema verification tests
- `src/entities/agent/__tests__/types.test.ts` — 9 scope registry tests
- `src/shared/lib/__tests__/agent-token.test.ts` — 9 token utility tests
- `src/server/routers/agents.ts` — Fixed isActive→status
- `src/server/routers/identity.ts` — Fixed isActive→status + agentAccessSchema Zod update
- `src/shared/lib/index.ts` — Added agent-token exports to barrel
- `src/db/schema/agent-accesses.ts` — Drizzle generated (isActive removed, status+originalPermissions added)
- `src/db/schema/agent-tokens.ts` — Drizzle generated (new table)

## Decisions Made

- AgentPermission enum removed — permissions stored as String[] validated against AgentScopeRegistry at API layer
- Used Drizzle query patterns (not Prisma syntax) for all API operations — project convention
- Renamed AgentScope interface to AgentScopeConfig to resolve naming collision with AgentScope union type from scopes.ts
- Used prisma db push instead of prisma migrate dev due to pre-existing shadow database migration failure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma→Drizzle query adaptation**

- **Found during:** Task 4 (API routes)
- **Issue:** Plan code used Prisma syntax (`db.agentToken.create`, `db.agentToken.findUnique`, `db.agentToken.update`) but project uses Drizzle (`db.insert(agentTokens).values(...)`, `db.select().from(agentTokens)`, `db.update(agentTokens).set(...)`)
- **Fix:** Rewrote all 3 API endpoints (POST, GET, PATCH) to use Drizzle query patterns. Also fixed token validation in agent-token.ts to use Drizzle.
- **Files modified:** src/app/api/agent/tokens/route.ts, src/app/api/agent/tokens/[id]/revoke/route.ts, src/shared/lib/agent-token.ts
- **Verification:** 37 tests pass, typecheck clean, prisma validate passes
- **Committed in:** bac30b7e (Task 4 feat)

**2. [Rule 1 - Bug] AgentScope naming collision**

- **Found during:** Task 2 GREEN phase (type implementation)
- **Issue:** Plan defined `AgentScope` as both an interface (in types.ts) and a union type (in scopes.ts). Barrel re-export caused the union type to shadow the interface, breaking the signAgentToken signature.
- **Fix:** Renamed interface to `AgentScopeConfig`. Updated all references in types.ts, agent-token.ts, and barrel.
- **Files modified:** src/entities/agent/types.ts, src/shared/lib/agent-token.ts
- **Verification:** TypeScript compilation passes, 37 tests pass
- **Committed in:** bac30b7e (Task 4 feat)

**3. [Rule 1 - Bug] SessionAndRole property access**

- **Found during:** Task 4 (API routes)
- **Issue:** Plan code used `session.user.id` but SessionAndRole type exposes `session.userId` (not `session.user.id`)
- **Fix:** Changed to `session.userId` in both tokens/route.ts and tokens/[id]/revoke/route.ts
- **Files modified:** src/app/api/agent/tokens/route.ts, src/app/api/agent/tokens/[id]/revoke/route.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** bac30b7e (Task 4 feat)

**4. [Rule 3 - Blocking] prisma migrate dev shadow DB failure**

- **Found during:** Task 1 (schema migration)
- **Issue:** Pre-existing migration `20260624000000_add_user_role_and_seat_lifecycle` fails to apply to shadow database due to unsafe enum value usage. Not caused by this plan's changes.
- **Fix:** Used `prisma db push` to sync schema to dev database directly. `prisma db push` succeeded and generated all Drizzle schemas correctly.
- **Files modified:** None (workaround applied)
- **Verification:** prisma validate passes, database in sync, Drizzle schemas generated
- **Committed in:** 6f3b20fe (Task 1 feat)

**5. [Rule 3 - Blocking] ESLint deep import restriction**

- **Found during:** Task 4 commit (pre-commit hook)
- **Issue:** Importing `@shared/lib/agent-token` directly violated the project's `no-restricted-imports` ESLint rule
- **Fix:** Exported token utilities from `@shared/lib` barrel. Updated route imports to use `@shared/lib`.
- **Files modified:** src/shared/lib/index.ts, src/app/api/agent/tokens/route.ts
- **Verification:** ESLint pre-commit hook passes, imports resolve correctly
- **Committed in:** bac30b7e (Task 4 feat)

**6. [Rule 3 - Blocking] Pre-existing isActive references**

- **Found during:** Task 1 GREEN (typecheck after schema changes)
- **Issue:** Two pre-existing Drizzle queries in agents.ts and identity.ts referenced `agentAccesses.isActive` which was removed from the schema
- **Fix:** Updated to `agentAccesses.status` with `'ACTIVE'` comparison. Also updated agentAccessSchema Zod schema from `isActive: z.boolean()` to `status: z.string()`.
- **Files modified:** src/server/routers/agents.ts, src/server/routers/identity.ts
- **Verification:** TypeScript compilation passes, typecheck clean
- **Committed in:** 6f3b20fe (Task 1 feat)

---

**Total deviations:** 6 auto-fixed (3 bugs, 3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and project convention compliance. No scope creep. Plan deliverables fully intact.

## Issues Encountered

- Prisma migrate dev failed on pre-existing migration (shadow DB error) — worked around with prisma db push
- TypeScript types erased at runtime required redesign of type-level tests to use runtime value assertions for scope registry

## Verification

- `pnpm tsc --noEmit` — typecheck passes for all modified files
- `pnpm lint` — ESLint passes (pre-commit hooks)
- `npx prisma validate` — schema valid
- `grep "enum AgentPermission" prisma/schema.prisma` — 0 matches (enum removed)
- `grep "originalPermissions" prisma/schema.prisma` — 1 match on AgentAccess
- `grep "model ResidentDelegation" prisma/schema.prisma` — 1 match (model defined)
- `grep "agentTokensAsAgent" prisma/schema.prisma` — 1 match on user model
- 37 vitest tests pass (19 schema + 9 types + 9 token utilities)

## Next Phase Readiness

- AgentToken data model complete — ready for Plan 02 (token resolution middleware)
- Agent entity types provide canonical Agent union type for all downstream consumers
- Token utility module with CredentialVerifier abstraction ready for Plan 03 (scope resolution)
- Token CRUD API endpoints ready for Plan 04 (token management UI)
- jose@6.2.3 installed and integrated — no further dependency setup needed

---

_Phase: 111-agent-gateway_
_Completed: 2026-06-28_
