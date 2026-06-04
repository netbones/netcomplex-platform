---
phase: 47-dwallet-planning-build
type: plan-then-execute
status: planning
created: 2026-06-04
milestone: M5+ (post-launch, external dependency)
---

# Phase 47: dWallet Planning & Build

**Goal:** Plan and implement dWallet (digital wallet) integration for Soralia Village, dependent on NetBones Privacy-as-a-Service for legal/privacy foundation.

**BD sources (2):**

- `7cp` — Complete formal POPIA compliance audit for South Africa tenant
- `jc1` — Implement cookie management for privacy compliance

**Why this phase exists:** dWallet (Netcomplex's user-facing digital wallet) is a flagship post-launch feature. South African POPIA compliance (Soralia's jurisdiction) is foundational to dWallet — no compliance, no wallet. Cookie management is required for NetBones Privacy-as-a-Service which dWallet depends on for user consent and data subject rights.

**External dependency:** NetBones Privacy-as-a-Service (external product, integration not yet scoped).

**Acceptance:**

- POPIA compliance audit completed with formal sign-off
- Cookie management UI + backend deployed
- NetBones Privacy-as-a-Service integrated (or explicit deferral if not ready)
- dWallet feature spec (PRD) created
- dWallet implementation plan (multiple sub-phases) created

**Out of scope:** M4.5/M5a/M5b work (different phases). M5+ other post-launch (phase 46).

**Plans:** TBD. Run `/gsd-plan-phase 47-dwallet-planning-build` when ready.

**Special notes:**

- This is a "plan-then-execute" phase: scoping is heavy, execution depends on external product
- 7cp and jc1 are tagged `dwallet,deferred` to make ownership clear
- Estimated complexity: HIGH — privacy/compliance is not a typical dev task
- Likely needs specialized contractor (legal counsel for POPIA, NetBones integration engineer)
