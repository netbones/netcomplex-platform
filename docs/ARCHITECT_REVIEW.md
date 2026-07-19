# Architecture Review

> **Date:** 2026-07-18
> **Scope:** Architectural friction analysis across bounded contexts

---

## Candidates Found

### 1. Triple Feature Gating System

| Aspect | Detail |
|--------|--------|
| **Modules** | `gate.ts`, `feature-gate.ts`, `mappings.ts`, `registry.ts`, `platform-flags.ts`, `guards.ts`, `statsig-flags.ts`, `FLAG_DEFS`, `MODULES` constants |
| **Coupling** | 5-layer precedence gate uses 3 separate data sources (in-memory `FEATURE_REGISTRY`, DB-backed `isModuleEnabled`, DB-backed `PlatformPageFlags`) with 3 manual mapping tables (`FEATURE_TO_MODULE`, `FEATURE_TO_FLAG`, `FEATURE_TO_REGISTRY`) that must all stay in sync. Adding one feature requires touching 4+ files. |
| **Dependency type** | In-process (gate logic) + local-substitutable (DB lookups) |
| **Test impact** | 5-layer precedence tested in `gate.test.ts` but each layer's interaction is hard to test independently. Boundary tests could replace current unit tests. |
| **Context** | Tenant (Core) |

### 2. Property Type Proliferation (4 Shapes)

| Aspect | Detail |
|--------|--------|
| **Modules** | `@entities/tenant/model/types` (Property, 13 fields), `@entities/directory/model/types` (Property, 3 fields, no `id`), `@shared/api/dto/property.ts` (PropertyDto via drizzle-zod), Prisma/Drizzle schema |
| **Coupling** | Different field names across shapes (`streetAddress`/`unitNumber` in tenant vs `street`/`unit` in directory). Directory's `Property` dropped `id` but callers must reach into tenant for it. Every transformation between shapes is manual, error-prone, and untested. |
| **Dependency type** | In-process |
| **Test impact** | No boundary tests for the transformation/mapping between shapes. Only tested implicitly when feature tests render a card. |
| **Context** | Tenant, Directory, User |

### 3. Auth Utils — Kitchen Sink Growth

| Aspect | Detail |
|--------|--------|
| **Modules** | `auth-utils.ts` (244 lines), `auth-schemas.ts`, `auth-client.ts`, `auth.ts`, `with-error-handler.ts` |
| **Coupling** | `getSessionAndRole()` starts as session getter but also checks suspensions, auto-unsuspends expired ones, and returns UI-serialized suspension data. `requirePermission()` / `requireOwnPermission()` / `requireAnyPermission()` are three nearly-identical functions. Suspension mutation (auto-unsuspend) buried inside a query function violates CQRS. |
| **Dependency type** | Local-substitutable (DB queries) |
| **Test impact** | Auth utils tested only through integration — the mutation side-effect inside the query makes unit testing impossible. |
| **Context** | User/Identity (cross-cutting) |

### 4. Feature Registry as Monolithic POJO

| Aspect | Detail |
|--------|--------|
| **Modules** | `registry.ts` (595 lines — pages + features + widgets all in one flat object), `mappings.ts` (113 lines — 3 mapping tables), `platform-flags.ts` (168 lines), `settings-defs.ts` |
| **Coupling** | Adding a new feature requires touching `registry.ts` (add definition), `mappings.ts` (add 3 map entries), `platform-flags.ts` (maybe add flag def), `settings-defs.ts`. The `FEATURE_REGISTRY` object has no schema validation — a misspelled key silently returns `false` from `hasFeature()`. |
| **Dependency type** | In-process |
| **Test impact** | No tests verify that all registry keys have corresponding mapping entries. Integration tests catch misconfigurations at runtime. |
| **Context** | Tenant (Core) |

### 5. REST + tRPC Dual API Surface

| Aspect | Detail |
|--------|--------|
| **Modules** | 40+ REST route files in `src/app/api/` + 22 tRPC routers in `src/server/routers/` |
| **Coupling** | Some domains exist in both surfaces (content, bookings, etc.). tRPC routers use `@api/server` conventions, REST routes use Next.js `NextRequest`/`NextResponse`. No shared validation or error handling between the two. |
| **Dependency type** | In-process |
| **Test impact** | Dual surface means tests must cover both — or one surface drifts from the other. |
| **Context** | Cross-cutting (API Governance) |

### 6. Revalidation Module Using Paths Instead of Tags

| Aspect | Detail |
|--------|--------|
| **Modules** | `revalidation.ts` (132 lines) |
| **Coupling** | Calls `revalidatePath()` on individual paths, but ISR caching uses `unstable_cache` with `tags`. These are orthogonal mechanisms. `revalidateTag(CACHE_TAGS.SETTINGS)` would be more targeted than `revalidatePath('/api/flags')`. `revalidateAdminChanges()` calls 4 sub-revalidators, each hitting 3-5 paths — 19 `revalidatePath` calls for a single admin change. |
| **Dependency type** | In-process |
| **Test impact** | No tests exist for the revalidation module. Misconceptions about tag vs path semantics are invisible. |
| **Context** | Cross-cutting (ISR/Caching) |

---

## Priority Assessment

| # | Cluster | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 4 | Feature Registry | High — gates every feature decision | Medium | **Deep module design** — unify gating into single interface |
| 1 | Triple Gating | High — overlaps with #4 | Medium | Tackle alongside #4 (same root cause) |
| 3 | Auth Utils | Medium — violates CQRS | Low | Extract suspension into dedicated store |
| 2 | Property Types | Medium — causes subtle bugs | Medium | Consolidate around canonical DTO |
| 6 | Revalidation | Low-Medium — correctness bug | Low | Swap `revalidatePath` for `revalidateTag` |
| 5 | Dual API Surface | Low — intentional (tRPC for internal, REST for external) | High | Track but don't refactor yet |

---

## Next Steps

Candidate **#4 (Feature Registry)** selected for deep module design.
