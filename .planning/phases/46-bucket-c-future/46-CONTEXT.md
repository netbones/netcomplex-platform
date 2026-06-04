---
phase: 46-bucket-c-future
type: defer
status: planning
created: 2026-06-04
milestone: M5+ (post-launch)
---

# Phase 46: Bucket C Future Features

**Goal:** Defer and document 10 post-launch features (originally mislabeled as "Phase 4/5") so they remain visible in the backlog but don't block M4.5 → M5b.

**BD sources (10):**

- `gtm` — M5+ Post-launch: Notification system
- `cp8` — M5+ Post-launch: Payment processing
- `qx7` — M5+ Post-launch: Booking calendar integration
- `kia` — M5+ Post-launch: Provider analytics
- `9e8` — M5+ Post-launch: Provider dashboard
- `69c` — M5+ Post-launch: Third-party provider registration
- `4vk` — M5+ Post-launch: Service marketplace mobile optimization
- `4fh` — M5+ Post-launch: Provider billing & subscription
- `p81.1` — Orphan FSD migration state-change event
- `rbs.1` — Orphan FSD migration state-change event

**Why this phase exists:** When triaging 35 open BD issues, 10 referenced non-existent "Phase 4" or "Phase 5" milestones. These are real product ideas (notifications, payments, provider platform) but are correctly post-launch scope for the anchor tenant, not prerequisites.

**Acceptance:**

- All 10 BD issues re-titled to remove "Phase 4/5" references (already done in triage)
- All 10 tagged with `m5-plus`, `post-launch`, `phase-46`
- This CONTEXT.md created
- Issues remain open; no execution plans yet
- Future: when M5b is complete and the team has capacity, scope each into a sub-phase

**Out of scope:** Any M4.5/M5a/M5b work (different phases). dWallet (phase 47).

**Plans:** None. This is a deferral + documentation phase. The 10 issues remain in `bd ready --label phase-46` and can be promoted to scoped sub-phases when needed.

**Special notes:**

- p81.1, rbs.1 are orphan FSD migration state-change events. They have no actionable description. Tag `orphan,fsd-migration` was added during triage. They will be auto-closed if FSD migration is not resumed.
- The 8 feature issues (gtm, cp8, qx7, kia, 9e8, 69c, 4vk, 4fh) are organized into 2 product clusters: (1) Provider Platform (kia, 9e8, 69c, 4fh) and (2) Service Marketplace Enhancements (gtm, cp8, qx7, 4vk).
