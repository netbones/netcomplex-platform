# M2 Retro — Dashboard & Navigation

**Milestone:** M2 — Dashboard & Navigation
**Date:** 2026-06-03
**Author:** Milestone review (2026-06-03 second pass)
**Verifiable spec:** `.planning/MILESTONES.md` §2 M2 — "A resident on /dashboard sees a 3-zone Home with widgets; tab legacy code is gone."

## 1. What we said we'd deliver

Focus Spaces architecture, single-source navigation, widget system, tenant config. 9 phases: 22 (page flags), 24 (dashboard widgets), 25 (gap closure), 26 (navigation alignment), 27 (tenant config), 28 (proxy consolidation), 29 (dashboard defaults), 30 (focus spaces), 31 (tab removal).

## 2. What we actually delivered

- [x] **Resident sees a 3-zone Home with widgets** — PASS (Phase 30-02 HomeLayer three-zone component + Phase 29 default layouts).
- [x] **Tab legacy code is gone** — PASS (Phase 31 deleted DashboardPage/DashboardTabs, removed feature flag, renamed tabId→spaceId).

**Plan count:** 23 of 23 plans shipped. All 9 phases have SUMMARY files. **M2 was the largest single milestone by plan count** — see Gap C2 (in retrospect, M2a/M2b split would have been clearer, but the work is done and was well-paced).

## 3. Velocity data

- **Phases:** 9 of 9 planned
- **Plans:** 23 of 23 planned (22-01/02/03, 24-01/02/03, 25-01/02/03, 26-01/02/03, 27-01/02, 28-01, 29-01/02, 30-01/02/03/04/05, 31-01/02/03)
- **Wall-clock duration:** 2026-05-15 (Phase 22 SUMMARY) → 2026-06-03 (Phase 31 SUMMARY) — **~2.8 weeks**
- **Pattern:** Peak velocity. M1 was 3.3 weeks, M2 was 2.8 weeks. **Velocity +18% per week.** Reflects the "Focus Spaces" architecture being a 5-plan mega-effort (Phase 30) that absorbed the speedup.

## 4. What worked

- **Phase 30 (Focus Spaces) was the architectural keystone.** 5 plans in 4 waves. Spaces (Home, Services, Community, Messages, Admin) replaced tabs cleanly. The HomeLayer component (30-02) is the pattern the M3 layer work followed (AdminLayer 34-01, ServicesLayer 38-02, MessagesLayer 38-03).
- **Wave-based plan execution.** Each phase had explicit wave numbers (Wave 1, 2, 3, 4) that made the dependency order obvious. Adopted as standard after Phase 26.
- **Phase 31 (Tab Removal) is the right pattern for "deprecated feature removal".** Data migration (31-01) before code deletion (31-02) before cleanup (31-03). Three waves, zero downtime.

## 5. What didn't work

- **M2 was the largest single milestone (23 plans in 2.8 weeks = 8.2 plans/week).** In retrospect, M2a (Foundations: 22, 24, 25, 28 — 8 plans) and M2b (Architecture: 26, 27, 29, 30, 31 — 15 plans) would have been clearer. Not a process failure — just a hindsight insight.
- **No widget taxonomy doc.** Phase 24 (Surveys tab, moderation widget) and Phase 30 (HomeLayer widgets) shipped without a canonical widget-vs-feature-vs-module taxonomy. Mitigated in the Phase 29 defaults work, but a doc would have helped.
- **Phase 26 (Navigation) was a 3-plan coordination phase.** Single source of truth, More dropdown, 4-section burger, role-aware admin isolation. Each component team had to align. No coordination meeting was held; the PLAN.md served as the alignment doc. Worked, but barely.

## 6. Carry-over to next milestone

- [x] M2 done-state passed to M3.
- [x] Wave pattern adopted as standard.
- [x] HomeLayer/AdminLayer pattern (Phase 30, 34) became the template for the M3 layer work.
- [ ] Write M2 verification retro (this document).
- [ ] Tag M2 on main: `git tag v0.3.0 M2` (Gap N3).

## 7. Process changes for next milestone

- The 5-plan mega-phase pattern (Phase 30) is the upper limit. Don't exceed it without splitting.
- Layer architecture (HomeLayer, AdminLayer, ServicesLayer, MessagesLayer) is now codified. Future layer work should be 1-3 plans each.
