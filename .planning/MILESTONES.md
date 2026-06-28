# Milestones & Cadence Audit — Soralia Village

**Generated:** 2026-06-03
**Purpose:** Diagnose the milestone-less GSD adoption, locate the gaps it created, and propose a structure for moving forward.
**Source data:** `ROADMAP.md` (43 phases), `PROJECT.md` (32 validated requirements), `CADENCE.md` (102 plans, 16 active days), `STATE.md` (3 status drift fixes), `AGENTS.md` (worktree mandate 2026-06-03).

---

## 1. Diagnosis: How We Got Here

GSD was adopted organically over ~9 weeks (W14–W23, 2026). The work was
disciplined at the _plan_ level — 102 plans, all SUMMARY'd — but
_milestone discipline_ was never established. Symptoms we can see in the
artifacts:

| Symptom                                        | Evidence                                                                                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No milestone boundaries                        | ROADMAP is a flat list of 43 phases. No M0/M1/M2 grouping, no version tags, no release notes.                                                                                                                                                          |
| Phase numbering is organic, not planned        | Two phases numbered "03" (Localization, Second Tenant), two numbered "11" (Announcements, Prisma→Drizzle), "01" appears _after_ "04", "35" appears _after_ "39", and "99" exists for housekeeping. The numbers reflect creation order, not sequencing. |
| Status drift became a pattern                  | 3 phases (33, 38, 40) were marked "In Progress" or "Planning Complete" after shipping. Fix: run `gsd-tools state complete-phase` after the last plan in a phase. Process discipline was missing.                                                       |
| No release branches / version tags             | `git branch` shows `main` and `dev` only. No `release/v0.1`. No `git tag` pattern.                                                                                                                                                                     |
| "Module Architecture" section sits mid-ROADMAP | Lines 594–629 of ROADMAP.md is Phase 08 design content positioned as if it's a top-level doc. Was probably hand-pasted.                                                                                                                                |
| ROADMAP is 710 lines, hard to scan             | With 43 phases, the doc is now longer than PROJECT.md (246) + STATE.md (299) combined. Milestone grouping would reduce cognitive load.                                                                                                                 |
| 3 deferred planning-only phases                | `03-second-tenant`, `04-content-i18n`, `11-prisma-to-drizzle` each have a PLAN.md but no SUMMARY.md. They pollute `/gsd-progress` and `bd ready`.                                                                                                      |

**Net effect:** We have shipped 102 plans and cannot answer "what's in v1?",
"is the foundation complete?", or "is Soralia Village ready for 180 homes?"

---

## 2. Milestone Map

Retrospectively grouping the 43 phases by _what the work delivers_, not
what the phase numbers say. Each milestone gets a name, a "ship to" target,
and a verifiable done state. Phases 41, 42 (ready) and 43+ (queued) are
forward-looking.

### M0 — Foundation (✅ SHIPPED)

**Goal:** Multi-tenant substrate + base modules. Nothing user-facing.
**Phase range:** 00, 01, 02, 03 (Localization), 05, 06, 07, 08, 11 (Announcements)
**Status:** Complete. 9/9 phases verified.
**Verifiable:** `pnpm tsc --noEmit` passes, `pnpm test` green, RLS policies in place.
**What's NOT in M0:** Chat, email, onboarding, dashboard, admin UI, mobile.
**Historical (verified 2026-06-03):** `11-prisma-to-drizzle` was originally listed as a deferred M6+ planning-only phase but verified complete via incremental delivery (179 Drizzle imports, 0 Prisma imports, `src/shared/api/prisma.ts` removed). The original `11-01-PLAN.md` is historical; the duplicate phase number `11` is the artifact. See ROADMAP.md M0 historical note.

### M1 — Core Communication & Auth (✅ SHIPPED)

