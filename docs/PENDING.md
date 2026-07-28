# Pending Work Items

> Auto-generated on 2026-07-28. Items marked ⏳ across all docs/ files.
> BD issue refs are included where noted in source documents.

## STEERING

| File   | Items | Key BD Issues |
| ------ | ----- | ------------- |
| PRD.md | 29    | —             |
| API.md | 11    | —             |

## Architecture

| File                            | Items | Notes                                                               |
| ------------------------------- | ----- | ------------------------------------------------------------------- |
| AGENT_MODEL.md                  | 24    | Agent verification, commission tracking, marketplace, analytics     |
| cleaner_react_architecture.md   | 40    | API client, service layer, domain helpers, TanStack Query patterns  |
| DASHBOARD-PHASE-B-DISCUSSION.md | 4     | Mobile slot, module gating, transition strategy decisions           |
| MOBILE_MONOREPO.md              | 8     | App store readiness (privacy policy, screenshots, encryption, etc.) |

## Features

| File                                                 | Items | Key BD Issues                                   |
| ---------------------------------------------------- | ----- | ----------------------------------------------- |
| MAINTENANCE_TICKETING_SPEC.md                        | 26    | Admin dashboard, notifications, API compliance  |
| widget-registry-architecture-react-rnd-v2.md         | 26    | Config versioning, lazy loading, grid mechanics |
| widgets/widget-registry-architecture-react-rnd-v2.md | 26    | Duplicate of above                              |
| widgets/NETCOMPLEX_WIDGET_ALIGNMENT.md               | 16    | Widget checklist conventions                    |

## Migrations

| File                       | Items | Key BD Issues                                                         |
| -------------------------- | ----- | --------------------------------------------------------------------- |
| MIGRATION.md               | 29    | FSD migration epic `soralia-village-wpr`, pilot `soralia-village-rbs` |
| DATABASE_MIGRATION_v2.1.md | 7     | Schema migration verification, renter filtering                       |
| migration-plan-identity.md | 5     | Household UI, agent dashboard, admin deprecation                      |
| WHITE_LABEL_MIGRATE.md     | 7     | NetComplex tenant, Soralia tenant, org switcher, super-admin          |

## Multi-Tenant

| File                   | Items | Notes                                                      |
| ---------------------- | ----- | ---------------------------------------------------------- |
| MULTI_TENANT_SIGNUP.md | 6     | Middleware extraction, sign-up form, email uniqueness, DNS |

## Plans

| File             | Items | Notes                                                              |
| ---------------- | ----- | ------------------------------------------------------------------ |
| GATE_PLAN.md     | 12    | Gate access functions, migration per entity, legacy system removal |
| DASH_ADVISORY.md | 5     | Phase 11 completion, MyHomeSpace data, viewport-fit                |

## Advisories

| File                                           | Items | Key BD Issues                           |
| ---------------------------------------------- | ----- | --------------------------------------- |
| ADVISORY-008.md                                | 13    | —                                       |
| ADVISORY-009.md                                | 11    | —                                       |
| ADVISORY-010.md                                | 9     | —                                       |
| ADVISORY-011.md                                | 4     | —                                       |
| ADVISORY-012.md                                | 8     | —                                       |
| ADVISORY-013.md                                | 7     | —                                       |
| ADVISORY-014.md                                | 14    | —                                       |
| ADVISORY-015.md                                | 13    | —                                       |
| ADVISORY-016.md                                | 8     | —                                       |
| ADVISORY-017.md                                | 13    | —                                       |
| ADVISORY-017-SUPPLEMENTAL.md                   | 11    | —                                       |
| ADVISORY-017-SUPPLEMENTAL-2.md                 | 13    | —                                       |
| ADVISORY-017-SUPPLEMENTAL-2-ADDENDUM.md        | 4     | —                                       |
| ADVISORY-017-SUPPLEMENTAL-B.md                 | 12    | —                                       |
| ADVISORY-018.md                                | 8     | —                                       |
| ADVISORY-019.md                                | 3     | —                                       |
| ADVISORY-020.md                                | 16    | —                                       |
| ADVISORY-021.md                                | 8     | —                                       |
| ADVISORY-026.md                                | 7     | —                                       |
| ADVISORY-027.md                                | 6     | `soralia-village-sioz` (awaiting close) |
| ADVISORY-030.md                                | 10    | —                                       |
| ADVISORY-031.md                                | 17    | —                                       |
| ADVISORY-032-tenant-resolution-rls-fallback.md | 3     | —                                       |
| ADVISORY-034-platform-identity-layer.md        | 7     | —                                       |
| ADVISORY-SPECIAL-TIME-TRACKING.md              | 1     | —                                       |

## Contexts

| File            | Items | Notes                                                       |
| --------------- | ----- | ----------------------------------------------------------- |
| chat.md         | 1     | Message pruning not implemented                             |
| competitions.md | 1     | Missing widget registration                                 |
| content.md      | 1     | Content DTO not in shared barrel                            |
| user.md         | 2     | `residentType` overlap; suspension frontend not implemented |
| widget.md       | 1     | Phase 38 not started                                        |

## Communiques

| File             | Items | Notes                                                                 |
| ---------------- | ----- | --------------------------------------------------------------------- |
| COMMUNIQUE.md    | 5     | Admin plugin, banned/banExpires verification, test stop-impersonating |
| COMMUNIQUE-03.md | 13    | Gate context API, Zustand store, FeatureGateWall                      |

## Product

| File                      | Items | Notes                                                                                                    |
| ------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| user-stories-john-mary.md | 114   | Full lifecycle: registration, profiles, Premium Seat upgrade, agent workflows, eviction, multi-household |

## Standards

| File                                   | Items | Notes                                                                |
| -------------------------------------- | ----- | -------------------------------------------------------------------- |
| TECH_DEBT_REMEDIATION_PLAN.md          | 44    | Error boundaries, server components, lint, perf monitoring, security |
| TESTING_METHODS.md                     | 17    | Manual E2E test checklist items                                      |
| dependency-analysis-recommendations.md | 9     | Vercel Blob, auth provider migration, Drizzle schema migration       |

## SOLID Report (bd issues created)

From `todo/SOLID_REPORT.md`:

| Item                            | BD Issue               |
| ------------------------------- | ---------------------- |
| Domain service layer extraction | `soralia-village-nm2z` |
| WidgetRegistry abstraction      | `soralia-village-j8ke` |
| WidgetDataState consolidation   | `soralia-village-sdft` |

---

**Total: ~590 pending items across 55 files.**

Top-level workstreams represented:

- FSD migration (`soralia-village-wpr`) — 29 items in MIGRATION.md
- Multi-tenant / white-label — 13 items across 2 files
- Widget registry architecture — 68 items across 3 files
- Maintenance ticketing — 26 items
- User story implementation (John & Mary) — 114 items
- Tech debt remediation — 44 items
