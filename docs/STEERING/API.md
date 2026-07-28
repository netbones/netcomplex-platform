---
title: API.md
status: current
reviewed: 2026-07-28
tags: [steering, governance]
audience: all
---

# API.md

# Netcomplex API Governance Standard

Version: 2.0
Status: Active
Owner: Platform Architecture Team
Applies To: All APIs, tRPC Procedures, OpenAPI Contracts, Webhooks, Modules, Integrations
see docs/architecture/API_ARCHITECTURE.md for architectural context.
see ./tRPC.md for tRPC best practices.

---

# 1. Purpose

This document defines the governance standards for all APIs within Netcomplex.

Goals:

- Preserve strict tenant isolation
- Maintain stable external contracts
- Standardize API design and behavior
- Improve developer experience
- Support Android/mobile consumption
- Enable modular SaaS growth
- Support future integrations and automation
- Reduce architectural drift
- Ensure observability, auditability, and security

API governance is mandatory for all new API development.

---

# 2. Core Architectural Principles

---

## 2.1 APIs Are Product Surfaces

APIs are not implementation details.

All APIs must be:

- intentional
- documented
- secure
- observable
- maintainable
- versioned where applicable
- backward-compatible where required

---

## 2.2 Trust Boundaries Are Explicit

Netcomplex is multi-tenant.

Trust boundaries must never be ambiguous.

The platform separates:

- anonymous users
- authenticated users
- tenant-scoped users
- tenant administrators
- platform administrators
- infrastructure/system actors

Every API must clearly define its trust boundary.

---

## 2.3 Tenant Isolation Is Non-Negotiable

Tenant isolation is the highest-priority governance rule.

Every tenant-scoped endpoint MUST:

- resolve tenant from middleware/context
- use canonical tenant enforcement helpers
- reject cross-tenant access
- never trust client-provided tenantId
- scope database access by tenant

---

## 2.4 APIs Must Be Governable

All APIs must support:

- validation
- authorization
- observability
- testing
- documentation
- lifecycle management
- deprecation strategy

---

# 3. API Architecture

---

## 3.1 Canonical Stack

Netcomplex uses:

| Layer                  | Technology         |
| ---------------------- | ------------------ |
| Internal API Transport | tRPC               |
| External API Contracts | OpenAPI            |
| Schema System          | Zod                |
| Validation             | Zod                |
| Documentation          | @trpc/openapi      |
| Auth                   | Better Auth        |
| ORM                    | Drizzle            |
| Logging                | Pino               |
| Framework              | Next.js App Router |

---

## 3.2 Canonical Contract Flow

```txt id="zw2o0z"
Zod Schemas
    ↓
tRPC Procedures
    ↓
OpenAPI Generation
    ↓
Android/iOS SDKs
    ↓
External Integrations
```

tRPC is therefore considered a canonical contract layer.

---

## 3.3 Internal vs External APIs

### Internal APIs

Used by:

- dashboards
- widgets
- internal services
- admin panels

Characteristics:

- may evolve rapidly
- may remain unversioned
- optimized for developer velocity

---

### External APIs

Used by:

- Android clients
- mobile apps
- integrations
- partner systems
- future SDKs
- automation

Characteristics:

- versioned
- documented
- stable
- governed
- backward-compatible

---

# 4. API Classification

Every API endpoint MUST belong to one classification.

| Classification | Description                     |
| -------------- | ------------------------------- |
| PUBLIC         | No authentication required      |
| TENANT         | Authenticated tenant member     |
| PRIVILEGED     | Tenant staff/admin/moderator    |
| PLATFORM       | Platform administrator only     |
| SYSTEM         | Infrastructure/internal systems |

---

# 5. Canonical API Structure

All new APIs MUST follow this structure.

```txt id="1u8npr"
src/app/api/
├── public/
├── tenant/
├── platform/
├── internal/
├── system/
├── webhooks/
└── v1/
```

Examples:

```txt id="c3x1h4"
/api/v1/public/events
/api/v1/tenant/bookings
/api/v1/platform/tenants
/api/v1/system/health
```

---

# 6. tRPC Governance

---

## 6.1 Canonical tRPC Policy

Netcomplex uses tRPC as the canonical API contract layer.

OpenAPI specifications are generated from governed tRPC procedures using `@trpc/openapi` (v11).

Therefore:

- Public-facing tRPC procedures are treated as external APIs
- Public procedures MUST comply with OpenAPI-safe patterns
- Android/mobile compatibility is a governance concern

- see ./tRPC.md for best practice.

---

## 6.2 Procedure Categories

