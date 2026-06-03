# M1 Retro — Core Communication & Auth

**Milestone:** M1 — Core Communication & Auth
**Date:** 2026-06-03
**Author:** Milestone review (2026-06-03 second pass)
**Verifiable spec:** `.planning/MILESTONES.md` §2 M1 — "A new resident can sign up, verify email, join a tenant, send a chat message that arrives in <2s."

## 1. What we said we'd deliver

Real-time chat, transactional email, schema hardening, self-service onboarding. 5 phases: 09 (real-time chat), 10 (email), 18 (toast unification), 19 (schema corrections), 20 (self-service inception).

## 2. What we actually delivered

- [x] **New resident can sign up** — PASS (Phase 20-01 fixed signup API: ownerId, Better Auth password, redirect).
- [x] **Verify email** — PASS (MailerSend wired in Phase 10; welcome + verification templates).
- [x] **Join a tenant** — PASS (5-step onboarding wizard in Phase 20-02 covers tenant creation; AssistSession in 20-03 for staff-assisted flow).
- [x] **Send a chat message that arrives in <2s** — PASS (Phase 09 wired Supabase Realtime on Message table; presence + typing indicators also shipped).

**Plan count:** 10 of 10 plans shipped. All 5 phases have SUMMARY files.

## 3. Velocity data

- **Phases:** 5 of 5 planned
- **Plans:** 10 of 10 planned (Toast Unification 18-01, Schema Corrections 19-01/02/03, Self-Service 20-01/02/03/04, Chat 09-01, Email 10-01)
- **Wall-clock duration:** 2026-04-23 (Phase 09 SUMMARY) → 2026-05-15 (Phase 20 SUMMARY) — **~3.3 weeks**
- **Pattern:** M0 was 7 weeks. M1 was 3.3 weeks. **Velocity doubled.** The codebase was now warm; the team had the patterns.

## 4. What worked

- **Toast unification (Phase 18) was small and decisive.** Single plan, removes Zustand Toast, migrates to Sonner, adds ADR-018. The kind of cross-cutting cleanup that pays off forever.
- **Schema corrections (Phase 19) shipped 3 plans in one phase.** Setting uniqueness, Tenant ownerId, isPlatformAdmin, Header role bug, Platform Admin tenant CRUD. Caught the bugs before they calcified.
- **Self-service inception (Phase 20) was 4 plans, well-scoped.** The AssistSession model (20-03) is a pattern worth replicating — time-limited scoped access without granting full role.

## 5. What didn't work

- **Phase 18 was placed inconsistently.** Originally listed in M1 here; my own ROADMAP re-order put it in M2. Fixed in 2026-06-03 milestone review (Section 7.1). Lesson: don't re-order without a checklist.
- **No security audit.** All 5 phases touch auth, sessions, schema. We did not run a security review at the M1 boundary. Mitigated informally — but the M1 launch checklist would have flagged this.
- **No load test for "message arrives in <2s".** The verifiable line is a performance claim; we did not stress-test under load. The claim is based on Supabase Realtime's published latency, not our measurement.

## 6. Carry-over to next milestone

- [x] M1 done-state passed to M2.
- [ ] Write M1 verification retro (this document).
- [ ] Tag M1 on main: `git tag v0.2.0 M1` (Gap N3).
- [ ] (Recommended for future milestones) Add a security audit step at the M1 boundary.

## 7. Process changes for next milestone

- Phase 19's "Critical schema fixes" pattern is a good template for future "fix the foundation" phases. Use again.
- The 4-plan pattern in Phase 20 (1 backend, 1 UI, 1 model, 1 gap closure) is reusable.