**Goal:** Real-time messaging, transactional email, self-service onboarding, schema hardening.
**Phase range:** 09, 10, 18, 19, 20
**Status:** Complete. 5/5 phases verified.
**Verifiable:** A new resident can sign up, verify email, join a tenant, send a chat message that arrives in <2s.
**What's NOT in M1:** UI polish, navigation, dashboard.

### M2 — Dashboard & Navigation (✅ SHIPPED)

**Goal:** Focus Spaces architecture, single-source navigation, widget system, tenant config.
**Phase range:** 22, 24, 25, 26, 27, 28, 29, 30, 31
**Status:** Complete. 9/9 phases verified.
**Verifiable:** A resident on /dashboard sees a 3-zone Home with widgets; tab legacy code is gone.
**What's NOT in M2:** Admin command surface, trust/safety, surveys, ticketing.

### M3 — Trust, Safety & Engagement (✅ SHIPPED)

**Goal:** Admin command surface, user suspension, surveys, competitions, maintenance ticketing, space layers.
**Phase range:** 32, 33, 34, 36, 37, 38, 39, 40
**Status:** Complete. 9/9 phases verified.
**Verifiable:** A board member can suspend a user with reason+duration, file a maintenance ticket, run a survey, and manage competitions from `/admin`.
**What's NOT in M3:** API governance, feature gate consolidation, i18n hydration, architecture audit.

### M4 — Production-Ready (🟡 IN PROGRESS — 2 of 3 phases planned, 1 in execution)

**Goal:** API governance, feature gate consolidation, i18n hydration fix.
**Phase range:** 35 (done), 41 (planned), 42 (planned)
**Status:** Phase 35 ✅ complete. Phases 41 (3 plans) and 42 (3 plans) ready to execute.
**Verifiable:** OpenAPI spec generated and committed; `canAccess()` is the canonical gate; no console hydration errors on tenant routes.
**Blockers:** None. Per GSD worktree protocol (mandated 2026-06-03), execute in a worktree.

### M4.5 — Stabilization (🟡 PLANNED)

**Goal:** Verify the production-ready state is actually stable before launching M5 work. Buffer between M4 (code-complete) and M5 (production-traffic).

**Phase range:** No new phases. This is a verification + observation milestone — no new code beyond what M4 requires.

**Status:** Planned. Activates when M4 is complete (Phases 35, 41, 42 all ✅).

**Verifiable (all must pass to declare M4.5 done):**

- **7-day production soak** with zero P0/P1 incidents (P2/P3 acceptable, tracked).
- **OpenAPI spec published** to a staging URL or package; at least one external test client (or internal smoke test) consumes it successfully.
- **Performance baseline captured:** p50/p95/p99 latency for chat send, dashboard load, maintenance ticket create. Documented in `.planning/perf-baseline-M4.5.md`.
- **All 4 locales (en, af, xh, zu) render** without console errors on every tenant route.
- **`canAccess()` migration timeline documented** — if Phase 41's legacy export removal isn't done, write a dated plan; if done, write the migration log.
- **Rollback procedure tested** — verified that we can revert to M3 in <5 minutes (DB migration, env flags, traffic shift).

**Duration:** ~1 week. The 7-day soak is the longest single item; the others can run in parallel during the soak.

**What's NOT in M4.5:** New features, new phases, code changes beyond what M4 requires. Pure verification + soak + sign-off.

**Failure mode:** If any verifiable criterion fails, M4.5 is "blocked on <criterion>". M5 does not start until M4.5 is green. No exceptions — this is the buffer that prevents M5 from being launched on a broken foundation.

### M5 — Anchor Tenant Launch (📋 PLANNED)

**Goal:** Close the 5 architecture-audit issues, ship Community Merits, OTP password reset, MyHomeSpace bug, and the 37-widget i18n batch. Ready for Soralia Village (180 homes) production traffic.
**Phase range:** New (43+), pulling from BD backlog
**Status:** Planning. Sources:

