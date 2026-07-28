# ADVISORY-SPECIAL-TIME-TRACKING: Cost/Time Tracking Layer for BD + GSD + Git

> **⚠️ NUMBERING NOTE:** This advisory is issued as **SPECIAL** (unnumbered) pending
> confirmation against DavDev's external advisory register. At last count the
> numbered series was in the mid-to-high 020s (ADVISORY-026/027/028 in flight).
> **Do not rename this file to a numbered ADVISORY-XXX.md until DavDev confirms
> the next free number against the register.** This is a process/tooling
> advisory, not a schema-migration advisory — it touches no Prisma models —
> but it still follows the standard format for consistency and auditability.

**Status:** In Progress — Phase 1–4 implemented, Phase 5 pending adoption
**Date:** 2026-07-04
**Author:** Claude (architectural advisor)
**Origin:** Ad-hoc request (no COMMUNIQUE-XX precursor) — company needs to attribute
engineering time to project cost centers
**Scope:** Process/tooling only. No application code, schema, or runtime behavior
changes. Agent execution is limited to creating the log file(s) and a git hook —
no production paths touched.

---

## 1. Problem Statement

The project has two issue-tracking systems (`bd` for atomic work, GSD phase
plans for large efforts) and git for version control — none of which capture
**elapsed time**, only **what was done**. The company needs to attribute
engineering time to project cost centers (ultimately billed/reported), and
there is currently no mechanism to do this that:

