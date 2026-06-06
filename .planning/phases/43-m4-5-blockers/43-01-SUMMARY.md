---
phase: 43-m4-5-blockers
plan: 01
subsystem: database
tags: [prisma, drizzle, seed, tc4, shim, postgres]

# Dependency graph
requires:
  - phase: 40-04
    provides: scripts/seed-drizzle.ts working seed (regression introduced later)
provides:
  - prisma/seed.ts as a 26-line re-export shim that delegates to scripts/seed-drizzle.ts
  - export of seed() from scripts/seed-drizzle.ts so the shim can import it
  - Closes BD tc4 (P1: prisma/seed.ts schema type errors) at the file-level AC
affects: [phase-43 follow-up work, M4.5 soak, M5 launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-export shim pattern for Prisma CLI compatibility: thin entry point that delegates to a working canonical script, preserving the 'npx prisma db seed' entry convention without duplicating data or migrations."

key-files:
  created: []
  modified:
    - prisma/seed.ts (replaced 1630-line broken file with 26-line re-export shim)
    - scripts/seed-drizzle.ts (added 'export' keyword to async function seed() at line 2997; body unchanged)

key-decisions:
  - "Re-export shim pattern (Plan Option A) over consolidation via package.json (Plan Option B) — preserves Prisma's prisma/seed.ts convention, leaves pnpm db:seed script intact, no data duplication"
  - "Did NOT modify package.json per the plan's hard constraint — but this means 'npx prisma db seed' cannot discover the shim without an additional 'prisma.seed' config block (logged as a separate BD follow-up)"

patterns-established:
  - "Shim file ≤40 lines that imports a named function from a working script and re-invokes it with try/catch + explicit process.exit() to satisfy Prisma's exit-code contract"
  - "Adding 'export' to a previously top-level-only function to enable import without restructuring or duplicating its body"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-06-06
---

# Phase 43 Plan 01: Replace Broken prisma/seed.ts with Shim

**prisma/seed.ts replaced with a 26-line re-export shim that delegates to scripts/seed-drizzle.ts; closes the file-level AC of BD tc4 (P1: prisma/seed.ts schema type errors) by removing the 1630-line broken file in favor of a clean entry point.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-06T10:00:00Z
- **Completed:** 2026-06-06T10:12:00Z
- **Tasks:** 1 of 2 fully completed (Task 1 = shim replaced, accepted; Task 2 = end-to-end runtime validation blocked on pre-existing regressions, see Deviations)
- **Files modified:** 2

## Accomplishments

- **`prisma/seed.ts` is now a clean 26-line shim** (was 1630 lines of broken Prisma code). Single import, single call to `seed()` from `scripts/seed-drizzle.ts`, explicit `process.exit(0)` on success / `process.exit(1)` on error to satisfy Prisma's exit-code contract.
- **`scripts/seed-drizzle.ts` now exports `seed()`** — the `export` keyword was added at line 2997; the function body and the top-level `seed().catch(...).finally(...)` invocation at lines 3206-3211 are unchanged, so `pnpm db:seed` continues to work exactly as before.
- **`pnpm typecheck` shows 0 errors in `prisma/seed.ts`** — the BD `tc4` AC at the file level ("prisma/seed.ts schema type errors") is closed. The 1 pre-existing typecheck error in `scripts/seed-drizzle.ts` (line 3004, `await db.update(users).set(...)`) is explicitly out of scope per the plan.
- **`npx prisma validate` passes** — Prisma schema is valid.
- **Pre-existing regressions surfaced** and logged for follow-up (see Deviations § 1 and § 2 below).

## Task Commits

1. **Task 1: Replace broken prisma/seed.ts with shim + add export to seed()** - `c4e3aa8` (fix)
2. **Plan metadata: this SUMMARY** - `<see git log>` (docs)

**Total commits on `phase-43-m4-5-blockers`: 2** (1 fix + 1 docs)

_Note: Task 2 (end-to-end runtime validation) was not committed separately because it surfaced pre-existing regressions that are out of scope for plan 43-01. See Deviations below._

## Files Created/Modified

- `prisma/seed.ts` — Replaced 1630-line broken file with 26-line shim. Imports `{ seed }` from `../scripts/seed-drizzle`, calls `seed()` inside `main()` with try/catch-equivalent `.catch()`, logs "✅ Seed complete" on success, "❌ Seed failed: ..." on error, `process.exit(0/1)` per Prisma's contract.
- `scripts/seed-drizzle.ts` — Added `export` keyword to `async function seed()` at line 2997 (the function body and the top-level `seed().catch(...).finally(...)` block at lines 3206-3211 are unchanged). Enables the shim to import `seed()` while preserving the `pnpm db:seed` script behavior.

## Decisions Made

- **Shim approach (Option A) over consolidation (Option B)**: Followed the plan's recommended approach — keep `prisma/seed.ts` as a thin shim rather than deleting it and adding `prisma.seed` to package.json. The shim preserves Prisma's expected file location convention.
- **Did NOT modify `package.json`**: Per the plan's hard constraint. This means `npx prisma db seed` cannot auto-discover the shim — a `prisma.seed` config block is needed. This is logged as a separate BD follow-up.
- **Did NOT add `try/catch` inside `main()` body**: Used `main().catch(error => ...)` instead, which is equivalent for top-level error handling and matches the file's idiomatic style. The plan's "try/catch inside main()" wording was illustrative.

## Deviations from Plan

### Auto-fixed Issues

None. Per the SCOPE BOUNDARY rule, pre-existing issues in unrelated files (seed-drizzle.ts runtime regression) were not auto-fixed. See "Issues Encountered" below.

### Out-of-scope Discoveries (logged for follow-up)

The plan AC for Task 2 requires `npx prisma db seed` to exit 0 and produce seeded data. **Two pre-existing issues prevent this**, neither caused by plan 43-01's changes:

**1. Missing `prisma.seed` config in package.json**

- **Found during:** Task 2 (end-to-end validation)
- **Issue:** `npx prisma db seed` requires either a `prisma.seed` config block in `package.json` (Prisma 5.x) or a `seed` block in `prisma/schema.prisma` (legacy). Neither is present. Running `npx prisma db seed` produces: _"Add the following example to it: `prisma: { seed: 'ts-node prisma/seed.ts' }`"_. The shim exists but Prisma doesn't know to invoke it.
- **Workaround for verification:** `pnpm exec tsx prisma/seed.ts` invokes the shim directly and confirms the shim is correct.
- **Pre-existing in:** c9235a9 (phase-43 base commit) and earlier — the original 1630-line `prisma/seed.ts` was never wired into `npx prisma db seed` either. The plan did not address this gap.
- **Recommendation:** File a new BD issue to add a `prisma.seed` config block to `package.json`. The plan's hard constraint prohibited this change from within plan 43-01; surfacing as a follow-up respects the constraint.
- **Files affected:** `package.json` (would need a `prisma: { seed: "pnpm exec tsx prisma/seed.ts" }` block — additive only, does not change existing `db:seed` script).

**2. Pre-existing seed-drizzle.ts runtime regression: missing `gen_random_uuid()` default on `Tenant.id`**

- **Found during:** Task 2 (end-to-end validation)
- **Issue:** `scripts/seed-drizzle.ts` calls `db.insert(tenants).values(TENANT)` where `TENANT` (line 51) has no `id` field. The Drizzle `tenants` schema (line 6) defines `id: text('id').primaryKey()` with NO default. The DB column also has no default (verified via `information_schema.columns`). The insert fails: _"Failed query: insert into 'Tenant' ... values (default, $1, $2, default, ...) on conflict ..."_. Verified that this fails identically at `c9235a9` (the base of the phase-43 worktree) before any plan-43 changes.
- **Root cause (historical):** Commit `9e6778a` ("refactor: use auto-generated UUIDs for Tenant IDs") added `.default(sql\`gen_random_uuid()\`)`to`id: text('id').primaryKey()`in`src/db/schema/tenants.ts`. Commit `1f717a0`(feat(11-01): add Announcement targeting, priority taxonomy, and announcements permission) regenerated the Drizzle schema from Prisma WITHOUT preserving that default expression — likely because Prisma's`@default(uuid())`generator did not emit a SQL`default`for a`text` primary key. Result: schema and DB both lost the default.
- **Impact:** `pnpm db:seed` (the project's existing seed entry point, which the plan's AC says "still works") is ALSO broken in this worktree. This is unrelated to `prisma/seed.ts` and outside plan 43-01's scope.
- **Recommendation:** File a new BD issue to restore the `gen_random_uuid()` default on `Tenant.id` in `src/db/schema/tenants.ts` and run a Prisma migration to apply it to the DB column. After the default is restored, the existing seed will produce UUIDs and proceed past the Tenant insert.
- **Files affected:** `src/db/schema/tenants.ts` (would need `.default(sql\`gen_random_uuid()\`)` restored on line 6) and a new Prisma migration to ALTER the column.

---

**Total deviations:** 0 auto-fixed (per SCOPE BOUNDARY rule).
**Impact on plan:** The plan's core deliverable (replacing the 1630-line broken prisma/seed.ts with a clean shim) is complete and verified at the file level. The two pre-existing regressions are surfaced for separate work and do not block the literal BD `tc4` AC ("prisma/seed.ts schema type errors" — the file has no type errors after this plan).

## Issues Encountered

- **Task 2 cannot fully complete the runtime AC** because both pre-existing regressions (missing `prisma.seed` config, missing `gen_random_uuid()` default) are outside plan 43-01's scope and the plan's hard constraint prohibits modifying `package.json`. The shim itself works correctly when invoked directly via `pnpm exec tsx prisma/seed.ts` — it imports `seed`, calls it, exits with the correct code. Both pre-existing regressions are logged for follow-up.
- **`npx prisma validate` passes** — Prisma schema is valid (verifies the must_have: "schema.prisma is valid" implied by the prisma CLI workflow).
- **`pnpm typecheck` shows 0 errors in prisma/seed.ts** — the must_have "no schema type errors in prisma/seed.ts" is satisfied. Pre-existing errors elsewhere in the codebase (including 1 in `scripts/seed-drizzle.ts` line 3004) are out of scope.
- **`pnpm lint` shows 0 issues in prisma/seed.ts and scripts/seed-drizzle.ts** — the 3 pre-existing lint errors in unrelated `src/widgets/...` files are out of scope.

## Quality Gate Results

| Gate                                       | Command                                                      | Result                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma schema valid                        | `npx prisma validate`                                        | PASS                                                                                                                                                     |
| TypeScript typecheck (shim only)           | `pnpm typecheck \| grep "prisma/seed.ts"`                    | PASS (0 matches)                                                                                                                                         |
| ESLint (seed files)                        | `pnpm lint \| grep -E "prisma/seed\\.ts\|seed-drizzle\\.ts"` | PASS (0 matches)                                                                                                                                         |
| End-to-end seed via `pnpm db:seed`         | `pnpm db:seed`                                               | **BLOCKED** (pre-existing seed-drizzle.ts Tenant.id regression)                                                                                          |
| End-to-end seed via `npx prisma db seed`   | `npx prisma db seed`                                         | **BLOCKED** (missing `prisma.seed` config in package.json AND pre-existing seed-drizzle.ts regression)                                                   |
| End-to-end seed via direct shim invocation | `pnpm exec tsx prisma/seed.ts`                               | PASS at shim level (delegates to seed() correctly; seed() itself fails at Tenant insert due to pre-existing regression — same failure as `pnpm db:seed`) |

## User Setup Required

None - no external service configuration required. The shim is self-contained.

## Next Phase Readiness

- **BD `tc4` (file-level AC) is closed** — `prisma/seed.ts` no longer has schema type errors; it is a 26-line shim.
- **For M4.5 soak startup** (which the BD `tc4` AC was meant to enable), TWO follow-up issues need resolution in a separate plan or worktree:
  1. **BD-FOLLOWUP-1**: Add `prisma.seed` config to `package.json` so `npx prisma db seed` knows to invoke `prisma/seed.ts`. (Add `"prisma": { "seed": "pnpm exec tsx prisma/seed.ts" }`.)
  2. **BD-FOLLOWUP-2**: Restore `gen_random_uuid()` default on `Tenant.id` in `src/db/schema/tenants.ts` and run a Prisma migration to apply it to the DB column. This is the actual seed-drizzle.ts blocker — once `Tenant.id` has a default, both `pnpm db:seed` and `npx prisma db seed` (with the config from BD-FOLLOWUP-1) will produce the canonical seed.
- **Other phase-43 plans (cs5, e0w, oqw, ltn)** are unaffected by these follow-ups and can proceed in parallel.
- **No regressions** to existing `pnpm db:seed` invocation syntax — the script entry point in `package.json` is unchanged.

---

_Phase: 43-m4-5-blockers_
_Completed: 2026-06-06_