| Procedure Type             | Governance                        |
| -------------------------- | --------------------------------- |
| Internal-only Procedure    | private, may remain unversioned   |
| OpenAPI-exported Procedure | external contract, fully governed |
| Platform Procedure         | governed privileged API           |
| System Procedure           | infrastructure/internal           |

---

## 6.3 Public Procedure Requirements

Any tRPC procedure exported through OpenAPI MUST:

- define `.input()`
- define `.output()`
- define `.meta({ openapi })`
- use OpenAPI-safe Zod schemas
- use canonical error handling
- pass OpenAPI validation in CI

---

## 6.4 Internal Procedures

Purely internal procedures may omit:

- `.meta({ openapi })`
- OpenAPI-safe schema constraints
- external stability guarantees

However:

- validation
- authorization
- tenant isolation

remain mandatory.

---

# 7. Tenant Isolation Rules

---

## 7.1 Core Rule

Every tenant-scoped endpoint MUST:

- resolve tenant from middleware/context
- use canonical helpers
- scope queries by tenant
- reject cross-tenant access

---

## 7.2 Forbidden Pattern

```ts id="vbxy5s"
const tenantId = body.tenantId;
```

Never trust tenant ownership from the client.

---

## 7.3 Required Pattern

```ts id="v8s9n7"
const tenant = await withTenant(request);
```

or equivalent canonical helper.

---

## 7.4 Database Scoping

Required:

```ts id="w1os8v"
where: {
  tenantId: tenant.id;
}
```

---

# 8. API Versioning

---

## 8.1 External APIs Must Be Versioned

All externally consumed APIs MUST use URL versioning.

Example:

```txt id="o8nq6v"
/api/v1/tenant/bookings
```

---

## 8.2 Internal APIs

Internal-only tRPC procedures do not require versioning.

However, any procedure exported through OpenAPI is considered an external contract and must comply with:

- versioning rules
- compatibility requirements
- governance standards
- Android/mobile stability expectations

---

## 8.3 Breaking Changes

Breaking changes require:

- new API version
- migration path
- deprecation notice
- documentation update

---

# 9. Route Naming Standards

---

## 9.1 Resource-Oriented Design

Preferred:

```txt id="d7nlje"
/api/v1/tenant/bookings
/api/v1/tenant/bookings/{id}
```

Avoid:

```txt id="uv5fl2"
/getBookings
/createBooking
```

---

## 9.2 Actions

Actions use subpaths.

Example:

```txt id="m0q3x8"
/api/v1/users/{id}/suspend
/api/v1/bookings/{id}/cancel
```

---

## 9.3 Naming Conventions

| Element         | Convention                 |
| --------------- | -------------------------- |
| API Paths       | kebab-case                 |
| tRPC Procedures | camelCase                  |
| Zod Schemas     | PascalCase + Schema suffix |
| OpenAPI Tags    | PascalCase                 |

---

# 10. HTTP Method Standards

| Method | Usage            |
| ------ | ---------------- |
| GET    | Read             |
| POST   | Create           |
| PUT    | Full replacement |
| PATCH  | Partial update   |
| DELETE | Remove           |

---

# 11. Standard Response Envelope

All APIs MUST return standardized responses.

---

## 11.1 Success

```ts id="3smbh7"
{
  success: (true, data, meta);
}
```

---

## 11.2 Error

```ts id="yv5tnk"
{
  success: false,
  error: {
    code,
    message,
    details
  }
}
```

---

# 12. Canonical Error Codes

Every API error MUST use canonical error codes.

## Required Codes

```txt id="l0q9cf"
AUTH_REQUIRED
FORBIDDEN
TENANT_REQUIRED
TENANT_FORBIDDEN
VALIDATION_ERROR
NOT_FOUND
RATE_LIMITED
FEATURE_DISABLED
SUSPENDED_USER
INTERNAL_ERROR
```

---

# 13. Validation Standards

---

## 13.1 Zod Required

All request validation MUST use Zod.

Required for:

- body
- params
- query
- headers where applicable

---

## 13.2 Validation Location

Validation belongs:

- at route boundary
- before database access
- before authorization-sensitive logic

---

# 14. Authorization Standards

---

## 14.1 Never Inline Permissions

Avoid:

```ts id="tjlwmv"
if (user.role === 'ADMIN')
```

Use canonical permission helpers.

---

## 14.2 Required Enforcement Layers

Every protected endpoint MUST evaluate:

- authentication
- suspension status
- tenant membership
- role/permission
- feature access

---

# 15. DTO Governance

---

## 15.1 Never Expose Raw ORM Models

Do not expose:

- raw Drizzle entities
- raw database rows
- internal ORM structures

Always map responses through DTOs or schemas.

---

## 15.2 DTO Purpose

DTOs isolate:

- database evolution
- frontend contracts
- external integrations

