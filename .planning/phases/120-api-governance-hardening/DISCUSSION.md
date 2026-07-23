# Phase 120: API Governance Hardening

**Goal:** Close the 3 systemic gaps between tRPC router implementations and the Netcomplex API Governance Standard (`API.md`, `API_ARCHITECT.md`).

**Status:** Planning

**Milestone:** M5 — Platform Launch (hardening)

---

## Context

The tRPC audit (tranches 1–3, phases completed via BD) hardened security and architecture but revealed 3 systemic governance violations across all 20 routers:

1. **Response envelope (Rule 4):** tRPC procedures return raw data; governance requires `{success, data, meta}` on all paths.
2. **Error codes (Rule 5):** tRPC uses native codes (`UNAUTHORIZED`, `BAD_REQUEST`); governance requires canonical set (`AUTH_REQUIRED`, `VALIDATION_ERROR`).
3. **DTO mapping (Rule 6):** Most procedures return raw Drizzle `InferSelectModel` rows; governance requires Zod-validated DTOs.

Secondary: missing `tenantProcedure`/`privilegedProcedure` tiers, no suspension/feature checks in auth layers, flat REST structure.

---

## Requirements

| ID     | Requirement                                                  | Source        |
| ------ | ------------------------------------------------------------ | ------------- |
| GOV-01 | All tRPC responses use `{success, data, meta}` envelope      | API.md Rule 4 |
| GOV-02 | All tRPC errors use canonical error codes                    | API.md Rule 5 |
| GOV-03 | No raw Drizzle rows returned; all outputs mapped through DTO | API.md Rule 6 |
| GOV-04 | `tenantProcedure` tier exists (session + membership)         | ARCHITECT.md  |
| GOV-05 | `privilegedProcedure` tier exists (tenant + permission)      | ARCHITECT.md  |
| GOV-06 | 5-step auth check formalized as middleware                   | API.md Rule 7 |
| GOV-07 | API classification metadata on all procedures                | API.md Rule 2 |
| GOV-08 | OpenAPI meta on all external-facing procedures               | ARCHITECT.md  |

---

## Task Breakdown

### Wave 1: Foundation (infrastructure only, no router changes)

| #   | Task                                   | Files                              | Effort |
| --- | -------------------------------------- | ---------------------------------- | ------ |
| 1.1 | Create `ApiEnvelope` types + helpers   | `src/shared/api/envelope.ts` (new) | S      |
| 1.2 | Create canonical tRPC error mapper     | `src/shared/api/trpc/server.ts`    | S      |
| 1.3 | Create `tenantProcedure` tier          | `src/shared/api/trpc/server.ts`    | S      |
| 1.4 | Create `privilegedProcedure` tier      | `src/shared/api/trpc/server.ts`    | S      |
| 1.5 | Create `authLayerMiddleware` (5 steps) | `src/shared/api/trpc/server.ts`    | M      |

**Wave 1 delivers:** New exported procedures + helpers. Zero router changes. Verifiable via unit tests.

### Wave 2: DTO Layer (one DTO per domain entity)

| #    | Task                                                 | Files                           | Effort |
| ---- | ---------------------------------------------------- | ------------------------------- | ------ |
| 2.1  | Create `src/server/dto/` directory + index           | 1 file                          | S      |
| 2.2  | Identity DTOs (user, property, profile, album)       | `src/server/dto/identity.ts`    | M      |
| 2.3  | Content DTOs (content, announcement)                 | `src/server/dto/content.ts`     | S      |
| 2.4  | Chat DTOs (conversation, message)                    | `src/server/dto/chat.ts`        | S      |
| 2.5  | Marketplace DTOs (listing, review, inquiry, booking) | `src/server/dto/marketplace.ts` | M      |
| 2.6  | Maintenance DTOs (request, team, note)               | `src/server/dto/maintenance.ts` | S      |
| 2.7  | dWallet DTOs (wallet, transaction, consent)          | `src/server/dto/dwallet.ts`     | S      |
| 2.8  | Surveys DTOs (survey, question, response)            | `src/server/dto/surveys.ts`     | S      |
| 2.9  | Events, Bookings, Groups, Merits, Notifications DTOs | `src/server/dto/*.ts`           | M      |
| 2.10 | Achievements, Invitations, Settings, Agents DTOs     | `src/server/dto/*.ts`           | S      |