- BD `qig` — shared HTTP client (unblocks 2/3 audit chapters)
- BD `fpc` — tRPC coverage expansion
- BD `9xr` — pure domain helpers + unit tests
- BD `5u2` — maintenance API transform dedup
- BD `1ei` — widget useEffect+fetch → useQuery migration
- BD `2at` — Community Merits & Standing System
- BD `l23` / `0f7` — i18n for all pages (37-widget batch + TipTap content)
- BD `cs5` — MyHomeSpace property linking bug
- BD `0tb` — OTP password reset

**Verifiable:** All 5 audit issues closed with tests, audit document `docs/cleaner_react_architecture.md` marked "all chapters resolved", Soralia admin can invite 180 homes via batch import, anchor-tenant launch checklist (TBD) green.

**Decomposition (added 2026-06-03 per Section 7 Gap C1):** M5 has 10 work items with no priority or scope. Proposed split:

- **M5a — Audit Closure (5 items).** qig, fpc, 9xr, 5u2, 1ei. Verifiable: `docs/cleaner_react_architecture.md` marked "all chapters resolved" + 5 unit-test suites.
- **M5b — Anchor Tenant Features (13 items).** 2at, l23, 0f7, cs5, 0tb + the missing i18n router extension phase + Phase 47 dWallet (2 items: 7cp, jc1) + Phase 46 Provider Platform (4 items: kia, 9e8, 69c, 4fh) + Phase 50 Service Marketplace (4 items: gtm, cp8, qx7, 4vk). Verifiable: Soralia admin can invite 180 homes via batch import + the M5 launch checklist (Gap η) is green.

M5a is "we cleaned up", M5b is "we shipped launch features". Different verifiables, different stakeholders. M5a unblocks future work; M5b unblocks anchor-tenant traffic.

**M5 ready signal (added 2026-06-03 per Section 7 Gap N2):** M5 planning begins when (a) M4 is complete (Phases 41 and 42 shipped) AND (b) the M5 launch checklist (`.planning/M5-LAUNCH-CHECKLIST.md`, Gap η) is drafted. Without both, M5 has no done-state and no launch criteria.

### M7 — Monorepo Migration (📋 PLANNED)

**Goal:** Transform the single-repo Next.js app into a Turborepo monorepo with shared packages and an Expo mobile app. Web dev continues in parallel with coordination restrictions during M1 (extract packages). After M7, the codebase supports web + mobile builds, shared packages, and feature parity across platforms.

**Phase range:** 112 (tracking/umbrella), 113 (M0 scaffold), 114 (M1 extract packages), 115 (M2 move web), 116 (M3 Expo foundation), 117+ (M4+ mobile features)

**Status:** Planning. Phase 112 CONTEXT.md written. Sub-phases defined in ROADMAP.md.

**Verifiable:** `pnpm build` runs across all packages; `apps/expo` connects to `apps/web` via tRPC; all shared types/schemas/DB/schemas live in `packages/`; 24 mobile features ported; no web dev disruption during migration.

**What's NOT in M7:** Second tenant, content i18n, plugin system, event sourcing (M6+ deferred items).

---

### M6+ — Post-Launch (📋 PARTIALLY PLANNED)

**Goal:** Post-deployment validation tests, content i18n adoption, multi-instance rate limiting (Redis), plugin/extension system, event sourcing evaluation, external API consumer onboarding.
**Phase range:**

- `03-second-tenant` — post-deployment validation test (requires production deployment + willing second tenant)
- `04-content-i18n` — TipTap content localization (blocked on i18n router being extended to tenant routes; currently platform-only at `/[lng]/`)
- Future: TBD (Phase 99 Build Fix moved to a Housekeeping appendix on 2026-06-03 per Section 7 Gap C3)

---

## 3. Gaps Located

The "haphazard development cycle" reveals 7 concrete gaps. Each is
named, located, and remediable.

### Gap α — Milestone definition missing