---

# 16. OpenAPI Governance

---

## 16.1 OpenAPI Requirements

All external APIs MUST appear in OpenAPI.

Required metadata:

- summary
- tags
- auth requirements
- examples
- error responses
- deprecation status

---

## 16.2 OpenAPI Validation

All OpenAPI-exported procedures MUST pass CI validation.

A procedure that breaks OpenAPI generation is considered a governance violation.

---

## 16.3 CI Validation

Required:

```bash id="l16a2z"
npx redocly lint
```

---

# 17. Zod Compatibility Governance

---

## 17.1 Allowed Patterns

Preferred:

- `z.object()`
- `z.enum()`
- `z.array()`
- `z.discriminatedUnion()`

---

## 17.2 Restricted Patterns

Avoid on public procedures:

- `z.any()`
- `z.unknown()`
- `z.lazy()`
- unsafe `.transform()`
- non-discriminated unions

---

# 18. Feature Gate Governance

Feature gating is part of API governance.

---

## Rules

Feature-disabled APIs MUST:

- fail consistently
- return predictable errors
- avoid partial execution

Preferred error:

```txt id="c9evl2"
FEATURE_DISABLED
```

---

# 19. Module Ownership

Every module owns:

```txt id="lkgxop"
module/
├── api/
├── schemas/
├── dto/
├── permissions/
├── openapi/
├── services/
└── tests/
```

---

# 20. API Lifecycle States

Every external API should declare lifecycle state.

| State        | Meaning              |
| ------------ | -------------------- |
| experimental | unstable             |
| beta         | limited guarantees   |
| stable       | production supported |
| deprecated   | scheduled removal    |
| sunset       | removed              |

---

# 21. Observability Standards

---

## 21.1 Request Logging

Every API request SHOULD log:

- requestId
- actorId
- tenantId
- route
- latency
- statusCode
- module
- feature context

---

## 21.2 Sensitive Action Logging

Mandatory for:

- suspensions
- onboarding
- moderation
- permissions changes
- platform administration
- tenant settings

---

# 22. Rate Limiting

---

## 22.1 Required Protection

External APIs MUST support rate limiting.

Especially:

- auth
- onboarding
- invitations
- uploads
- messaging
- notifications

---

## 22.2 Standard Error

```txt id="6v4e5l"
RATE_LIMITED
```

---

# 23. Caching Standards

---

## 23.1 Approved Mechanisms

Use:

- unstable_cache
- revalidatePath
- cache tags

where appropriate.

---

## 23.2 Cache Safety

Never cache:

- tenant-sensitive data publicly
- authenticated responses globally
- permission-sensitive data

---

# 24. Webhook Governance

---

## 24.1 Required Protections

All webhooks MUST support:

- signed payloads
- replay protection
- idempotency
- delivery logging
- retry handling

---

## 24.2 Namespace

```txt id="u2yk1m"
/api/webhooks/
```

---

# 25. Idempotency

Mutation endpoints SHOULD support idempotency where appropriate.

Required for:

- onboarding
- invitations
- payments
- external integrations

---

# 26. Background Jobs

Long-running work MUST NOT block request lifecycle.

Use background processing for:

- email fanout
- notification fanout
- analytics
- imports
- webhook retries

---

# 27. API Testing Standards

Every governed API SHOULD include:

- authentication tests
- tenant isolation tests
- validation tests
- authorization tests
- happy-path tests
- error response tests

---

# 28. Security Standards

---

## 28.1 Never Trust Client Input

All client input is untrusted.

Always validate and authorize.

---

## 28.2 Principle of Least Privilege

Endpoints should expose only minimum required access.

---

## 28.3 Sensitive Data

Never expose:

- internal secrets
- auth tokens
- password metadata
- platform secrets
- internal-only IDs unnecessarily

---

# 29. Performance Standards

APIs SHOULD:

- avoid N+1 queries
- paginate collections
- stream where appropriate
- minimize payload size
- avoid unnecessary joins

---

# 30. Pagination Standard

Preferred:

```ts id="oowrjx"
{
  data: [],
  meta: {
    page,
    pageSize,
    total,
    hasMore
  }
}
```

---

# 31. ADR Requirements

Architecturally significant API decisions MUST generate ADRs.

Examples:

- authentication changes
- API gateway introduction
- webhook architecture
- event-driven transitions
- versioning strategy changes

---

# 32. Agent Requirements

All coding agents MUST:

- follow this governance document
- preserve tenant isolation
- use canonical helpers
- use Zod validation
- use DTO mapping
- preserve response contracts
- respect module ownership boundaries

Agents MUST NOT:

