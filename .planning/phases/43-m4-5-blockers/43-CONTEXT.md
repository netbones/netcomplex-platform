---
phase: 43-m4-5-blockers
type: execute
status: planning
created: 2026-06-04
milestone: M4.5 (pre-soak blockers)
---

# Phase 43: M4.5 Blockers

**Goal:** Resolve the 5 open issues that would surface as P0/P1 incidents during the 7-day M4.5 production soak. Each must be closed (or have a documented deferral) before soak begins.

**BD sources:**

- `cs5` (P2 bug) — MyHomeSpace property linking broken
- `tc4` (P1 bug) — prisma/seed.ts schema type errors (db ops broken)
- `e0w` (P2 in_progress) — systematic 80-route audit follow-up
- `oqw` (P2 task, security) — RLS enforcement via runWithRLS()
- `ltn` (P2 feature, security) — request validation plugin

**Why this phase exists:** M4.5 stabilization requires 7 days of zero P0/P1 incidents. Without resolving these 5 issues, the soak would surface them as production incidents. Better to fix in a focused phase than during the soak itself.

**Acceptance:**

- All 5 BD issues closed with a fix commit (not closed-by-defer)
- `pnpm db:seed` works end-to-end (validates tc4)
- MyHomeSpace correctly links a user to a property (validates cs5)
- All 80 audited routes have withTenant() OR a documented RLS escape hatch (validates e0w)
- `runWithRLS()` wraps sensitive routes in `src/app/api/admin/*` (validates oqw)
- Request validation plugin installed and wired to /api/auth/\* (validates ltn)

**Out of scope:** M5a/M5b work (different phases). 7cp + jc1 (deferred to dWallet).

**Plans:** TBD. Run `/gsd-plan-phase 43-m4-5-blockers` when ready to plan execution.