**Where:** ROADMAP.md, PROJECT.md.
**Symptom:** No M0–M5. PROJECT.md has "Validated" list but no milestone groupings.
**Remedy:** Adopt the map in §2. Cross-link ROADMAP phase numbers to milestone names (M0/M1/M2/...). Add a "Milestone Map" section at the top of ROADMAP.md pointing here.

### Gap β — Milestone gates not enforced

**Where:** GSD workflow.
**Symptom:** Status drift in 3 phases. Root cause: `gsd-tools state complete-phase` never called.
**Remedy:** Add a pre-commit hook that runs `gsd-sdk query validate.health --strict` and fails if status drift is detected. Add a session-end checklist item: "Did you run complete-milestone?"

### Gap γ — Cadence ritual absent

**Where:** Working rhythm.
**Symptom:** 4 weeks of zero execution (W15, W16, W18, W19) between mega-bursts (W20+W22). No way to know what "this week" means.
**Remedy:** Weekly 15-minute check-in: update STATE.md, run `gsd-sdk query validate.health`, scan for stale entries, pick the next ready plan. Document the ritual in AGENTS.md under "Cadence".

### Gap δ — Definition of "Done" at the milestone level is missing

**Where:** ROADMAP.md (only phase-level "done" exists).
**Symptom:** Phase 35 (10/10 plans) is "Complete" but we never asked "does the API governance milestone ship?" The answer is "the plans are done, but is the audit gap closed?" — different question.
**Remedy:** For each milestone in §2, the "Verifiable" line is the spec. Add a milestone-verification command or template at `.planning/templates/milestone-verification.md`.

### Gap ε — Phase numbering is non-monotonic

**Where:** ROADMAP.md ordering.
**Symptom:** Two "03", two "11", "01" after "04", "35" after "39", "99" for housekeeping. Anyone reading the doc has to context-switch to figure out the sequence.
**Remedy (low-cost):** Re-order ROADMAP.md by logical sequence (M0→M5) and add a "Created in this order" appendix for historical reference. **Do NOT renumber the phases themselves** — that would break git blame and the plan IDs. Just reorder the doc.

### Gap ζ — ~~Status drift can recur silently~~ ✅ PARTIALLY RESOLVED 2026-06-03

**Status:** Phase 11 (Prisma To Drizzle) verified complete and removed from M6+. Phases 03 and 04 retained in M6+ with explicit blockers (post-deployment validation test; i18n router extension). 3 status drift fixes (Phase 33, 38, 40) in d11d8f2 commit. The CI step (compare on-disk SUMMARYs against ROADMAP status) is still recommended for full resolution.

### Gap η — Anchor-tenant launch criteria are unstated

**Where:** PROJECT.md "Active" requirements.
**Symptom:** M5 is "ready for 180 homes" but we haven't defined what that means. Soft-launch vs full launch? Pilot cohort? Onboarding flow validation?
**Remedy:** Write `.planning/M5-LAUNCH-CHECKLIST.md` with: (a) pilot cohort size (suggest 10–20 homes), (b) data migration rehearsal criteria, (c) POPIA attestation, (d) rollback plan, (e) comms templates. This is M5's real planning artifact.

---

## 4. Cadence Ritual Proposal

A lightweight weekly rhythm that catches status drift early and prevents
the burst-then-plateau pattern. Three rituals, all under 30 min total per week.

### 4a. Weekly check-in (15 min, every Monday)

- Open `.planning/STATE.md`, scan for stale entries.
- Run `gsd-sdk query validate.health`. If any errors → fix in this session.
- Run `bd ready`. Pick the top 1–2 items.
- If you finished a phase last week: run `gsd-tools state complete-phase`.
- Commit STATE.md + ROADMAP.md if anything changed (single commit, no other changes).

### 4b. Bi-weekly milestone boundary (30 min, every other Monday)