- bypass authorization helpers
- trust tenantId from clients
- expose raw ORM entities
- create undocumented external APIs
- introduce unversioned external contracts

---

# 33. Governance Enforcement Checklist

Before merging API work:

- [ ] ⏳ Tenant isolation verified
- [ ] ⏳ Validation added
- [ ] ⏳ Authorization enforced
- [ ] ⏳ Response envelope compliant
- [ ] ⏳ Error codes standardized
- [ ] ⏳ DTO mapping implemented
- [ ] ⏳ OpenAPI updated
- [ ] ⏳ CI validation passes
- [ ] ⏳ Tests added
- [ ] ⏳ Logs added
- [ ] ⏳ Feature gating verified

---

# 34. Phase 120 Completion — API Governance Hardening

**Status:** COMPLETE (2026-06-30)

Phase 120 systematically closed the gap between documented governance standards and tRPC router implementations. Key outcomes:

## 34.1 Response Envelope (GOV-01)

All tRPC procedures now use `toEnvelope()` to wrap responses in the canonical `{success, data, meta}` shape. The `ApiEnvelope<T>` type and `toEnvelope<T>()` helper live at `src/shared/api/envelope.ts` and are imported via `@api/server`.

## 34.2 Canonical Error Codes (GOV-02)

tRPC native codes are rewritten to canonical codes via the `errorFormatter` in `src/shared/api/trpc/server.ts`. Mapping: `UNAUTHORIZED → AUTH_REQUIRED`, `BAD_REQUEST → VALIDATION_ERROR`, `FORBIDDEN → ACCESS_DENIED`, `NOT_FOUND → NOT_FOUND`, `TOO_MANY_REQUESTS → RATE_LIMITED`.

## 34.3 DTO Layer (GOV-03)

13 DTO files in `src/server/dto/` cover all domain entities. DTO schemas are derived from Drizzle row types via `drizzle-zod` `createSelectSchema()` — guaranteeing zero column drift between database schema and API contracts.

## 34.4 Procedure Tiers (GOV-06)

Six procedure tiers are implemented in `src/shared/api/trpc/server.ts`:

| Tier                  | Middleware                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| `publicProcedure`     | None                                                                     |
| `protectedProcedure`  | Session check (step 1)                                                   |
| `tenantProcedure`     | Session + tenant membership (steps 1-2)                                  |
| `privilegedProcedure` | Session + tenant + role (ADMIN/BOARD/COMMITTEE) + suspension (steps 1-4) |
| `adminProcedure`      | Session + tenant + role (ADMIN/BOARD only) + suspension (steps 1-4)      |
| `agentProcedure`      | Session + tenant + role (AGENT/ADMIN/BOARD) (steps 1-3)                  |

Auth middleware is a 5-step chain: (1) session exists → (2) tenant membership → (3) role/permission → (4) not suspended → (5) feature flag enabled. Steps 4 and 5 are now enforced on privileged and admin procedures.

## 34.5 Classification JSDoc Tags (GOV-07)

Every procedure across all 20+ routers carries a JSDoc classification tag:

- `/** @public */` — publicProcedure endpoints (no auth required)
- `/** @tenant */` — protectedProcedure and tenantProcedure endpoints (tenant membership required)
- `/** @privileged */` — privilegedProcedure, adminProcedure, and agentProcedure endpoints (elevated role required)

~235 procedures are tagged across 35 router files, enabling doc-generation tooling and manual audit of API governance compliance.

## 34.6 OpenAPI Meta Audit (GOV-08)

24 procedures carry `.meta({ openapi })` declarations. All external procedures have verified `method`, `path`, `tags`, and `protect` fields. `protect:false` on public survey endpoints. `protect:true` on all authenticated endpoints.

## 34.7 Governance Rules Verified

Post-Phase 120, the following governance rules are marked **VERIFIED**:

- **Rule 4 (Response Envelope):** ✅ All tRPC procedures return `{success, data, meta}` via `toEnvelope()`
- **Rule 5 (Canonical Error Codes):** ✅ tRPC errorFormatter rewrites native codes to canonical codes
- **Rule 6 (DTO Mapping):** ✅ 13 DTO files derived from Drizzle tables; no raw ORM entities exposed
- **Rule 7 (Authorization Layers):** ✅ 5-step auth middleware enforced; suspension and feature gate checks active

---

# 35. Future Governance Expansion

Future governance areas may include:

- API gateway
- API keys
- tenant developer portal
- SDK generation
- service mesh
- distributed tracing
- webhook subscriptions
- event bus
- GraphQL federation

---

# 36. Canonical Principle

The Netcomplex API layer exists to provide:

- tenant safety
- stability
- interoperability
- modular scalability
- long-term maintainability

Governance is mandatory, not optional.
