---
phase: 44-m5a-audit-closure
type: execute
status: planning
created: 2026-06-04
updated: 2026-06-04
milestone: M5a (audit closure)
expanded: true
expansion_reason: 4 conflict register entries (C1, C2, C5, C6) added per user direction; C4 deferred to dWallet phase
---

# Phase 44: M5a Audit Closure

**Goal:** Close the 5 architecture-audit gaps identified in `docs/cleaner_react_architecture.md` AND resolve 4 of the 7 open conflict register entries from `docs/UBIQUITOUS_LANGUAGE.md` so the codebase is ready for Soralia Village's 180-home production launch.

**BD sources (5 audit + 4 conflicts = 9 total):**

**Audit closure (5):**

- `fpc` (P2 architecture) — tRPC coverage expansion (Ch 8)
- `qig` (P2 architecture) — shared HTTP client (unblocks Ch 8 + Ch 9)
- `1ei` (P3 architecture) — widget useEffect+fetch → useQuery migration (Ch 8)
- `9xr` (P3 architecture) — pure domain helpers useIdentity, ticketNumber (Ch 7)
- `5u2` (P3 architecture) — de-duplicate maintenance API transform logic (Ch 6)

**Conflict register closure (4):**

- `2z4` (P2, C1) — Property shape consolidation
- `1eh` (P2, C2) — Gating system migration Phase 2 + 3
- `brp` (P3, C5) — Align residencyType ↔ residentType
- `huo` (P3, C6) — Rename occupantType → householdRole

**Conflicts deferred:**

- **C3 (Tab→Space)** — **RESOLVED** (2026-06-04 audit: 0 hits for `tabId`/`DashboardTab`). Phase 31 closed it. Register updated.
- **C4 (Tier Naming)** — **DEFERRED** to Phase 47 (dWallet). Tier naming only matters when dWallet ships tier-gated features. Track as open conflict until dWallet surfaces the need.

**Why this phase exists (expanded):** M5a is "audit closure before launch" — the 5 issues map directly to the 5 chapter-level gaps from the architecture audit, and the 4 conflict register entries are foundational naming/shape cleanups that compound over time. Closing them tightens the architecture, reduces tech debt surface, and unblocks M5b feature work. C5/C6 are naming cleanups (low risk, high clarity gain). C1 is shape boundary clarification (no field renames — `street`/`unit` already match Prisma). C2 is the second half of the gate consolidation that started in Phase 41.

**Acceptance:**

- All 9 BD issues closed with a fix commit
- `docs/cleaner_react_architecture.md` Chapters 6, 7, 8, 9 marked as "Closed 2026-06-XX"
- `docs/UBIQUITOUS_LANGUAGE.md` C1, C2, C5, C6 marked as "Closed 2026-06-XX"; C4 still OPEN (deferred to dWallet)
- Zero `useEffect(() => fetch(...))` patterns remain in `src/widgets/`
- `src/shared/api/http-client.ts` is the single import point for fetch in widgets
- All maintenance API routes use a single transform function
- All complex route handlers composed via tRPC OR have a clear exception in `docs/API_RATIONALE.md`
- 5 Property shapes consolidated per `UBIQUITOUS_LANGUAGE.md` C1 resolution plan (no field renames; consolidate `directory.Property` and `user.PropertyInfo` only if shared lite type is needed)
- 4+ `usePageFlags` callsites migrated to `useGateContext()`; legacy exports restricted to `@internal` with CI guard
- `Profile.occupantType` renamed to `householdRole` (with Prisma + Drizzle schema migration)
- `Profile.residencyType` and `Invitation.residentType` aligned on a single enum

**Out of scope:** M4.5 fixes (phase 43), M5b launch features (phase 45), M5+ post-launch (phase 46), dWallet (phase 47, where C4 lives), C3 (already resolved).

**Plans:** TBD. Run `/gsd-plan-phase 44-m5a-audit-closure` when ready to plan execution. Plan structure should group by dependency:

- **Plan A (foundation):** `qig` (shared HTTP client) + `9xr` (pure helpers) + `2z4` (Property shape) — unblock downstream
- **Plan B (gating migration):** `fpc` (tRPC coverage) + `1eh` (usePageFlags → useGateContext migration) + restrict legacy exports
- **Plan C (cleanup):** `1ei` (useQuery migration) + `5u2` (maintenance dedup) + `brp` (residencyType alignment) + `huo` (occupantType → householdRole)