- For each phase shipped in the last 2 weeks: confirm SUMMARY exists, requirements are validated, ROADMAP status = "Complete", STATE.md position points to next ready item.
- If a milestone's last phase is verified: run `gsd-tools state complete-milestone` and write `.planning/retros/M{N}-retro.md` (template at `.planning/templates/retro.md`).
- Update CADENCE.md with the last 2 weeks' actual velocity.

### 4c. End-of-session housekeeping (2 min, every session)

- `git status` clean
- ROADMAP status accurate for any phase completed this session
- STATE.md current position points to the _next_ ready item
- If a phase was finished: `gsd-tools state complete-phase` was called

---

## 5. Actionable Next Steps

In priority order. Each step is small enough to do in one session.

1. **Adopt the milestone map in §2** — re-order ROADMAP.md by milestone (M0 → M5 → M6+) and add a 1-line "Belongs to milestone M_N" annotation under each phase header. ~15 min, no semantic change.
2. **Write `.planning/templates/retro.md`** — the milestone retro template referenced in 4b. ~10 min.
3. **Add pre-commit hook for `validate.health`** — modify the existing lint-staged config to run GSD health check on `.planning/**/*.md` changes. Catches status drift at commit time.
4. **Pick up Phase 41 in a worktree** — 3 plans, 1 wave, narrow scope, post-advisory audit. Per GSD worktree protocol (mandated 2026-06-03). M4 is unblocked the moment this ships.
5. **Decide on the 3 deferred planning phases** — archive to `milestones/archived/` (clean approach) or keep polluting the ready backlog (current approach). Recommend archive; defer to user.
6. **Write M5 launch checklist** — `.planning/M5-LAUNCH-CHECKLIST.md` with the 5 criteria from Gap η.
7. **Document the cadence ritual in AGENTS.md** — add a "Cadence & Milestone Discipline" section that codifies §4. This is the durable enforcement.

---

## 6. Decision Points (For You)

I have made structural recommendations. Three are call/response:

- **Q1: Re-order ROADMAP.md by milestone?** (Gap ε) — clean win, no semantic change, ~15 min.
- **Q2: Archive the 3 deferred planning phases now?** (Gap ζ) — was held back last session. Approve archival, or keep them visible?
- **Q3: Add cadence ritual to AGENTS.md?** (Gap γ, §4) — codify the weekly check-in + end-of-session housekeeping as policy.

---

## 7. Milestone Review (2026-06-03 — Second Pass)

**Purpose:** Re-examine the milestone structure now that M0–M3 are
declared "shipped" and find what is still missing for milestone
discipline to actually hold. Distinguish structural gaps (fixable
now) from aspirational gaps (need user input).

### 7.1 Inconsistencies between MILESTONES.md and ROADMAP.md — **FIXED THIS SESSION**

| Item                              | Was                                                         | Now                                       |
| --------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| Phase 18 (Toast Unification)      | M2 in ROADMAP, M1 in MILESTONES                             | **M1 in both** — moved to align with spec |
| Phase 21 (Content Events)         | Listed in M3 in ROADMAP, not in any milestone in MILESTONES | **M3 in both** — MILESTONES updated       |
| Phase 23 (Competitions Resources) | Same as Phase 21                                            | **M3 in both** — MILESTONES updated       |

