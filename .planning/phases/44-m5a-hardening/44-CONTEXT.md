---
phase: 44-m5a-hardening
type: execute
status: planning
created: 2026-06-04
updated: 2026-06-07
milestone: M5a (Hardening & Launch Readiness)
expanded: true
expansion_reason: 2026-06-07 milestone reshape — M4.5 soak repositioned to M5b, M5a scope expanded to include FSD linter integration, M4.5 follow-up closeouts, pnpm advisories, and monitoring infra planning
---

# Phase 44: M5a Hardening & Launch Readiness

**Goal:** Close all known critical bugs, enforce FSD architecture boundaries, resolve security advisories, plan monitoring infrastructure, and complete the audit-closure/conflict-register work so the platform is stable for any tenant onboarding. After Phase 44, the codebase should be **"quiet"** — no known P0/P1 bugs, no architectural debt to freeze around, no FSD violations, no security advisories that would block production traffic.

**Why this phase exists (2026-06-07 reshape):** The 7-day production soak was originally placed in M4.5 as a "stabilization" activity. This was a category error — the soak is a launch verification, not a production-readiness deliverable. The team is mid-journey in the dev cycle (just discovered lib18n typo + tenantConfig barrel gap + missing FSD linter) and would get noise rather than signal from a 7-day soak run before stability is achieved. M4.5 now correctly closes with "code-complete + blocker-fixes shipped". The soak is the FIRST activity of M5b (Phase 45), not the LAST activity of M4.5. Phase 44 takes everything that needs to be hardened before that soak and consolidates it here.

**BD sources (initial 9 audit/conflict + 4 M4.5 follow-ups + 1 FSD debt + 1 advisories = 15 total):**

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

**M4.5 follow-up closeouts (4):**

- `tc4` (P1 bug, also M4.5 blocker) — Prisma seed schema type errors
- `mls9` (P1 task) — Add `prisma.seed` config to package.json
- `n0rh` (P1 bug) — Restore `gen_random_uuid()` default on Tenant.id
- `cs5` (P2 bug, also M4.5 blocker) — MyHomeSpace property link

**FSD debt (1):**

- `r13u` (P2 bug) — `tenantConfig` barrel re-export gap (surfaced 2026-06-07 by lib18n fix; Steiger baseline scan expected to surface more)

**Security advisories (1):**

- `nn39` (P1 task) — Resolve 19 high-severity pnpm audit findings (defer to runtime-impact-only filter — not all advisories block production)

**Steiger FSD linter integration (NEW — Plan 44-01):** Install `@feature-sliced/steiger-plugin`, configure `steiger.config.js` with project-specific rules (allow `@shared/lib/i18n` as a documented sidestep — client-only module that the barrel deliberately excludes), add a general web CI workflow (separate from the API-only `api-ci.yml`), wire a pre-commit hook for staged FSD files, and document in AGENTS.md. Baseline scan expected to surface FSD debt clusters — each cluster gets its own BD issue and Phase 44 follow-up plan.

**Monitoring infrastructure planning (NEW — Plan 44-02 TBD):** Design the observability stack for the 7-day soak (Prometheus/Grafana vs. Sentry-only vs. Vercel Analytics — needs investigation). This was implicitly M4 work (Phase 35 D-01) but no soak-specific monitoring plan exists. Document in `.planning/observability-soak-M5.md`.

**Conflicts deferred:**

- **C3 (Tab→Space)** — **RESOLVED** (2026-06-04 audit: 0 hits for `tabId`/`DashboardTab`). Phase 31 closed it. Register updated.
- **C4 (Tier Naming)** — **DEFERRED** to Phase 47 (dWallet). Tier naming only matters when dWallet ships tier-gated features. Track as open conflict until dWallet surfaces the need.

**Acceptance:**

- All 9 initial audit/conflict BD issues closed with a fix commit
- All 4 M4.5 follow-up BD issues closed with a fix commit
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
- Steiger integrated: `pnpm fsd:check` runs clean on dev (after triage); CI workflow `fsd-lint.yml` runs on every PR; pre-commit hook blocks new FSD violations on staged FSD files
- `pnpm db:seed` works end-to-end (mls9 + n0rh resolved, tc4 fixed)
- pnpm advisory `nn39` runtime-impact subset resolved
- `.planning/observability-soak-M5.md` documents the monitoring stack for the 7-day soak

**Out of scope:** M4.5 fixes (phase 43, all done), M5b launch features (phase 45), M5+ post-launch (phase 46), dWallet (phase 47, where C4 lives), C3 (already resolved). The 7-day production soak itself is the FIRST plan of Phase 45 (M5b Soak & Launch) — Phase 44 prepares the ground for it.

**Plans:** TBD. Run `/gsd-plan-phase 44-m5a-hardening` when ready to plan execution. Plan structure should group by dependency:

- **Plan 44-01:** Steiger FSD linter integration (install, config, baseline scan, CI workflow, pre-commit hook, AGENTS.md docs) — first plan; baseline scan informs all other plans
- **Plan 44-02 (TBD):** Monitoring infrastructure planning for soak (document in `.planning/observability-soak-M5.md`)
- **Plan 44-03 (TBD):** Audit closure wave A — `qig` + `9xr` + `2z4` + `r13u` (foundation + conflict C1 + first FSD debt)
- **Plan 44-04 (TBD):** Audit closure wave B — `fpc` + `1eh` (gating migration + restrict legacy exports)
- **Plan 44-05 (TBD):** Audit closure wave C — `1ei` + `5u2` + `brp` + `huo` (cleanup + conflicts C5/C6)
- **Plan 44-06 (TBD):** M4.5 follow-up closeouts — `tc4` + `mls9` + `n0rh` + `cs5` (seed regression + MyHomeSpace)
- **Plan 44-07 (TBD):** pnpm advisory resolution — `nn39` (filter to runtime-impact subset)
- **Plan 44-08+ (TBD):** FSD debt remediation — driven by Steiger baseline findings from 44-01