**Wave 2 delivers:** Type-safe DTO schemas for every entity. Zero router changes. Verifiable via `z.safeParse()` snapshot tests.

### Wave 3: Router Migration (apply envelope + codes + DTOs per router)

| #    | Task                                                                        | Router                     | DTO dep | Effort |
| ---- | --------------------------------------------------------------------------- | -------------------------- | ------- | ------ |
| 3.1  | Migrate identity router (largest — 1835 lines)                              | `routers/identity.ts`      | w2.2    | L      |
| 3.2  | Migrate content router (1017 lines)                                         | `routers/content.ts`       | w2.3    | M      |
| 3.3  | Migrate marketplace + sub-routers (6 files)                                 | `routers/marketplace/*.ts` | w2.5    | L      |
| 3.4  | Migrate chat sub-routers (3 files)                                          | `routers/chat/*.ts`        | w2.4    | M      |
| 3.5  | Migrate maintenance + sub-routers (5 files)                                 | `routers/maintenance/*.ts` | w2.6    | M      |
| 3.6  | Migrate dwallet (576 lines)                                                 | `routers/dwallet.ts`       | w2.7    | M      |
| 3.7  | Migrate surveys + sub-routers (5 files)                                     | `routers/surveys/*.ts`     | w2.8    | M      |
| 3.8  | Migrate events, bookings, groups, merits, notifications (5 files)           | `routers/*.ts`             | w2.9    | M      |
| 3.9  | Migrate achievements, invitations, settings, agents, competitions (5 files) | `routers/*.ts`             | w2.10   | M      |
| 3.10 | Migrate disputes, resources (2 files)                                       | `routers/*.ts`             | w2.9    | M      |

**Wave 3 delivers:** Every procedure returns `{success, data, meta}`, uses canonical error codes, and maps through DTOs.

### Wave 4: Classification + OpenAPI

| #   | Task                                             | Files                 | Effort |
| --- | ------------------------------------------------ | --------------------- | ------ |
| 4.1 | Add `@public`/`@tenant`/`@privileged` JSDoc tags | All 20 router files   | M      |
| 4.2 | Add OpenAPI `.meta()` to surveys/external.ts     | `surveys/external.ts` | S      |
| 4.3 | Update governance docs with completion status    | `docs/STEERING/`      | S      |

---

## Dependencies

```
Wave 1 (infra) ──► Wave 2 (DTOs) ──► Wave 3 (routers) ──► Wave 4 (meta)
                      │
                      └── DTOs are independent of each other (parallel)
```

Waves are strictly sequential. Within each wave, smaller tasks can run in parallel.

---

## Risk Assessment

| Risk                                  | Likelihood | Impact | Mitigation                                             |
| ------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| Response envelope breaks frontend     | High       | High   | Add envelope at tRPC middleware level; keep compatible |
| DTO mapping misses columns            | Medium     | Medium | Derive from Drizzle schema via `drizzle-zod`           |
| Migration churn breaks OpenAPI export | Medium     | High   | Run `redocly lint` after each wave                     |
| TypeScript compile time balloons      | Low        | Medium | Use project references                                 |
| This phase is large (40+ tasks)       | High       | Medium | Trim scope — only waves 1–3 initially                  |

---

## Verification

For each wave:

1. `pnpm tsc --noEmit` passes
2. `pnpm lint` passes (no new violations)
3. `pnpm test` passes (existing tests still green)
4. Manual check: 3 random procedures per wave confirm envelope shape

Post-phase:

1. `redocly lint` on OpenAPI export passes
2. All `z.any()` occurrences eliminated from external procedures
3. 0 raw `InferSelectModel` returns in any procedure
4. Governance checklist (from API_ARCHITECT.md output format) confirmed

---

## Scope Boundaries

**IN scope:**

- tRPC routers only (internal + external procedures)
- DTO files, envelope middleware, error code mapper
- `tenantProcedure` + `privilegedProcedure` tiers
- Classification metadata (JSDoc tags)

**OUT of scope:**

- REST routes (already compliant via `apiSuccess`/`apiError`)
- Prisma schema changes
- New features or bug fixes
- Test coverage beyond existing tests
- Rate limiting (completed in BD `soralia-village-7fly`)
- N+1 queries (completed in BD `soralia-village-ge7w`)
- ctx type narrowing (completed in BD `soralia-village-wdnk`)
- Tenant-configurable defaults (completed in BD `soralia-village-4vci`)