**Result:** All 4 shipped milestones (M0–M3) now have phase ranges that agree between the two docs. Total phase counts per milestone: M0=9, M1=5, M2=9, M3=10, M4=3, M5=0, M6+=3. Total = 39 phase entries (matches ROADMAP's 39 `## Phase` headers).

### 7.2 Structural gaps in milestone discipline

These are the "the milestone is declared but the artifacts don't exist" gaps.

**Gap S1 — No milestone-level VERIFICATION docs.**

Evidence: `find .planning/phases -name VERIFICATION.md` returns **1 file** (Phase 22 only). For 4 shipped milestones (M0, M1, M2, M3) we have **0 milestone-level VERIFICATION.md** files. The "9/9 phases verified" claims in §2 are aspirational — they reference phase-level SUMMARYs (which exist) but not milestone-level verification (which doesn't).

Remedy: Write a one-page `.planning/retros/M{N}-verification.md` per shipped milestone, enumerating the milestone's "Verifiable" criteria (the line under each milestone in §2) and confirming pass/fail with evidence (test output, URL check, manual test). This is the discipline gap that lets the M0-M3 "shipped" claim be auditable.

**Gap S2 — `.planning/retros/` does not exist.**

Evidence: directory absent. AGENTS.md §4b references writing `.planning/retros/M{N}-retro.md` but no such directory or files exist. 4 milestones shipped without retro.

Remedy: `mkdir .planning/retros/` and write 4 retro docs (M0, M1, M2, M3) using the template at Gap S3. Each retro is ~10 min if the Verifiable criteria are clear.

**Gap S3 — `.planning/templates/retro.md` does not exist.**

Evidence: directory absent. AGENTS.md §4b references the template but it's not on disk.

Remedy: Create `.planning/templates/retro.md` with a 5-section template: (1) What we said we'd deliver, (2) What we actually delivered, (3) Velocity data, (4) What worked / what didn't, (5) Carry-over to next milestone. ~15 min.

**Gap S4 — No pre-commit hook for status drift.** ~~Open~~ (✅ **Resolved 2026-06-03**)

Evidence (was): Gap β from §3 still recommended but not implemented. The 3 status drift fixes in commit `d11d8f2` were manual; nothing prevents the next one.

Resolution: Added `lint-staged` rule in `package.json` that runs `gsd-sdk query validate.health` (via `.husky/gsd-status-check.sh`) on `.planning/**/*.md` changes. The check parses the JSON output: any `errors` or `warnings` count fails the commit. INFO items (currently 9 I001) pass — they are advisory, not errors. This makes the discipline in §3 a hard gate, not a soft guideline.

### 7.3 Scope gaps — milestones that are too big or too undefined

**Gap C1 — M5 has 10 work items with no priority ranking or scope estimate.**

Evidence: MILESTONES.md §2 M5 lists 9 BD issues + 1 missing i18n router phase = 10 work items. No priority order, no effort estimate, no dependency graph. The "Verifiable" line is vague ("audit document marked 'all chapters resolved'") — it's a single binary signal, not the 10 separate verifications we'd actually need.

Remedy: Decompose M5 into M5a (audit closure — qig, fpc, 9xr, 5u2, 1ei) and M5b (anchor-tenant features — 2at, l23, 0f7, cs5, 0tb, i18n router). M5a is "we cleaned up", M5b is "we shipped the launch features". Different verifiables. Different stakeholders.

**Gap C2 — M3 is the largest single milestone (10 phases) in retrospect.**

Evidence: M3 shipped 10 phases (32, 33, 34, 36, 37, 38, 39, 40, 21, 23) in ~3 weeks. That's 3.3 phases/week sustained — the project median. In hindsight, M3 could have been M3a (admin tools: 32, 33, 34, 37) and M3b (engagement: 21, 23, 36, 38, 39, 40). The split is moot now (work is done) but is a learning for M5.

Remedy: Note in M5 retro that 10 phases per milestone is the upper limit; aim for 5–7 next time.

**Gap C3 — M6+ has an orphan (Phase 99 — Build Fix).**

Evidence: Phase 99 is in M6+ "by convention" but is complete. It's not a future work item.

Remedy: Move Phase 99 to a "Housekeeping" appendix at the end of ROADMAP.md, or annotate it as a closed M0 housekeeping phase.

**Gap C4 — No "between M4 and M5" milestone.** ~~Open~~ (✅ **Resolved 2026-06-03**)

Evidence (was): After M4 ships (Phases 41 + 42), we jump to M5 with 10 work items. There's no stabilization or "M4 done, what now?" pause.

Resolution: Defined M4.5 (Stabilization) with 6 verifiable criteria: 7-day production soak with zero P0/P1, OpenAPI spec consumed by external test client, p50/p95/p99 performance baseline captured, all 4 locales render without console errors on tenant routes, `canAccess()` migration timeline documented, rollback procedure tested in <5 min. ~1 week duration. Activates when M4 is complete; M5 does not start until M4.5 is green. Documented in §2 (M4.5) and in ROADMAP.md.

### 7.4 Conceptual gaps — milestone discipline without enforcement

**Gap N1 — M0–M3 "shipped" claims are informal.**

Evidence: The "9/9 verified" and "10/10 plans shipped" lines in §2 are author assertions, not artifacts. There's no audit trail linking the claim to evidence.

Remedy: Gap S1 (milestone-level VERIFICATION docs) addresses this. Until then, treat the "shipped" claim as the author's working assumption, not audited fact.

**Gap N2 — No "ready signal" for M5.**

Evidence: M5 has 10 work items, all sourced from BD. None are "in flight" (no plans drafted, no phase numbers assigned). M5's start trigger is implicit ("when M4 is done").

Remedy: Define an explicit M5 start signal: "M5 planning begins when M4 is complete AND the M5 launch checklist is drafted." The M5 launch checklist is Gap η from §3.

**Gap N3 — No version tags or release branches.**

Evidence: `git branch` shows `main` and `dev` only. No `release/v0.1`, no `git tag`. The "shipped" milestones have no artifact-level marker.

Remedy: Tag each shipped milestone on the main branch (`git tag v0.1.0 M0` for example). This is a 30-second per-milestone task and gives the audit trail a concrete anchor.

### 7.5 Summary of Gaps Located in This Review

| ID  | Gap                                  | Severity | Effort to fix      | Owner           |
| --- | ------------------------------------ | -------- | ------------------ | --------------- |
| S1  | No milestone-level VERIFICATION docs | High     | 4 × 10 min         | This session    |
| S2  | No `.planning/retros/` directory     | High     | 5 min              | This session    |
| S3  | No `.planning/templates/retro.md`    | Medium   | 15 min             | This session    |
| S4  | No pre-commit hook for status drift  | Medium   | 20 min             | Next session    |
| C1  | M5 has 10 unscoped items             | High     | 30 min (decompose) | This session    |
| C2  | M3 was 10 phases (post-hoc learning) | Low      | Note only          | Already shipped |
| C3  | Phase 99 orphan in M6+               | Low      | 2 min              | This session    |
| C4  | No M4.5 stabilization milestone      | Medium   | 15 min (decide)    | This session    |
| N1  | M0-M3 "shipped" claims informal      | High     | Resolved by S1     | —               |
| N2  | No M5 ready signal                   | Medium   | 10 min             | This session    |
| N3  | No version tags or release branches  | Low      | 4 × 30 sec         | This session    |

### 7.6 Action Plan (in order)

1. **Create `.planning/templates/retro.md`** (S3) — template is a precondition for S1, S2.
2. **Create `.planning/retros/` directory** (S2) — empty for now.
3. **Write 4 retro docs** (S1) — one per shipped milestone. Uses template.
4. **Decompose M5 into M5a/M5b** (C1) — update §2 M5 to reflect the split.
5. **Add M5 ready signal** (N2) — one sentence in §2 M5.
6. **Tag shipped milestones** (N3) — 4 `git tag` commands.
7. **Move Phase 99 out of M6+** (C3) — 1-line edit.
8. **Decide on M4.5** (C4) — yes/no/merge decision.
9. **Add pre-commit hook** (S4) — deferred to next session, after M4 is underway.

---

_Last updated: 2026-06-03 — second-pass milestone review. Section 7 added
with 11 newly-located gaps (S1–S4, C1–C4, N1–N3) and an action plan.
Phase 18 placement inconsistency fixed (M2 → M1 in ROADMAP). MILESTONES.md
and ROADMAP.md now agree on all phase placements._
