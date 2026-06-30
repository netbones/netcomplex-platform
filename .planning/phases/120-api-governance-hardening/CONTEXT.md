# Phase 120: API Governance Hardening — Context

**Gathered:** 2026-06-30
**Status:** Planning
**Milestone:** M5 — Anchor Tenant Launch (hardening)

<domain>

## Phase Boundary

Close 3 systemic gaps between tRPC router implementations and the Netcomplex API Governance Standard (`API.md`, `API_ARCHITECT.md`): response envelope (`{success, data, meta}`), canonical error codes, and DTO mapping. Secondary goals: formalize `tenantProcedure`/`privilegedProcedure` tiers, add suspension/feature checks, and add API classification metadata.

**IN scope:** tRPC routers, DTO layer, envelope middleware, error code mapper, procedure tiers, classification metadata (JSDoc tags).

**OUT of scope:** REST routes (already compliant), Prisma schema changes, new features, test coverage beyond existing, rate limiting, N+1 queries, ctx type narrowing, tenant-configurable defaults.

</domain>

<decisions>

## Implementation Decisions

### Already Implemented (pre-dating PLAN.md)

- **D-00:** `tenantProcedure` and `privilegedProcedure` tiers exist at `src/shared/api/trpc/server.ts:119-141`. `tenantProcedure` asserts non-null tenantId; `privilegedProcedure` restricts to ADMIN/BOARD/COMMITTEE. No suspension or feature-flag check yet.
- **D-00a:** `ApiEnvelope<T>` interface + `toEnvelope<T>()` helper exist at `src/shared/api/envelope.ts`. Used by REST routes but NOT wired into tRPC middleware.
- **D-00b:** `adminProcedure` and `agentProcedure` tiers also exist alongside the new tiers.

### Response Envelope (GOV-01)

- **D-01:** The envelope wrapper should be applied at the tRPC middleware layer (not per-procedure) to avoid churn. Inject a `formatResponse` helper into the tRPC context or use a global `map`/`formatResponse` on the router builder.
- **D-02:** Existing REST routes already return `apiSuccess()`/`apiError()` — do NOT touch them. Only tRPC procedures need the envelope.

### Canonical Error Codes (GOV-02)

- **D-03:** Map tRPC native codes → canonical error codes in a central error mapper. For example `UNAUTHORIZED → AUTH_REQUIRED`, `BAD_REQUEST → VALIDATION_ERROR`, `FORBIDDEN → ACCESS_DENIED`, `NOT_FOUND → NOT_FOUND`, `TOO_MANY_REQUESTS → RATE_LIMITED`.
- **D-04:** Implement via a tRPC `onError` plugin or middleware that intercepts `TRPCError` and rewrites the `code` field.

### DTO Mapping (GOV-03)

- **D-05:** Create `src/server/dto/` directory with one file per bounded context (identity, content, chat, marketplace, maintenance, dwallet, surveys, events, bookings, groups, merits, notifications, achievements, invitations, settings, agents, disputes, resources).
- **D-06:** DTO schemas derived from Drizzle row types via `drizzle-zod` `createSelectSchema()` for maximum type safety and zero drift.

### 5-Step Auth Middleware (GOV-06)

- **D-07:** Formalize as a single middleware function: (1) session exists, (2) tenant membership, (3) role/permission, (4) not suspended, (5) feature flag enabled.
- **D-08:** Steps 1–2 are already handled by `protectedProcedure`. Step 3 by `adminProcedure`/`privilegedProcedure`. Steps 4–5 are missing and need to be added.

### Classification Metadata (GOV-07)

- **D-09:** JSDoc tags on each procedure: `@public`, `@tenant`, `@privileged`. Parseable by a doc generator or manual audit.

</decisions>

<canonical_refs>

## Canonical References

### Project documentation

- `docs/STEERING/API.md` — API Governance Standard (Rules 4, 5, 6, 7)
- `docs/STEERING/API_ARCHITECT.md` — tRPC architecture, procedure tiers, OpenAPI integration
- `.planning/phases/120-api-governance-hardening/PLAN.md` — Full task breakdown

### Existing code patterns

- `src/shared/api/trpc/server.ts` — Existing tRPC procedure builders (`protectedProcedure`, `tenantProcedure`, `privilegedProcedure`, `adminProcedure`, `agentProcedure`)
- `src/shared/api/envelope.ts` — `ApiEnvelope<T>` type + `toEnvelope<T>()` helper
- `src/server/routers/` — 20 tRPC router files needing envelope + DTO migration
- `src/lib/db.ts` — Drizzle DB client; DTO derivation via `drizzle-zod`
- `src/app/api/*/route.ts` — REST routes already using `apiSuccess`/`apiError` (reference pattern)

### Domain docs

- `docs/STEERING/ADR.md` — Check for existing ADRs on API governance

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`ApiEnvelope` type** (`src/shared/api/envelope.ts:11`): Already defined with `{success, data, meta}` shape. Import and use in tRPC context.
- **`toEnvelope()` helper** (`src/shared/api/envelope.ts:35`): Creates a success envelope. Currently used by REST routes.
- **`tenantProcedure`** (`src/shared/api/trpc/server.ts:119`): Already ensures tenant context. Extend with suspension/feature checks.
- **`privilegedProcedure`** (`src/shared/api/trpc/server.ts:133`): Already restricts to ADMIN/BOARD/COMMITTEE. Extend with suspension checks.

### Established Patterns

- **REST routes**: `apiSuccess(data)` → `{success: true, data}`, `apiError(code, message)` → `{success: false, error: {code, message}}`. tRPC should mirror this.
- **tRPC error handling**: Currently uses native TRPCError codes. Canonical mapping layer needed.

### Integration Points

- `src/shared/api/trpc/server.ts` — Procedure tier improvements, error mapper middleware
- `src/server/dto/` — New directory, all DTO files
- `src/server/routers/*.ts` — All 20 routers get envelope wrapping, code mapping, and DTO mapping
- `docs/STEERING/API.md` + `API_ARCHITECT.md` — Update with completion status in Wave 4

</code_context>

<specifics>

## Specific Ideas

- The envelope middleware could use a tRPC `mapResponse` function (available in tRPC v11) to wrap all responses without per-procedure changes. This is the lowest-churn approach.
- DTOs should be generated with `drizzle-zod` `createSelectSchema`, which auto-derives Zod schemas from Drizzle table definitions — guarantees zero column drift.
- The canonical error mapper should be an `onError` callback passed to the tRPC router constructor, so it's a single point of control.
- `@public`/`@tenant`/`@privileged` JSDoc tags could be enforced with an ESLint rule or a Steiger check.

</specifics>

<deferred>

## Deferred Ideas

- **OpenAPI meta on external procedures** (GOV-08) — deferred to Wave 4, may be cut if scope is too large.
- **Global frontend client update** — if the envelope shape changes, the frontend tRPC client needs updating too. May be deferred if middleware preserves backward compatibility.
- **Suspension check middleware** — can be added as a separate BD issue if the auth layer restructuring in this phase becomes too complex.

</deferred>

---

_Phase: 120-api-governance-hardening_
_Context gathered: 2026-06-30_
