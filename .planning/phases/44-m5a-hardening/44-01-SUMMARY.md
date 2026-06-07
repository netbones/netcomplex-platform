# 44-01 — Steiger FSD linter integration

## Goal
Establish a CI-enforced, locally-runnable architecture check for the Feature-Sliced Design boundaries in `src/`, with the existing ESLint guardrails as a complementary inner loop. Surface 582 pre-existing FSD violations as `warn` so debt is visible without blocking the build, and file BD issues for each debt cluster so follow-up Phase 44 plans can tighten the rules cluster-by-cluster.

## Baseline
- Scan tool: `steiger@0.5.12` with `@feature-sliced/steiger-plugin@0.5.8`
- Scope: `./src`
- Total violations: **582** (239 errors, 343 warnings)
- Full report: `44-01-baseline-report.txt`

| Rule                          | Total | Err  | Warn |
| ----------------------------- | ----- | ---- | ---- |
| no-public-api-sidestep        | 461   | 222  | 239  |
| forbidden-imports             | 91    | 45   | 46   |
| insignificant-slice           | 17    | 0    | 17   |
| public-api (missing)          | 7     | 7    | 0    |
| typo-in-layer-name            | 1     | 1    | 0    |
| shared-lib-grouping           | 1     | 0    | 1    |
| segments-by-purpose           | 1     | 0    | 1    |
| no-segmentless-slices         | 1     | 0    | 1    |
| no-reserved-folder-names      | 1     | 0    | 1    |
| inconsistent-naming           | 1     | 0    | 1    |

## Debt clusters (BD issues)
| Cluster                              | BD issue              | Priority | Count |
| ------------------------------------ | --------------------- | -------- | ----- |
| @api/* alias barrel-sidestep         | `soralia-village-qjpa` | P2       | 461   |
| entities/tenant cross-slice fan-in   | `soralia-village-08st` | P2       | 9     |
| entities/admin cross-slice fan-in    | `soralia-village-nf5r` | P2       | 26    |
| shared layers importing entities     | `soralia-village-znjo` | P2       | 28    |
| features/pricing importing app       | `soralia-village-3qio` | P3       | 1     |
| 7 slices missing public API          | `soralia-village-ohj8` | P2       | 7     |
| src/types/ at wrong FSD layer        | `soralia-village-s50y` | P3       | 1     |
| 12+ dead FSD slices                  | `soralia-village-3a3v` | P3       | 12+   |

## Files changed

| File                                                              | Change                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `package.json`                                                    | `+ "fsd:check": "steiger ./src"`; `+ @feature-sliced/steiger-plugin 0.5.8`; `+ steiger 0.5.12` |
| `pnpm-lock.yaml`                                                  | Steiger deps resolved                                                       |
| `steiger.config.js`                                               | NEW — recommended config + per-rule severity + `no-public-api-sidestep` allow-list for `@shared/lib/i18n` (justified by `soralia-village-de8x`) |
| `.github/workflows/fsd-lint.yml`                                  | NEW — runs `pnpm fsd:check` on PR/push to `dev` + `main` when `src/**` changes |
| `scripts/steiger-staged.sh`                                       | NEW — runs `pnpm fsd:check` only when FSD-relevant files are staged         |
| `.husky/pre-commit`                                               | `+ bash scripts/steiger-staged.sh` (after lint-staged + stash-protocol)     |
| `eslint.config.js`                                                | `+` cross-reference comment explaining the ESLint ↔ Steiger split            |
| `AGENTS.md`                                                       | `+` "FSD Architecture (Steiger)" section (commands, config, tuning policy, sidestep protocol) |
| `.planning/phases/44-m5a-hardening/44-01-PLAN.md`                 | NEW — 8-step plan                                                           |
| `.planning/phases/44-m5a-hardening/44-01-baseline-report.txt`     | NEW — full Steiger scan output (2924 lines)                                 |
| `.planning/phases/44-m5a-hardening/44-01-SUMMARY.md`             | NEW — this file                                                             |

## Verification
- `pnpm fsd:check` — exit 0, all 582 violations surface (warnings expected at `warn` severity)
- `bash scripts/steiger-staged.sh` (with no staged changes) — exits 0, prints "no FSD-relevant files staged, skipping"
- `bash scripts/steiger-staged.sh` (with a staged `src/foo.ts`) — runs full Steiger scan (~10s)
- `.husky/pre-commit` ordering preserved: `lint-staged` → `stash-protocol` → `steiger-staged`
- ESLint still catches deep imports inline; Steiger is the source of truth for cross-slice + slice hygiene

## Follow-up plans (Phase 44)
- 44-02 TBD — monitoring infra planning
- 44-03 TBD — audit closure wave A (`qig` + `9xr` + `2z4` + `r13u`)
- 44-04 TBD — audit closure wave B (`fpc` + `1eh`)
- 44-05 TBD — audit closure wave C (`1ei` + `5u2` + `brp` + `huo`)
- 44-06 TBD — M4.5 follow-ups (`tc4` + `mls9` + `n0rh` + `cs5`)
- 44-07 TBD — `nn39` advisories
- 44-08+ TBD — FSD debt remediation driven by Steiger findings (one plan per cluster)

## Out of scope (this plan)
- Fixing any of the 582 violations — the plan only adds the lint and files the BD issues
- Tightening any rule to `error` — every rule stays at `warn` until the corresponding debt cluster is closed in a follow-up plan
- Removing the `@api/*` tsconfig alias — deferred to a dedicated decision (cluster is the largest single source of debt)
- Pre-commit hook optimisation (Steiger doesn't support per-file scanning yet) — full scan runs on every commit, ~10s
- VSCode / IntelliJ editor integration for Steiger — no first-party plugin yet, command-line only

## Acceptance
- [x] `pnpm fsd:check` runs Steiger and exits 0 with 582 surfaced violations
- [x] `bash scripts/steiger-staged.sh` runs in `.husky/pre-commit` after lint-staged
- [x] `.github/workflows/fsd-lint.yml` runs in CI on PR/push to `dev` and `main`
- [x] `steiger.config.js` documents each rule's severity and any sidesteps
- [x] `eslint.config.js` cross-references Steiger as the architectural source of truth
- [x] `AGENTS.md` documents the FSD toolchain, tuning policy, and sidestep protocol
- [x] 8 BD issues filed, one per debt cluster, with `Phase: 44` reference
- [x] Baseline report committed for progress tracking
- [x] No FSD rules tightened to `error` — all 582 surface as `warn`
