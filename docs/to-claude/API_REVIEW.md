# Comprehensive API Layer Architecture Analysis

## 1. `src/server/` Directory Structure

- **Total files:** 57 files across 5 subdirectories

| Directory   | Files                     | Purpose                                 |
| ----------- | ------------------------- | --------------------------------------- |
| `routers/`  | 26 files (10 sub-modules) | 19 domain routers + shared/sub-routers  |
| `dto/`      | 13 files                  | DTO schemas derived from Drizzle tables |
| `openapi/`  | 1 file                    | OpenAPI spec generator                  |
| `payments/` | 3 files + 1 test          | PayPal & Paystack integrations          |

### Router Inventory (19 top-level routers)

identity, competitions, content, notifications, resources, maintenance, chat, surveys, events, bookings, disputes, dwallet, marketplace, groups, merits, settings, achievements, invitations, agents

### Sub-router Splits (complex domains)

- `maintenance/` → requests, categories, providers, teams + shared.ts
- `surveys/` → management, questions, sections, external + shared.ts
- `chat/` → conversations, messaging + shared.ts
- `marketplace/` → 9 sub-routers + shared.ts

### Router Configuration (tRPC Middleware & Auth Pattern)

The tRPC setup at `src/shared/api/trpc/server.ts` (214 lines) implements a 5-step auth middleware chain:

| Tier                  | Middleware                                                                    |
| --------------------- | ----------------------------------------------------------------------------- |
| `publicProcedure`     | None                                                                          |
| `protectedProcedure`  | Step 1: Session exists                                                        |
| `tenantProcedure`     | Steps 1–2: Session + tenant membership                                        |
| `privilegedProcedure` | Steps 1–4: Session + tenant + role (ADMIN/BOARD/COMMITTEE) + suspension check |
| `adminProcedure`      | Steps 1–4: Session + tenant + role (ADMIN/BOARD only) + suspension            |
| `agentProcedure`      | Steps 1–3: Session + tenant + role (AGENT/ADMIN/BOARD)                        |

Suspension check (`checkNotSuspended`) auto-unsuspends expired timed suspensions and throws `TRPCError` with message `'SUSPENDED_USER'` for active ones. Rate limiting middleware is available as `rateLimitMiddleware(config)` which wraps `protectedProcedure`.

### Error Handling

Custom `errorFormatter` rewrites tRPC native codes to canonical codes (via `TRPC_TO_CANONICAL` mapping):

- `UNAUTHORIZED` → `AUTH_REQUIRED`
- `FORBIDDEN` → `FORBIDDEN` (keeps alias from `envelope.ts`; tRPC maps `FORBIDDEN` → same)
- `BAD_REQUEST` → `VALIDATION_ERROR`
- `NOT_FOUND` → `NOT_FOUND`
- `TOO_MANY_REQUESTS` → `RATE_LIMITED`
- `INTERNAL_SERVER_ERROR` → `INTERNAL_ERROR`

Special message signals are intercepted: `'SUSPENDED_USER'` and `'FEATURE_DISABLED'` (before code mapping).

## 2. `src/shared/api/` — Shared API Utilities

**Total:** 58 files organized into subdirectories.

### Key Infrastructure Files