1. Doesn't require abandoning the existing `bd`/GSD/advisory workflow
2. Distinguishes human time from agent-execution time, and does so **across
   multiple agent harnesses** (opencode most frequently, plus Claude Code,
   command-code, anti-gravity, and others as they're adopted) — each with its
   own cost structure and its own log/usage-export format
3. Doesn't assume any single harness as the source of truth for execution
   cost, since the harness in use varies by task and may change again
4. Rolls up cleanly from atomic `bd` issues to GSD phases to advisories,
   without manual reconstruction after the fact

## 2. Root Cause Analysis

Three tools, three different unit-of-work granularities, zero shared time
dimension:

| System          | Unit of work                                  | Has time data?                                                                                                                                                             |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bd`            | Issue (bug fix, small feature, research task) | No                                                                                                                                                                         |
| GSD phase plans | Phase → child tasks                           | No                                                                                                                                                                         |
| git             | Commit                                        | Timestamp exists, but is a poor proxy (commits cluster; review/discussion/advisory time is invisible; a commit at 5pm and one at 9am next day don't imply 16 hours worked) |

The advisory-first workflow compounds this: DavDev's review and decision-gate
time (the highest-judgment, arguably highest-cost activity) leaves **no trace
in git at all** — it happens in conversation/document review, not commits.
Any git-timestamp-based estimate will systematically undercount this and
overcount idle-commit gaps.

**Harness heterogeneity is a second, independent complication.** Execution
work isn't done by one agent tool — opencode is the most frequent, but
command-code, anti-gravity, and others are in rotation, each with its own
session/log format and its own cost model (some metered per-token, some
per-seat/subscription, some unmetered self-hosted). A design that hard-codes
one harness's usage export as "the" source of execution cost breaks the
moment the harness changes, and doesn't compose across a task that touches
two harnesses in one session.

**The only two things every harness and every human touches are git and
`bd`.** That's the actual commonality worth building on — not any individual
tool's logs. The design below treats harness-specific logs as _inputs to be
reconciled per-harness_, never as the schema's backbone.

## 3. Options Considered

| Option                                                                                         | Description                                                    | Pros                                                                                                                                  | Cons                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Git-timestamp inference**                                                                 | Derive time from commit deltas                                 | Zero new process                                                                                                                      | Systematically wrong in both directions (see above); doesn't capture advisory/review time at all                                                                                                   |
| **B. Full time-tracking SaaS (Toggl/Clockify/Harvest) as source of truth**                     | Log everything in a dedicated tool, tag by bd ID               | Purpose-built reporting, mature                                                                                                       | Yet another system; tagging discipline still required; adds a paid dependency for a small team                                                                                                     |
| **C. Lightweight `TIME_LOG` file(s) in-repo, keyed by bd ID, with optional SaaS export later** | CSV/markdown log committed alongside code, one row per session | No new paid tool; versioned with the work it describes; trivially greppable/summable; can feed a SaaS tool later if volume demands it | Manual entry discipline required; no built-in reporting UI (mitigated with a small script)                                                                                                         |
| **D. Require `bd` custom field for time-per-issue, entered on close**                          | Extend `bd close` workflow with a `--hours` flag               | Ties directly to existing tool                                                                                                        | Depends on `bd`'s support for custom fields (unconfirmed — see discovery checklist); loses session-level granularity (can't distinguish advisory-review time from execution time within one issue) |

## Recommendation

**Option C (lightweight in-repo `TIME_LOG`), with the `bd` ID as the universal
join key across git, bd, and GSD.** This is the minimum-process addition that:

- Requires no new paid tooling or vendor lock-in
- Fits the existing "advisory produces a document, agent executes, DavDev
  reviews" model — the log is just another artifact
- Is trivially exportable to a SaaS tool later (Option B) if reporting needs
  grow, since the raw data (bd ID, bucket, duration, date) is tool-agnostic

Option D is not rejected outright — it's folded in as a **secondary,
optional** convenience (a `bd close` summary field) once Phase 1 confirms
`bd`'s custom-field support (Gate G1 below).

## 4. Architecture

### Before

```
bd issue ──(no time data)──> ??? ──(no time data)──> Cost report (manual/guesswork)
GSD phase ──(no time data)──┘
git commit ──(timestamp only, unreliable proxy)──┘
```

### After

```
                    ┌─────────────────────────────┐
                    │   TIME_LOG.csv (per-entry)   │
                    │   docs/TIME_LOG.csv          │
                    └──────────────┬───────────────┘
                                   │ tagged with bd_id
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
              bd issue        git commit    GSD phase plan
           (Refs: bd-<id>   (Refs: bd-<id>  (bd_refs: [...]
            trailer in       trailer,        frontmatter)
            bd metadata)     enforced by
                             commit-msg hook)
                     │             │             │
                     └─────────────┴─────────────┘
                                   ▼
                    docs/reports/TIME_SUMMARY.md
                    (generated rollup — sums by bd_id,
                     bucket, week, GSD phase)
```

### Schema: `docs/TIME_LOG.csv`

One row per logged session (a session = one continuous block of work by one
person or one agent run). Committed to the repo, append-only in practice
(corrections via a new row with a negative duration, never edited history —
same append-only discipline as your Conflict Register).

```csv
date,bd_id,bucket,person,agent_tool,duration_minutes,description,gsd_phase
2026-07-04,bd-4a6,review,davdev,,45,"Reviewed ADVISORY-026 decision gates",
2026-07-04,bd-4a6,advisory,claude,,0,"Advisory drafting — cost tracked in Anthropic usage, not this row",
2026-07-04,oqw,execution,agent,opencode,0,"See opencode session log; cost reconciled separately per §agent_tool",43
2026-07-03,t78,research,davdev,,90,"Investigated RLS rollout scope for 30 deferred tables",
2026-06-28,57d,execution,agent,command-code,0,"See command-code run log for this session",43
```

**Column definitions:**

| Column             | Type                                                        | Notes                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date`             | `YYYY-MM-DD`                                                | Date the session occurred                                                                                                                                                                                                                                                                                                                |
| `bd_id`            | string                                                      | The bd issue ID. **Required, no exceptions.** If work doesn't yet have a bd issue, create one first — this is the enforcement point                                                                                                                                                                                                      |
| `bucket`           | enum                                                        | One of: `advisory` \| `execution` \| `review` \| `research` \| `discussion`. See §5 bucket definitions below                                                                                                                                                                                                                             |
| `person`           | string                                                      | `davdev`, `agent`, or another named contributor. `agent` rows are for reference/reconciliation only                                                                                                                                                                                                                                      |
| `agent_tool`       | string, **required when `person = agent`**, blank otherwise | Which harness produced this execution session: `opencode`, `claude-code`, `command-code`, `anti-gravity`, or others as adopted. This is the field that lets execution cost be reconciled _per-harness_ — each tool's own log/usage export is the actual cost source, this column just tells the rollup script which export to go look at |
| `duration_minutes` | integer                                                     | Human-logged wall-clock minutes. `0` is valid for `agent` rows (cost lives in the harness's own log, not hand-logged)                                                                                                                                                                                                                    |
| `description`      | string                                                      | Free text, quoted if it contains commas                                                                                                                                                                                                                                                                                                  |
| `gsd_phase`        | string, optional                                            | Phase number if this bd issue is a child task under a GSD phase (e.g., `43`). Blank for standalone bd work                                                                                                                                                                                                                               |

### Three cost buckets (kept separate deliberately — see prior discussion)

| Bucket       | Captures                                                                                | Logged by                                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `advisory`   | Writing/reading advisories, communiqués, decision-gate deliberation                     | DavDev (and Claude's advisory-drafting time, logged at `0` minutes/informational, since Claude's cost is API-metered separately)                                                                         |
| `execution`  | An agent harness running the approved plan                                              | Reconciled against the originating harness's own usage/session log (`agent_tool` column tells you which one — opencode, Claude Code, command-code, anti-gravity each export differently), not hand-timed |
| `review`     | DavDev reviewing agent output, running quality gates (`pnpm typecheck`, Steiger, tests) | DavDev                                                                                                                                                                                                   |
| `research`   | Investigation/discovery work (bd's own "research task" category)                        | DavDev                                                                                                                                                                                                   |
| `discussion` | Verbal/chat discussion not captured elsewhere                                           | DavDev                                                                                                                                                                                                   |

Blending these into one number was explicitly rejected — it hides whether
cost is concentrated in decision-making, execution, or review, which is the
whole point of tracking it.

### GSD phase plan frontmatter addition

To roll GSD phases up from their child bd issues mechanically rather than by
manual reconstruction, add one field to each `.planning/phases/<N>/PLAN.md`:

```yaml
---
phase: 43
title: m4-5-blockers
bd_refs:
  - oqw
  - 57d
  - t78
---
```

### Git commit trailer convention

Every commit that closes or advances a bd issue carries a trailer:

```
Refs: bd-<id>
```

Example:

```
fix: correct RLS GUC name from app.role to app.user_role

Refs: bd-4a6
```

This is **not** a replacement for `TIME_LOG.csv` — it's the cross-reference
that lets a future audit correlate "what changed" with "how long it took"
without re-deriving time from timestamps.

---

## 5. Pre-Execution Discovery Checklist

> **Executed 2026-07-04.** Results below.

```bash
# 1. Confirm bd supports custom fields / metadata (needed for Option D, secondary)
bd --help | grep -i field
bd show <any-existing-id> --help 2>/dev/null || bd show <any-existing-id>
→ RESULT: bd has no native time/estimate field. Option D is dead.

# 2. Confirm no existing TIME_LOG or equivalent already exists (avoid duplicate effort)
find . -iname "*time*log*" -not -path "*/node_modules/*" -not -path "*/coverage/*"
grep -ril "time.log\|timelog" docs/ scripts/ 2>/dev/null
→ RESULT: No TIME_LOG.csv found. Only this advisory and phase 46.1 research mention it.

# 3. Confirm current commit-msg hook state (don't clobber an existing hook)
cat .git/hooks/commit-msg 2>/dev/null || echo "no commit-msg hook present"
ls -la .git/hooks/ | grep -v sample
→ RESULT: No commit-msg hook. Project uses Husky v9 (package.json). New hook placed at .husky/commit-msg.

# 4. Confirm GSD PLAN.md frontmatter conventions (don't break existing parsers)
grep -rl "^---" .planning/phases/*/PLAN.md 2>/dev/null | head -5
head -20 .planning/phases/43-m4-5-blockers/*/*.md 2>/dev/null
→ RESULT: PLAN.md files use YAML frontmatter (--- delimiters). bd_refs is additive, non-breaking.

# 5. Inventory each agent harness currently in rotation
#    - opencode      → ~/.local/share/opencode/log/opencode.log (key=value lines, run=id sessions)
#    - Claude Code   → ~/.claude/history.jsonl (314 entries, JSONL)
#    - command-code  → not installed on this system
#    - anti-gravity   → not installed on this system
→ RESULT: Two harnesses with discoverable sessions. agent_tool column isolates per-harness reconciliation.

# 6. Confirm whether any harness already writes its own log files into the repo
find . -maxdepth 2 -iname "*.agent*" -o -iname "*session*log*" 2>/dev/null | grep -v node_modules
→ RESULT: No agent log files in repo. All logs live outside the repo.
```

**STOP-AND-ESCALATE:** No blockers found. Proceeded to implementation.

---

## 6. Phased Execution Plan

**Phase 1 — Scaffolding (no behavior change) ✅ 2026-07-04**

1. Created `docs/TIME_LOG.csv` with header row only
2. Created `docs/reports/TIME_SUMMARY.md` stub
3. Files committed — explicitly not gitignored

**Phase 2 — Git enforcement ✅ 2026-07-04**

4. Added `.husky/commit-msg` — warns (not blocks) when commit message lacks `Refs: bd-<id>` trailer. Husky v9 compatible.
5. Documented convention in `AGENTS.md` under "Time & Cost Attribution" section

**Phase 3 — Rollup tooling ✅ 2026-07-04**

6. Wrote `scripts/summarize-time-log.ts` — reads `TIME_LOG.csv`, sums by `bd_id`, `bucket`, `gsd_phase`, and week; writes `docs/reports/TIME_SUMMARY.md`
7. Added `just time-report` recipe to `justfile`

**Phase 4 — GSD integration ✅ 2026-07-04**

8. Added `bd_refs` frontmatter field to planner `<downstream_consumer>` spec in `~/.claude/get-shit-done/workflows/plan-phase.md`
9. Backfilled `bd_refs` for currently-active phase 43:
   - 43-01 → `tc4` (prisma/seed.ts)
   - 43-02 → `cs5` (MyHomeSpace property linking)
   - 43-03 → `e0w` (80-route audit)
   - 43-04 → `oqw` (RLS enforcement)
   - 43-05 → `ltn` (request validation plugin)

**Phase 5 — Adoption (pending)**

10. DavDev begins logging `advisory`/`review`/`research` sessions going forward. No retroactive backfill of historical time.

---

## 7. Risk Register

| Risk                                                                                                                                                 | Likelihood                       | Impact                      | Mitigation                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logging discipline lapses (people forget to append rows)                                                                                             | High                             | Medium                      | Commit-msg hook nags on missing `Refs:` trailer; keep the CSV append as low-friction as possible (one-liner, no app to open)                                                                                                                                                                                        |
| `TIME_LOG.csv` merge conflicts (append-only file, concurrent edits)                                                                                  | Low (single primary contributor) | Low                         | Append-only convention avoids most conflicts; if team grows, revisit with per-person log files merged by the rollup script                                                                                                                                                                                          |
| Double-counting agent compute cost (hand-logged minutes vs. harness billing)                                                                         | Medium                           | Low (cost, not correctness) | `agent` bucket rows are informational only (duration = 0 by convention); actual cost reconciled per-harness from that tool's own usage export, never summed from the CSV                                                                                                                                            |
| Harness log format heterogeneity (opencode, Claude Code, command-code, anti-gravity each export differently, and formats may change as tools update) | Medium                           | Medium                      | `agent_tool` column isolates which export format applies per row; the rollup script (`summarize-time-log.ts`) treats harness reconciliation as a per-tool plugin/lookup rather than baking one format's assumptions into the schema — adding a new harness later means adding a lookup, not changing the CSV schema |
| Harness switch mid-task (e.g., started in opencode, finished in command-code)                                                                        | Low                              | Low                         | Log one row per harness session, not per bd issue — a single bd issue can have multiple `execution` rows with different `agent_tool` values                                                                                                                                                                         |
| Scope creep into a full time-tracking SaaS integration                                                                                               | Low                              | Medium                      | Explicitly deferred — Option C chosen as minimum viable; revisit only if reporting needs outgrow a CSV                                                                                                                                                                                                              |

---

## 8. Done Criteria

- [x] ✅ `docs/TIME_LOG.csv` exists with the schema above, committed
- [x] ✅ `commit-msg` hook installed and confirmed non-blocking (warn-only) in Phase 2
- [x] ✅ `AGENTS.md` updated with the "Time & Cost Attribution" section
- [x] ✅ `scripts/summarize-time-log.ts` runs and produces `docs/reports/TIME_SUMMARY.md`
- [x] ✅ GSD `PLAN.md` template includes `bd_refs` frontmatter field
- [ ] ⏳ DavDev has logged at least one real session end-to-end to validate the workflow

---

## 9. Decision Gates

- **G0 — Advisory numbering:** Pending — confirm against external register before renaming.
- **G1 — `bd` custom-field capability:** ✅ Resolved — `bd` has no native time/estimate field. Option D is dead. CSV-first approach confirmed.
- **G2 — Hook enforcement level:** ✅ Resolved — shipped as warn-only (`.husky/commit-msg` exits 0 always). Revisit after 2–4 weeks.
- **G3 — Retroactive backfill:** ✅ Resolved — none performed. Start clean from adoption date.
- **G4 — SaaS escalation trigger:** Pending — define what triggers moving from CSV to a dedicated tool.

---

_This advisory introduces no schema changes, no application code changes, and
touches no production paths. All numbered artifacts (hook, script, CSV,
template field) are additive and reversible._
