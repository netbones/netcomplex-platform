# API Infrastructure Audit — Phase 35

**Date:** 2026-05-28
**Scope:** Full audit of all API infrastructure against API.md, tRPC.md, and API_ARCHITECTURE.md

---

## Audit Scope

- All REST API routes under `src/app/api/` — 85+ route files
- tRPC setup at `src/shared/api/trpc/`
- Middleware at `src/middleware.ts`
- Auth setup at `src/shared/api/auth.ts`
- Entity modules under `src/entities/`
- DB layer at `src/shared/api/db.ts`
- OpenAPI spec at `src/app/api/openapi.json/route.ts`
- Tests at `src/test/`

---

## Current State Summary

### Already Aligned ✅

| Area                   | Details                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| **Auth**               | Better Auth with Drizzle adapter, org plugin, 2FA, passkey, bearer                          |
| **ORM**                | Drizzle ORM for all queries                                                                 |
| **Validation**         | Zod schemas for form/input validation                                                       |
| **Tenant Isolation**   | `withTenant()` helper, query scoping, header-based resolution (x-tenant-id, x-tenant-slug)  |
| **Permission Helpers** | `hasPermission()`, `requirePermission()`, `requirePlatformAdmin()`, `requireNotSuspended()` |
| **Logging**            | Pino configured with apiLogger, authLogger, dbLogger                                        |
| **ISR Caching**        | `revalidateDashboard()`, `revalidatePath()` patterns on mutations                           |
| **maxDuration**        | Applied to ~15 routes                                                                       |
| **tRPC Foundation**    | `publicProcedure`, `protectedProcedure`, `adminProcedure`, `agentProcedure` exist           |
| **@redocly/cli**       | Already installed in package.json                                                           |

### Gaps Found ❌

| ID  | Gap                                                                                                                      | Standard Reference                  | Priority |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | -------- |
| G1  | No trpc-openapi — OpenAPI spec is hand-written, stale, only describes 1 endpoint                                         | API.md §3.2, tRPC.md §16            | P0       |
| G2  | No standardized response envelope — Mix of `{success: true}`, raw data, `{data:...}`                                     | API.md §11                          | P0       |
| G3  | No canonical error codes — Ad-hoc strings, never the required `AUTH_REQUIRED`, `FORBIDDEN`, etc.                         | API.md §12                          | P0       |
| G4  | Raw DB entities exposed — No DTO layer exists anywhere                                                                   | API_ARCHITECTURE.md §13, API.md §15 | P0       |
| G5  | Canonical route structure not followed — No `/api/v1/`, `/api/public/`, `/api/tenant/`, `/api/system/`, `/api/webhooks/` | API_ARCHITECTURE.md §10, API.md §5  | P0       |
| G6  | Very limited tRPC adoption — Only 1 router (identity) with 12 procedures vs 85+ REST routes                              | tRPC.md §4, API.md §6               | P0       |
| G7  | No module-level DTOs/openapi/services — Canonical `module/dto/`, `module/openapi/`, `module/services/` absent            | API_ARCHITECTURE.md §11, API.md §19 | P1       |
| G8  | Inline role checks persist — `['BOARD','ADMIN'].includes(role)` used instead of `hasPermission()`                        | API.md §14.1                        | P1       |
| G9  | No API-level rate limiting                                                                                               | API.md §22                          | P1       |
| G10 | No request-level observability — No request IDs, tenant tracing, latency tracking                                        | API_ARCHITECTURE.md §16, API.md §21 | P1       |
| G11 | No audit logging for sensitive operations                                                                                | API.md §21.2                        | P1       |
| G12 | No OpenAPI CI validation — `npx redocly lint` not wired                                                                  | API.md §16.2, tRPC.md §17           | P1       |
| G13 | No feature gating at API layer — `FEATURE_DISABLED` never returned                                                       | API.md §18                          | P1       |
| G14 | No `src/server/` directory for canonical tRPC routers                                                                    | tRPC.md §15                         | P1       |
| G15 | No idempotency support on mutation endpoints                                                                             | API.md §25                          | P2       |
| G16 | Inconsistent pagination envelope — Not using canonical `{data, meta: {page, pageSize, total, hasMore}}`                  | API.md §30                          | P2       |
| G17 | Minimal API test coverage — Only schema tests + 3 route test files for 85+ routes                                        | API.md §27                          | P2       |
| G18 | Webhook architecture absent — No `/api/webhooks/` or signed-payload infrastructure                                       | API_ARCHITECTURE.md §18, API.md §24 | P2       |
| G19 | Error handling inconsistency — Mix of try/catch, bare `{error}`, and unhandled exceptions                                | tRPC.md §13                         | P2       |
| G20 | Background job handling absent — No background processing for long-running tasks                                         | API.md §26                          | P2       |

---

## Remediation Plan Overview

6 sub-phases, 12 plans, 4 execution waves:

```
Wave 1: A-01 (Response envelope + error codes)
Wave 2: B-01 (trpc-openapi), B-02 (Identity to tRPC), C-01 (Route structure), C-02 (DTO layer)
Wave 3: D-01 (Observability), D-02 (Rate limiting), E-01 (Module ownership)
Wave 4: F-01 (Tests + CI), F-02 (Compliance sweep)
```