| File                               | Purpose                                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/index.ts` (234 lines)      | Massive barrel re-exporting DB tables, auth helpers, response builders, tRPC procedures, revalidation, rate limiting, email, AI providers, tenant billing |
| `client/index.ts` (2 lines)        | Minimal — only `authClient` + `trpc`                                                                                                                      |
| `trpc/server.ts` (214 lines)       | tRPC initialization with context, procedures, error formatter, middleware                                                                                 |
| `trpc/client.ts` (4 lines)         | `createTRPCReact<AppRouter>()`                                                                                                                            |
| `auth.ts` (225 lines)              | Better Auth config with Drizzle adapter, 2FA, orgs, passkeys, emailOTP, validator plugin                                                                  |
| `auth-utils.ts` (225 lines)        | REST-route auth helpers: `getSessionAndRole`, `requireNotSuspended`, `throwIfSuspended`, `requirePermission`, `requireAnyPermission`                      |
| `rate-limit.ts` (117 lines)        | Redis-based rate limiting (Upstash/SUGA), `rateLimitByKey`, `rateLimitByIP`, `rateLimitByUser`                                                            |
| `api-response.ts` (158 lines)      | Canonical response builders: `apiSuccess`, `apiError`, `apiCreated`, `apiPaginated`, plus convenience error wrappers                                      |
| `envelope.ts` (78 lines)           | DTO envelope types: `toEnvelope()`, `toPaginatedEnvelope()`, `toErrorEnvelope()`, `tRPCCodeToCanonical()`                                                 |
| `with-error-handler.ts` (33 lines) | Generic wrapper catching Zod errors and unhandled exceptions in REST routes                                                                               |
| `rls-context.ts` (20 lines)        | Resolves Row-Level Security context from session                                                                                                          |
| `auth-schemas.ts` (79 lines)       | Zod schemas for signup, sign-in, forget/reset password, OTP verification                                                                                  |
| `db.ts` (482 lines)                | Drizzle ORM client (node-postgres, pool max 10, connection timeout 5s), all table schemas, `runWithRLS()`                                                 |
| `db.test.ts`                       | DB connection tests                                                                                                                                       |

### DTO Schemas (`src/shared/api/dto/`)

11 DTO files with tests: user, property, booking, event, group, household, message, conversation, resource, content, notification, announcement, invitation, competition. These exist in both `src/shared/api/dto/` AND `src/server/dto/` — some duplication.

## 3. REST API Routes: Massive Duplication with tRPC

- **Route count:** 200+ REST route files across the `src/app/api/` tree

### Canonical v1 Structure (PARTIALLY POPULATED)

The canonical structure mandated by `API.md` section 5 exists but is incomplete:

```
src/app/api/v1/
├── public/ (competitions, content, events, resources) — 4 domains
├── tenant/ (17 subdirectories) — most domains
├── platform/ (onboarding, tenants) — partial
└── system/ (flags, health) — 2 routes
```

Meanwhile, the flat legacy routes (`/api/surveys`, `/api/resources`, etc.) constitute the majority of the codebase and operate in parallel.

### Duplication Matrix: tRPC Routers vs REST Routes

| Domain             | tRPC Router                         | REST Routes (flat)                                      | REST Routes (v1)                                                |
| ------------------ | ----------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Surveys            | `surveysRouter` (4 sub-routers)     | `/api/surveys/` (9 route files)                         | `/api/v1/tenant/surveys/`                                       |
| Resources          | `resourcesRouter`                   | `/api/resources/` (5 route files)                       | `/api/v1/tenant/resources/`                                     |
| Disputes           | `disputesRouter`                    | `/api/disputes/` (9 route files)                        | —                                                               |
| Bookings           | `bookingsRouter`                    | `/api/bookings/`                                        | `/api/v1/tenant/bookings/`                                      |
| Events             | `eventsRouter`                      | `/api/events/` (3 route files)                          | `/api/v1/tenant/events/`                                        |
| Maintenance        | `maintenanceRouter` (4 sub-routers) | `/api/maintenance/` (12 route files)                    | `/api/v1/tenant/maintenance/`                                   |
| Identity/Users     | `identityRouter`                    | `/api/users/` (5 route files)                           | `/api/v1/tenant/users/`                                         |
| Community Services | `marketplaceRouter` (9 sub-routers) | `/api/community-services/` (8 route files)              | `/api/v1/tenant/community-services/`                            |
| Groups             | `groupsRouter`                      | `/api/groups/` (4 route files)                          | `/api/v1/tenant/groups/` (6 route files)                        |
| Content            | `contentRouter`                     | `/api/content/` (4 route files)                         | `/api/v1/tenant/content/`                                       |
| Notifications      | `notificationsRouter`               | `/api/notifications/` (2 route files)                   | `/api/v1/tenant/notifications/`                                 |
| Conversations      | `chatRouter` (2 sub-routers)        | `/api/conversations/`, `/api/messages/` (4 route files) | `/api/v1/tenant/conversations/`, `/api/v1/tenant/messages/`     |
| Merits             | `meritsRouter`                      | `/api/merits/` (3 route files)                          | —                                                               |
| Invitations        | `invitationsRouter`                 | `/api/invitations/` (4 route files)                     | `/api/v1/tenant/invitations/` (4 route files)                   |
| Competitions       | `competitionRouter`                 | `/api/competitions/` (2 route files)                    | `/api/v1/public/competitions/` + `/api/v1/tenant/competitions/` |
| DWallets           | `dwalletRouter`                     | `/api/admin/dwallet/` (6 route files)                   | `/api/v1/tenant/dwallet/` (9 route files)                       |
| Announcements      | —                                   | `/api/announcements/`                                   | `/api/v1/tenant/announcements/`                                 |
| Households         | —                                   | `/api/households/`                                      | `/api/v1/tenant/households/`                                    |

**Assessment:** Nearly every domain has both tRPC procedures and REST handlers doing the same operations (list, get, create, update, delete). This is a massive maintenance burden and a source of behavioral drift.

## 4. OpenAPI Spec Generation & Governance

**Generator:** `src/server/openapi/generator.ts`

- Uses `@trpc/openapi`'s `generateOpenAPIDocument()` pointing at `src/shared/api/trpc/routers.ts`
- Generates from the `appRouter`'s OpenAPI-annotated procedures
- Adds `bearerAuth` security scheme for all operations
- Cached singleton with promise deduplication
- CLI invocation support (`npx tsx src/server/openapi/generator.ts [outputPath]`)
- Output: `public/openapi.json`
- Public endpoint: `GET /api/openapi.json`

### OpenAPI Meta Coverage

Per `API.md` section 34.6: 24 procedures carry `.meta({ openapi })`. Given 235+ total procedures across 20+ routers, this means only ~10% are OpenAPI-exported. The remaining ~90% are internal-only (which is intentional per the governance model). All external procedures have verified `method`, `path`, `tags`, and `protect` fields.

## 5. Authorization Check Analysis

### tRPC Routes: Strong, Consistent

The middleware chain in `src/shared/api/trpc/server.ts` enforces authentication, tenant scoping, role checks, and suspension checks consistently at the procedure tier level. All 235+ procedures are tagged with JSDoc classification (`@public`, `@tenant`, `@privileged`).

### REST Routes: Mixed Quality

**Good practices observed:**

- `admin/activity/route.ts` — Uses `requireAnyPermission(['admin', 'settings'])` + `getRLSContext()` + `runWithRLS()`
- `providers/billing/route.ts` — Uses `requireProviderAccess()` + Zod validation (`providerBillingPatchSchema`)
- `service-bookings/route.ts` — Uses session check + Zod validation (`serviceBookingSchema`) + conflict detection + role-based business logic
- `admin/media/route.ts` — Uses `getSessionAndRole()` + `hasPermission()` + rate limiting on POST

**Problems observed:**

- Duplicate auth helper definitions: `getSessionAndRole()` is defined inline in three different REST route files (`surveys/route.ts`, `resources/route.ts`, `disputes/route.ts`) instead of using the canonical import from `@api/server`
- `surveys/route.ts` duplicates the `getSessionAndRole` logic even though it imports `apiUnauthorized` from `@api/server` (which also exports `getSessionAndRole`)
- `resources/route.ts` imports `withErrorHandler` and has canonical auth helpers but still defines its own `getSessionAndRole`
- `disputes/route.ts` defines `getSessionAndRole` inline AND has its own `try/catch` error handling instead of using `withErrorHandler`
- `conservation/route.ts` — No authentication check at all on the GET handler (public content, so this is intentional)
- `premium/listings/route.ts` — Auth check exists but no Zod validation on POST body (manual destructuring of `body.propertyId`, etc.)
- `community-services/listings/route.ts` — GET has feature gate but no auth check; POST checks session but the GET is publicly accessible (intentional for browsing)

### Suspension Checks

- **tRPC:** Enforced at `privilegedProcedure` and `adminProcedure` levels
- **REST routes:** `throwIfSuspended()` is available but not consistently used — only a few routes check suspension before proceeding

## 6. tRPC Entry Point

**File:** `src/app/api/trpc/[trpc]/route.ts` (13 lines)

```ts
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
```

Clean, minimal, follows tRPC conventions. Both GET (queries) and POST (mutations) are handled. Context creation reads session from headers and resolves tenant/role via DB queries.

## 7. Validation (Zod Schemas)

### tRPC Routes

All procedures use `.input()` with Zod schemas. Schemas are defined in router files or imported from shared modules. DTO schemas in `src/server/dto/` are derived from Drizzle tables via `drizzle-zod`'s `createSelectSchema()`.

### REST Routes: Mixed Quality

| Pattern             | Examples                                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Zod validation      | `disputes/route.ts` POST (`disputeCreateSchema.safeParse`), `providers/register/route.ts` (`providerRegistrationSchema.safeParse`), `providers/billing/route.ts` PATCH (`providerBillingPatchSchema.safeParse`), `service-bookings/route.ts` POST (`serviceBookingSchema.safeParse`) |
| Manual validation   | `surveys/route.ts` POST — reads `body.title` directly, no Zod schema                                                                                                                                                                                                                 |
| Manual field checks | `resources/route.ts` POST — `if (!body.title \|\| !body.category)`                                                                                                                                                                                                                   |
| No validation       | `premium/listings/route.ts` POST — destructures `body.propertyId` without any schema                                                                                                                                                                                                 |

### Auth Validation

Better Auth endpoints use Zod schemas via the validator plugin:

- `signUpEmailSchema` — email + password (min 8) + name (1–100)
- `signInEmailSchema` — email + password + optional rememberMe
- `forgetPasswordSchema` — email + optional redirectTo
- `resetPasswordSchema` — token + newPassword (min 8)
- `sendOtpSchema` — email + type (enum)

## 8. Rate Limiting Patterns

### Implementation

Redis-based (Upstash or SUGA) with three access patterns:

| Function                          | Scope              |
| --------------------------------- | ------------------ |
| `rateLimitByKey(key, config)`     | Arbitrary key      |
| `rateLimitByIP(request, config)`  | Client IP          |
| `rateLimitByUser(userId, config)` | Authenticated user |

### Default Limits

| Scope         | Limit       |
| ------------- | ----------- |
| auth          | 10 req/1min |
| signup        | 3 req/1hr   |
| invitations   | 5 req/1min  |
| messages      | 30 req/1min |
| notifications | 60 req/1min |
| upload        | 10 req/1min |
| merits        | 20 req/1min |

### tRPC Usage

`rateLimitMiddleware(config)` wraps `protectedProcedure` and throws `TOO_MANY_REQUESTS`. Used in specific procedures.

### REST Route Usage (Inconsistent)

| Route                | Rate Limiting                     |
| -------------------- | --------------------------------- |
| `auth/[...all]/POST` | 10 req/min per IP                 |
| `auth/signup/POST`   | 10 req/hr per IP (signup:ip:{ip}) |
| `admin/media/POST`   | 10 req/min per user               |

Most REST routes do **not** have rate limiting applied, including high-risk endpoints like:

- `/api/service-bookings/POST` (creates bookings)
- `/api/disputes/POST` (creates disputes)
- `/api/groups/POST` (creates groups)
- `/api/surveys/POST` (creates surveys)

## 9. CORS Configuration

**STATUS (2026-06-25): RESOLVED — See SENIOR_REPORT.md Sprint 1 T1**

`addCorsHeaders()` was added to `src/middleware.ts` with an OPTIONS handler during the Sprint 1 audit. Cross-origin headers are now served by the middleware.

~~**CRITICAL FINDING:** No CORS configuration found anywhere in the codebase. A search for `cors`, `CORS`, `Access-Control-Allow`, and `cross-origin` across all source files returned zero results. This means:~~

~~- No `Access-Control-Allow-Origin` headers are set~~
~~- No `Access-Control-Allow-Methods` headers~~
~~- No `Access-Control-Allow-Headers` headers~~
~~- No preflight (`OPTIONS`) handlers in any API route~~

~~The system likely relies on Vercel's default CORS behavior or Next.js middleware defaults, but any external client (Android app, third-party integration, mobile browser on a different origin) will encounter CORS errors when making API calls. This is a significant gap given the documented mobile/Android consumption goals in `API.md`.~~

## 10. API Governance Documentation

### `docs/STEERING/API.md` (1025 lines) — Comprehensive but with Gaps

The governance document is thorough and well-structured, covering:

- 36 sections on API classification, structure, versioning, error codes, validation, authorization, DTO governance, OpenAPI, rate limiting, caching, webhooks, idempotency, performance, testing, security, and module ownership
- 33-check governance enforcement checklist
- Phase 120 completion report documenting the hardening work

### Key Governance Drift vs Reality

| Governance Rule                                               | Status                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| All APIs use canonical structure (`/api/v1/{plane}/{domain}`) | **PARTIAL** — v1 structure exists but most routes are flat legacy                                         |
| "Internal APIs = tRPC, External APIs = OpenAPI from tRPC"     | **DRIFT** — Massive parallel REST API exists alongside tRPC                                               |
| Never expose raw ORM models                                   | **COMPLIANT** — 13 DTO files, `toEnvelope()` wrapping, no raw Drizzle entities exposed in tRPC procedures |
| All request validation uses Zod                               | **PARTIAL** — tRPC uses Zod; REST routes are mixed (some manual, some Zod)                                |
| Rate limiting required on external APIs                       | **INCOMPLETE** — tRPC has middleware but few REST routes implement it                                     |
| Never trust client-provided `tenantId`                        | **COMPLIANT** — All routes use `withTenant()`                                                             |
| Use canonical permission helpers (not inline role checks)     | **MIXED** — Some routes use `requireAnyPermission()`; others inline `hasPermission()`                     |
| All errors use canonical error codes                          | **COMPLIANT** — `api-response.ts` defines canonical codes; tRPC `errorFormatter` rewrites codes           |
| Response envelope `{success, data, meta}`                     | **COMPLIANT** for tRPC via `toEnvelope()`; REST routes use `apiSuccess()`                                 |
| OpenAPI must pass CI validation (`npx redocly lint`)          | **NOT VERIFIED** — No evidence of CI pipeline enforcing this                                              |
| Caching standards                                             | **PARTIAL** — Some routes set Cache-Control headers, but most do not                                      |
| CORS configuration for external consumers                     | **MISSING** — No CORS configuration exists                                                                |

## Summary of Key Issues

### High Severity

1. **~~No CORS configuration~~** — ✅ Resolved: `addCorsHeaders()` added to `src/middleware.ts` (SENIOR_REPORT.md T1).
2. **Massive tRPC/REST duplication** — 16+ domains have both tRPC routers AND parallel REST handlers implementing the same operations. This doubles maintenance surface and creates potential behavioral drift.
3. **Inconsistent auth in REST routes** — Three different REST files define their own `getSessionAndRole()` inline instead of importing the canonical version from `@api/server`. Most REST routes do not check suspension status.

### Medium Severity

4. **Inconsistent Zod validation** — Some REST routes use Zod schemas; others use manual validation or none at all (e.g., `premium/listings/route.ts` POST).
5. **Missing rate limiting** — Most REST mutation endpoints lack rate limiting, creating DoS risk vectors (service-bookings, disputes, groups, surveys POST endpoints are unprotected).
6. **Incomplete v1 migration** — The canonical `/api/v1/{plane}/{domain}` structure exists but is incomplete; most traffic still goes through flat legacy routes.

### Low Severity / Observations

7. **Two DTO locations** — DTO schemas exist in both `src/server/dto/` (domain DTOs derived from Drizzle) and `src/shared/api/dto/` (shared API DTOs), with some overlap.
8. **Massive barrel file** — `src/shared/api/server/index.ts` at 234 lines re-exports everything. This is convenient but creates tight coupling and slow type-checking.
9. **Only ~10% of tRPC procedures are OpenAPI-exported** — 24 of 235+ procedures have `.meta({ openapi })`. This is by design (internal-only procedures vs. external contracts) but limits the reach of the canonical contract flow.
10. **No CI enforcement of `npx redocly lint`** — Documented as required but not visibly enforced in the codebase.

---

## Reconciliation: Post-Audit Fixes (SENIOR_REPORT.md)

This analysis was snapshotted before the Senior Engineer Audit (2026-06-25). The following items were subsequently resolved:

| SENIOR_REPORT Ref                | Issue                            | Fix                                                         |
| -------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| T1 (Sprint 1)                    | No CORS configuration            | `addCorsHeaders()` in `src/middleware.ts` + OPTIONS handler |
| S5-1 to S5-6, S6-2 (Sprints 5–6) | TypeScript errors in REST routes | Path aliases, `Promise<params>`, import/export fixes        |

Issues #2–#10 above remain open as of the audit close.
