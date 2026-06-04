---
phase: 45-m5b-anchor-tenant
type: execute
status: planning
created: 2026-06-04
milestone: M5b (anchor tenant launch)
---

# Phase 45: M5b Anchor Tenant Launch

**Goal:** Ship the 5 launch-blocking features for Soralia Village's 180-home rollout. Each is a feature, not a fix — the system functions without it, but the anchor tenant experience is incomplete.

**BD sources:**

- `2at` (P2 feature) — Community Merits & Standing System (flagship)
- `l23` (P2 epic) — i18n for all pages (37-widget batch)
- `0f7` (P2 feature) — Tiptap content localization (depends on l23)
- `0tb` (P4 feature) — OTP-based password reset
- `cs5` (P2 bug) — MyHomeSpace property linking (also M4.5 blocker; double-tracked)

**Why this phase exists:** M5b is the "anchor tenant launch" milestone. The 5 features here are the differentiators for Soralia Village vs the generic Netcomplex platform. Community Merits drives engagement, i18n drives 4-locale adoption, OTP drives security posture.

**Acceptance:**

- All 5 BD issues closed with a feature commit
- Community Merits system live in production for 1+ week
- All widget/page content available in 4 locales (en, es, fr, zu)
- Tiptap editors can save/load content in any locale
- OTP password reset works end-to-end (Better Auth + email)
- MyHomeSpace correctly links user → property (closes cs5 from phase 43 if not already)

**Out of scope:** M5a architecture work (phase 44), M5+ post-launch (phase 46), dWallet (phase 47).

**Plans:** TBD. Run `/gsd-plan-phase 45-m5b-anchor-tenant` when ready to plan execution.

**Dependencies:**

- l23 blocks 0f7 (Tiptap localization needs i18n router extension to tenant routes — same blocker as deferred Phase 04)
- cs5 ideally resolved in phase 43 to avoid duplicating fix work
