---
phase: 44-m5a-audit-closure
type: execute
status: planning
created: 2026-06-04
milestone: M5a (audit closure)
---

# Phase 44: M5a Audit Closure

**Goal:** Close the 5 audit gaps identified in `docs/cleaner_react_architecture.md` so the codebase is ready for Soralia Village's 180-home production launch.

**BD sources:**

- `fpc` (P2 architecture) — tRPC coverage expansion (Ch 8)
- `qig` (P2 architecture) — shared HTTP client (unblocks Ch 8 + Ch 9)
- `1ei` (P3 architecture) — widget useEffect+fetch → useQuery migration (Ch 8)
- `9xr` (P3 architecture) — pure domain helpers useIdentity, ticketNumber (Ch 7)
- `5u2` (P3 architecture) — de-duplicate maintenance API transform logic (Ch 6)

**Why this phase exists:** M5a is "audit closure before launch" — the 5 issues map directly to the 5 chapter-level gaps from the architecture audit. Closing them tightens the architecture, reduces tech debt surface, and unblocks M5b feature work.

**Acceptance:**

- All 5 BD issues closed with a fix commit
- `docs/cleaner_react_architecture.md` Chapters 6, 7, 8, 9 marked as "Closed 2026-06-XX"
- Zero `useEffect(() => fetch(...))` patterns remain in `src/widgets/`
- `src/shared/api/http-client.ts` is the single import point for fetch in widgets
- All maintenance API routes use a single transform function
- All complex route handlers composed via tRPC OR have a clear exception in `docs/API_RATIONALE.md`

**Out of scope:** M4.5 fixes (phase 43), M5b launch features (phase 45), M5+ post-launch (phase 46).

**Plans:** TBD. Run `/gsd-plan-phase 44-m5a-audit-closure` when ready to plan execution.
