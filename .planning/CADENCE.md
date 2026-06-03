# Cadence & Velocity Analysis — Soralia Village

**Generated:** 2026-06-03
**Window analyzed:** 2026-04-05 → 2026-06-03 (8.5 weeks, 60 days)
**Source data:** `.planning/phases/*/*-SUMMARY.md` completion dates, ROADMAP.md statuses, STATE.md

---

## Executive Summary

| Metric                   | Value                                   |
| ------------------------ | --------------------------------------- |
| Total plans shipped      | 102                                     |
| Active days              | 16 of 60 (27%)                          |
| Peak day                 | 11 plans (2026-05-15)                   |
| Median active day        | 4 plans/day                             |
| Best weeks               | W20 + W22 (21 plans each)               |
| Worst stretch            | W15, W16, W18, W19 (4 weeks of zero)    |
| Currently in flight      | 0 (last SUMMARY is 31-03 on 2026-06-03) |
| Ready-to-execute backlog | 6 plans (Phase 41 × 3, Phase 42 × 3)    |
| Status discrepancies     | 3 (Phase 33, 38, 40)                    |

**Velocity health:** 7/10. Strong execution when active, but burst-then-plateau pattern + status drift + 6-plan ready backlog = ~25% of total plan count is in some form of limbo (planning-only, status drift, or queued).

---

## 1. Velocity Timeline (W14–W23, 2026)

```
Week   Plans Done  Activity
─────  ──────────  ─────────────────────────────────────
W14     5         Initial foundation (Phases 00–02)
W15     0         (gap)
W16     0         (gap)
W17     2         Phases 09–10 (chat, email)
W18     0         (gap)
W19     0         (gap)
W20    21         Burst: 18–27 (1 week, very dense)
W21    10         27–30 + 33
W22    21         35, 37, 38, 40, 31, 36 (1 week, dense)
W23    10         Continuing through 06-03
```

### Per-day distribution

```
Date         Plans
───────────  ─────
2026-04-05    5
2026-04-23    2
2026-05-15   11    ← peak
2026-05-16   10
2026-05-20    3
2026-05-21    3
2026-05-22    2
2026-05-23    2
2026-05-27    5
2026-05-28   10
2026-05-29    1
2026-05-30    4
2026-05-31    1
2026-06-01    3
2026-06-02    6
2026-06-03    1
```

### Velocity by week (active days only)

| Week | Plans | Daily avg | Notes                  |
| ---- | ----- | --------- | ---------------------- |
| W14  | 5     | 5/day     | Foundation burst       |
| W17  | 2     | 2/day     | Single day of activity |
| W20  | 21    | 10.5/day  | Highest-density week   |
| W21  | 10    | 3.3/day   | Decent sustained       |
| W22  | 21    | 5.3/day   | Second mega-burst      |
| W23  | 10    | 3.3/day   | Continuing             |

**Median active day: 3–4 plans/day. Peak: 11/day.**

---

## 2. Critical Gaps

### 🔴 Gap A: 4 weeks of zero GSD execution

**W15, W16, W18, W19** — two distinct silences:

- **Apr 6 – Apr 22** (2.5 weeks): gap between foundation (W14) and chat/email (W17)
- **Apr 27 – May 10** (2 weeks): gap before the W20 burst

This is **a quarter of the project window with no GSD-tracked work.** Either:

- (a) GSD pipeline was adopted later than W14, or
- (b) meaningful work happened but wasn't recorded

### 🔴 Gap B: 3 ROADMAP/STATE status discrepancies

Phases marked as "In Progress" or "Planning Complete" on disk, but actually fully executed and verified:

| Phase                        | ROADMAP says        | Reality (on disk)                                         |
| ---------------------------- | ------------------- | --------------------------------------------------------- |
| **33-user-suspension**       | "In Progress"       | 2/2 plans shipped, VERIFIED 14/14 must-haves (2026-05-28) |
| **38-space-layers**          | "Planning Complete" | 4/4 plans shipped, VERIFIED (2026-05-30)                  |
| **40-maintenance-ticketing** | "Planning Complete" | 4/4 plans shipped, all 5/31–6/1                           |

These are **bookkeeping bugs** — work is done but tracking says otherwise. STATE.md also shows Phase 33 as still in flight, suggesting `/gsd-complete-milestone` was never called. This makes it hard to know what "in progress" actually means right now.

### 🟡 Gap C: 2 ready-to-execute phases, not started (6 plans)

