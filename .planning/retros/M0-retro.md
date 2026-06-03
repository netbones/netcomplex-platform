# M0 Retro — Foundation

**Milestone:** M0 — Foundation
**Date:** 2026-06-03
**Author:** Milestone review (2026-06-03 second pass)
**Verifiable spec:** `.planning/MILESTONES.md` §2 M0 — "pnpm tsc --noEmit passes, pnpm test green, RLS policies in place."

## 1. What we said we'd deliver

Multi-tenant substrate + base modules. Nothing user-facing. 9 phases: 00 (foundation), 01 (enforcement), 02 (admin UI), 03 (localization), 05 (widget registry), 06 (maintenance), 07 (bookings), 08 (module architecture), 11 (announcements).

## 2. What we actually delivered

- [x] **pnpm tsc --noEmit passes** — PASS (TypeScript strict, no errors observed at any time after M0).
- [x] **pnpm test green** — PASS (test suite shipped with the milestone, 100% green on the M0 surface).
- [x] **RLS policies in place** — PASS for tables in M0 (Tenant, TenantModule, PlatformModule, MaintenanceRequest, Booking, Conversation, Announcement). Audit re M3 added tables (post-M0): incomplete coverage noted in Gap ζ context — to be verified as part of M3.

**Plan count:** 10 of 10 plans shipped. All 9 phases have SUMMARY files (no VERIFICATION.md at phase level; only Phase 22 has one in the entire project — see Gap S1).

## 3. Velocity data

- **Phases:** 9 of 9 planned
- **Plans:** 10 of 10 planned
- **Wall-clock duration:** 2026-04-05 (Phase 00 SUMMARY) → 2026-05-21 (Phase 11 Announcements SUMMARY) — **~7 weeks**
- **Pattern:** Steady cadence, no mega-bursts. Earliest milestones set the project's working rhythm.

## 4. What worked

- **Foundational phases shipped early.** Phases 00, 01, 02, 03 were the first 4 weeks of work and they gave the project its shape: multi-tenant substrate, enforcement helper, admin UI, i18n routing. Everything later depended on these.
- **Module architecture (Phase 08) was a force multiplier.** The two-table design (platform_modules + tenant_modules) plus the `assertModuleEnabled()` helper was reused by every subsequent feature phase.
- **i18n introduced at M0 (Phase 03), not retrofitted.** Catching the locale dimension early saved a large refactor in M2/M3.

## 5. What didn't work

- **No milestone-level VERIFICATION (Gap S1).** The "M0 is done" claim is the author's assertion, not a CI-checked signal. No milestone audit trail exists for any of M0-M3.
- **Phase 11 (Announcements) was deferred to M0 from M3.** Originally planned as M3 engagement work, moved to M0 because the schema was needed for Phase 30 (HomeLayer widget). The right call architecturally, but the boundary between "M0 substrate" and "M0 user-facing feature" is now fuzzy.
- **`03-localization` directory had no Verification pattern.** Set the precedent (bad) for all subsequent phases to skip verification.

## 6. Carry-over to next milestone

- [x] M0 done-state passed to M1.
- [ ] Write M0 verification retro (this document).
- [ ] Tag M0 on main: `git tag v0.1.0 M0` (Gap N3).

## 7. Process changes for next milestone

- Adopt the "wave" pattern from later phases in M0 plans. Earlier plans were monolithic.
- Codify the **status freshness rule** (Gap ζ): a phase is "Complete" only when SUMMARY.md exists and (where applicable) VERIFICATION.md exists. This is now in AGENTS.md cadence section.
