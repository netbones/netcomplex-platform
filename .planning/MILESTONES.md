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

## 2. Milestone Map (Proposed)

Retrospectively grouping the 43 phases by _what the work delivers_, not
what the phase numbers say. Each milestone gets a name, a "ship to" target,
and a verifiable done state. Phases 41, 42 (ready) and 43+ (queued) are
forward-looking.

### M0 — Foundation (✅ SHIPPED)

**Goal:** Multi-tenant substrate + base modules. Nothing user-facing.
**Phase range:** 00, 01, 02, 03 (Localization), 05, 06, 07, 08, 11 (Announcements)
**Status:** Complete. 10/10 phases verified.
**Verifiable:** `pnpm tsc --noEmit` passes, `pnpm test` green, RLS policies in place.
**What's NOT in M0:** Chat, email, onboarding, dashboard, admin UI, mobile.

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

### M6+ — Post-Launch (NOT YET PLANNED)

**Goal:** Second-tenant onboarding, multi-instance rate limiting (Redis), plugin/extension system, event sourcing evaluation, external API consumer onboarding.
**Phase range:** TBD. Currently the 3 deferred planning-only phases (`03-second-tenant`, `04-content-i18n`, `11-prisma-to-drizzle`) live here as future opportunities.

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

### Gap ζ — Status drift can recur silently

**Where:** Working tree → ROADMAP.md.
**Symptom:** We just fixed 3 status discrepancies; nothing prevents the next one.
**Remedy:** Add a CI step that compares on-disk PLAN/SUMMARY pairs against ROADMAP status line. If a SUMMARY exists for plan N but ROADMAP says "Planning Complete" for phase N, fail the check.

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

_Last updated: 2026-06-03. Supersedes the implicit "no milestone" assumption
that has been the project's working assumption since GSD was adopted in W14._
