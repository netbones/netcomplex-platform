# M3 Retro — Trust, Safety & Engagement

**Milestone:** M3 — Trust, Safety & Engagement
**Date:** 2026-06-03
**Author:** Milestone review (2026-06-03 second pass)
**Verifiable spec:** `.planning/MILESTONES.md` §2 M3 — "A board member can suspend a user with reason+duration, file a maintenance ticket, run a survey, and manage competitions from `/admin`."

## 1. What we said we'd deliver

Admin command surface, user suspension, surveys, competitions, maintenance ticketing, space layers, content/events. 10 phases: 21 (content events), 23 (competitions + resources), 32 (users list refactor), 33 (user suspension), 34 (admin layer), 36 (survey builder), 37 (admin route consolidation), 38 (space layers), 39 (competition entries), 40 (maintenance ticketing).

## 2. What we actually delivered

- [x] **Board member can suspend a user with reason+duration** — PASS (Phase 33: 14/14 must-haves verified 2026-05-28).
- [x] **File a maintenance ticket** — PASS (Phase 40: 4/4 plans shipped, 7-status enum, ticket numbers, handoffs, timeline).
- [x] **Run a survey** — PASS (Phase 36: 4/4 plans, 6 question types, accordion sections, drag-and-drop, image embed, auto-save).
- [x] **Manage competitions from `/admin`** — PASS (Phase 39: 4/4 plans, three winner mechanics, public cards, admin expandable rows).

**Plan count:** 12 of 12 plans shipped (note: not all phases have `✅` markers in ROADMAP but every plan has a SUMMARY file). All 10 phases have SUMMARY files.

## 3. Velocity data

- **Phases:** 10 of 10 planned
- **Plans:** 12 of 12 planned (21-01/02/03, 23-01/02/03/04, 32-01, 33-01/02, 34-01, 36-01/02/03/04, 37-01, 38-01/02/03/04, 39-01/02/03/04, 40-01/02/03/04)
- **Wall-clock duration:** 2026-05-15 (Phase 21 SUMMARY) → 2026-06-02 (Phase 36 SUMMARY) — **~2.6 weeks**
- **Pattern:** Sustained 4.6 plans/week. M3 is **largest milestone by phase count (10)** — see Gap C2 (in retrospect, M3a admin tools vs M3b engagement features would have been clearer).

## 4. What worked

- **Wave pattern fully matured.** Every M3 phase used waves. Phase 40 (Maintenance Ticketing) had 4 plans across 2 waves — schema then API/UI/user tracking. The pattern is now the standard.
- **Layer architecture scaled.** Phase 34 (AdminLayer), Phase 38 (ServicesLayer + MessagesLayer) all followed the Phase 30 (HomeLayer) template. Three layers in one milestone = the pattern proved reusable.
- **User suspension (Phase 33) had a real VERIFICATION.md** — 14/14 must-haves, dated 2026-05-28. The only M3 phase with a milestone-style verification. Pattern worth replicating.
- **Maintenance ticketing (Phase 40) was 12 requirements across 4 plans.** Largest requirement count per phase in M3. Mapped cleanly to the 7-status enum + 3 new models (MaintenanceTeam, ServiceProvider, MaintenanceCategory) + admin UI + user tracking.

## 5. What didn't work

- **Status drift on 3 phases (33, 38, 40) — root cause of Gap ζ / S4.** All 3 were marked "In Progress" or "Planning Complete" after shipping. The actual SUMMARYs existed. The drift was the milestone-tracking layer, not the work.
- **M3 was 10 phases in 2.6 weeks (3.8 phases/week).** This is **2.4× the project median** of 1.6 phases/week. In retrospect, M3a (admin tools: 32, 33, 34, 37) and M3b (engagement: 21, 23, 36, 38, 39, 40) would have been cleaner.
- **No milestone boundary for Phase 35.** Phase 35 (Api Alignment, 10 plans) was M4 work, but it shipped in the M3 window. It's correctly in M4 per the ROADMAP re-order, but the date range overlaps. Lesson: milestone boundaries should be enforced via the worktree protocol (mandated 2026-06-03), not by execution date.

## 6. Carry-over to next milestone

- [x] M3 done-state passed to M4.
- [x] Layer architecture (HomeLayer/AdminLayer/ServicesLayer/MessagesLayer) is now standard.
- [x] Wave pattern is the default for 2+ plan phases.
- [ ] Write M3 verification retro (this document).
- [ ] Tag M3 on main: `git tag v0.4.0 M3` (Gap N3).
- [ ] Run a 5-plan M4 (Phases 41 + 42) in a worktree per the 2026-06-03 mandate.

## 7. Process changes for next milestone

- **Adopt the pre-commit hook for status drift** (Gap S4). The 3 status drift fixes (33, 38, 40) were manual. The next milestone boundary will be cleaner with the hook in place.
- **Codify "VERIFICATION.md for any phase with >3 must-haves"**. Phase 33's VERIFICATION.md (14/14 must-haves) is the model. Phase 40 (12 requirements) and Phase 36 (6 requirements) also qualified but didn't have one.
- **For M4, plan only 5-7 phases per milestone.** M3 was 10; M4 should aim lower to test the lower bound.
