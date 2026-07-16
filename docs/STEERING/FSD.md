# FSD (Feature-Sliced Design)

Feature-Sliced Design is the enforced architecture for `src/`. Boundaries are
linted by **Steiger** (`@feature-sliced/steiger-plugin`) and ESLint
`no-restricted-imports`, with a deliberate `warn`→`error` tuning policy
(see `steiger.config.js`).

## Layers

| Layer           | Purpose                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`          | Next.js App Router routes + route groups (`(auth)`, `(platform)`, `(tenant)`), dynamic `[lng]`, `api/` |
| `entities/`     | Business entities / domain models                                                                      |
| `features/`     | Feature-specific business logic                                                                        |
| `widgets/`      | Reusable composite UI                                                                                  |
| `page-modules/` | Page-level compositions                                                                                |
| `shared/`       | Shared utilities, UI, API clients                                                                      |
| `processes/`    | Cross-feature business workflows (reserved)                                                            |

> Note: `db/`, `test/`, and `types/` are conventional directories, **not** FSD
> layers in the Steiger sense — they sit outside the slice hierarchy.

## Current state (tracker-of-record)

FSD enforcement debt is tracked, not narrated. The numbers below are the source
of truth; re-run `pnpm fsd:check` to refresh.

- **Baseline (2026-06-07):** 582 violations (239 errors + 343 warnings) —
  `.planning/phases/44-m5a-hardening/44-01-baseline-report.txt`
- **Latest delta (2026-07-16):** 533 (1 error + 532 warnings) —
  `.planning/phases/44-m5a-hardening/44-07-STEIGER-DELTA-2026-07-16.md`
- **BD issue:** `soralia-village-jftz` — close `no-public-api-sidestep` (464) +
  `forbidden-imports` (44) clusters
- **ESLint-side plan:** `.planning/todos/fsd-cleanup.md` (`no-restricted-imports`
  deep-import remediation)

### Dominant clusters (2026-07-16)

| Cluster                          | Count | Severity  | Plan                                                                                                                               |
| -------------------------------- | ----: | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `no-public-api-sidestep`         |   464 | warn      | CI budget gate; reduced by ADR-024 `server.ts` consolidation                                                                       |
| `forbidden-imports`              |     0 | **error** | promoted 2026-07-16; 6 genuine violations fixed (types→shared, StandingBadge→widget), 3 cross-entity config couplings allow-listed |
| `excessive-slicing` (`features`) |     1 | warn      | group 25 `features` slices into domain groups (BD `soralia-village-jftz`)                                                          |
| `insignificant-slice`            |    15 | warn      | cleanup dead slices (BD `3a3v`)                                                                                                    |

### Inside `src/app/`

Feature-based page directories: bookings, campaign, competition, conservation,
directory, groups, guidelines, interest, maintenance, member, messages, news,
notifications, privacy, proudly-soralia, resident, resources, services,
settings, terms, unit. The `app/` layer is the application entry point and a
container for feature-specific pages — it integrates with (not replaces) the
FSD slice layers above.