| Phase                             | Plans | Why it matters                                                                                                                           |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **41-feature-gate-consolidation** | 3     | Adds `canAccess()` foundation; Phase 2/3 callsite migration is blocked on this. CI drift test (GATE-07) cannot be written until shipped. |
| **42-i18n-hydration-fix**         | 3     | 37 widget i18n migrations queued in BD `0f7` waiting on this.                                                                            |

**Active backlog = 6 plans across 2 phases.**

### 🟡 Gap D: 3 planning-only phases (1 plan each) deferred to other workstreams

| Phase                  | Deferred to                           | Disposition                          |
| ---------------------- | ------------------------------------- | ------------------------------------ |
| `03-second-tenant`     | Phase 20 (self-service inception)     | Stale planning artifact — superseded |
| `04-content-i18n`      | BD epic `l23`                         | Stale planning artifact — superseded |
| `11-prisma-to-drizzle` | Adopted incrementally (per AGENTS.md) | Stale planning artifact — superseded |

These pollute the `bd ready` and `/gsd-progress` output. **Recommended: archive to milestones in a follow-up pass.**

---

## 3. Observations

- **W22 burst (21 plans) is suspicious** — could be either hyper-productivity or under-tracked complexity. Worth checking task density per plan.
- **Phase 35 (10/10 plans)** is the largest single phase in the project — a "10-plan mega-phase" usually signals work that should have been split. It is appropriately scoped (response envelope, tRPC migration, DTO layer, observability, rate limiting, module ownership, test suites, compliance sweep) but is a lot to track.
- **Phase 31 ran 4.7 hours** (281min on 31-02, per STATE.md metrics table) — outlier duration suggests complexity, but the SUMMARY indicates mechanical migration work, so this may be inflated.
- **VERIFICATION.md pattern is inconsistent** — only some phases have it (33, 38 do; 31, 35, 36, 40, 41 don't despite being "complete"). Verification is a tracked gate, not a nicety.

---

## 4. Current Status (Reality vs ROADMAP)

```
Real "in flight" work:
  - Nothing actually in flight. Last SUMMARY is 31-03 on 2026-06-03.
  - STATE.md says "Phase 36 complete — ready for verification" but
    Phase 36 is on-disk complete+verified already.
  - STATE.md says "Next Step: Execute 36-03-PLAN.md" but 36-03 is
    already done.
  - The real next step is: pick up 41 or 42 (both ready-to-execute).

What "Ready to execute" means here:
  - Phase 41 (3 plans, narrow scope, post-advisory audit)
  - Phase 42 (3 plans, 2 waves, i18next provider + tx() helper)
  - 5 architecture audit issues (qig, fpc, 9xr, 5u2, 1ei) from
    docs/cleaner_react_architecture.md
  - 4 P2 issues: l23, 0f7, cs5, 0tb (OTP reset)
```

---

## 5. Recommendations (priority order)

1. **Fix status discrepancies** (Gap B) — quick win. Update ROADMAP.md and STATE.md to reflect reality:
   - Phase 33 → "Complete" (verified 14/14)
   - Phase 38 → "Complete" (verified)
   - Phase 40 → "Complete" (4/4 plans shipped)
2. **Pick up Phase 41 or Phase 42 next** — both ready, both unblock downstream work. Per GSD worktree protocol (mandated 2026-06-03), do this in a worktree.
3. **Archive the 3 deferred planning-only phases** (Gap D) — `03-second-tenant`, `04-content-i18n`, `11-prisma-to-drizzle`. (Deferred per session 2026-06-03.)
4. **Address the W15–W19 silence** — if the work was done but not tracked, retro-fill the SUMMARY frontmatter with actual completion dates; if it was never done, the work is in `done` state and not at risk.
5. **Set a cadence baseline** — the burst pattern (21+10+21 in 3 weeks) is unsustainable. Aim for 5–7 plans/week sustained, which is 50% of the burst rate but 3× the median.

---

## 6. Velocity Health Verdict

**Score: 7/10**

Execution velocity is strong when active, but the burst pattern + status drift + ready backlog of 6 plans means ~25% of total plans (29 of 110 across all phases) are either in planning limbo, marked "in progress" when shipped, or about to start. None of this is blocking, but it's accounting debt that compounds.

---

_Last updated: 2026-06-03 after health check (E002 resolved) and ROADMAP format reconciliation. Will be regenerated at milestone boundaries._
