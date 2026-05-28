# docs/architecture/API_ARCHITECTURE.md

# Netcomplex API Architecture

Version: 1.0
Status: Active

---

# 1. Purpose

This document explains the architectural design of the Netcomplex API platform.

It defines:

- API architecture
- tRPC strategy
- OpenAPI generation
- mobile/API consumption
- tenant isolation
- module ownership
- governance boundaries
- future scalability direction

This document complements:

- API_GOVERNANCE.md
- tRPC_GUIDE.md
- ADRs

---

# 2. Architectural Philosophy

Netcomplex treats APIs as platform infrastructure.

The API layer exists to provide:

- tenant-safe communication
- stable contracts
- modular scalability
- interoperability
- long-term maintainability

The API platform is designed to support:

- web clients
- Android/iOS clients
- external integrations
- automation
- future SDK ecosystems

---

# 3. Core Stack

| Concern                | Technology         |
| ---------------------- | ------------------ |
| Internal API Transport | tRPC               |
| External API Contracts | OpenAPI            |
| Schema System          | Zod                |
| Documentation          | @trpc/openapi      |
| Authentication         | Better Auth        |
| ORM                    | Drizzle            |
| Runtime                | Next.js App Router |
| Validation             | Zod                |
| Logging                | Pino               |

---

# 4. Canonical Contract Flow

```txt id="opj6w5"
Zod Schemas
    ↓
tRPC Procedures
    ↓
OpenAPI Generation
    ↓
SDK Generation
    ↓
Mobile Clients / Integrations
```

This creates a schema-first architecture.

---

# 5. Internal vs External APIs

---

## 5.1 Internal APIs

Used by:

- dashboards
- widgets
- internal services
- administrative UX

Characteristics:

- optimized for developer velocity
- may evolve rapidly
- may remain unversioned

Technology:

- tRPC

---

## 5.2 External APIs

Used by:

- Android clients
- mobile applications
- third-party integrations
- automation systems
- future SDKs

Characteristics:

- governed
- versioned
- stable
- backward-compatible

Technology:

- OpenAPI generated from tRPC

---

# 6. Why tRPC

Netcomplex uses tRPC because it provides:

- end-to-end type safety
- shared schema definitions
- rapid frontend/backend iteration
- centralized contract generation
- reduced duplication

However:

- raw tRPC alone is insufficient for mobile/API ecosystems

Therefore:

- `@trpc/openapi` generates external OpenAPI contracts from tRPC v11 procedures.

---

# 7. Why OpenAPI

OpenAPI enables:

- Android/iOS SDK generation
- external integrations
- API discoverability
- governance
- documentation
- CI validation
- future developer ecosystems

OpenAPI is generated from governed tRPC procedures.

---

# 8. Tenant Isolation Architecture

Tenant isolation is the highest-priority API concern.

---

## 8.1 Tenant Resolution

Tenants are resolved through:

- middleware
- auth context
- canonical helpers

Never through client-provided tenant identifiers.

---

## 8.2 Required Query Scoping

All tenant queries MUST scope by tenant.

Example:

```ts id="6v5pq6"
where: {
  tenantId: tenant.id;
}
```

---

## 8.3 Cross-Tenant Protection

Every protected API must reject:

- cross-tenant access
- unauthorized elevation
- invalid membership access

---

# 9. API Classifications

| Classification | Description                   |
| -------------- | ----------------------------- |
| PUBLIC         | Anonymous access              |
| TENANT         | Authenticated tenant users    |
| PRIVILEGED     | Tenant admins/staff           |
| PLATFORM       | Platform-level administration |
| SYSTEM         | Infrastructure/system         |

---

# 10. Canonical Route Structure

```txt id="3fxz6w"
src/app/api/
├── public/
├── tenant/
├── platform/
├── internal/
├── system/
├── webhooks/
└── v1/
```

---

# 11. Module Ownership Model

Each module owns:

```txt id="h1aj0p"
module/
├── api/
├── schemas/
├── dto/
├── permissions/
├── services/
├── openapi/
└── tests/
```

This prevents architectural drift.

---

# 12. Schema-First Design

Schemas are canonical.

Everything derives from schemas:

- validation
- TypeScript types
- OpenAPI contracts
- SDK generation

Preferred flow:

```txt id="p6bcb0"
Zod Schema
    ↓
tRPC Procedure
    ↓
OpenAPI Spec
    ↓
SDKs
```

---

# 13. DTO Architecture

Raw ORM entities are never exposed publicly.

DTOs isolate:

- database evolution
- API contracts
- mobile stability
- frontend decoupling

---

# 14. OpenAPI Strategy

Only governed procedures are exported.

Public procedures MUST include:

- `.input()`
- `.output()`
- `.meta({ openapi })`

OpenAPI generation is validated in CI.

---

# 15. Mobile/API Client Strategy

Android/iOS clients consume generated SDKs derived from OpenAPI.

Benefits:

- consistent contracts
- reduced client bugs
- typed integrations
- reduced duplication

Breaking API changes require:

- versioning
- deprecation strategy
- migration path

---

# 16. Observability Architecture

All APIs should support:

- request logging
- request IDs
- tenant tracing
- latency tracking
- error monitoring

Sensitive operations require audit logging.

---

# 17. Security Architecture

Core principles:

- never trust client input
- least privilege
- tenant-first authorization
- centralized auth enforcement
- canonical permission helpers

---

# 18. Webhook Architecture

Webhooks are treated as governed APIs.

Required protections:

- signed payloads
- replay protection
- idempotency
- retry handling
- delivery logging

---

# 19. Future Architecture Direction

Future expansion may include:

- API gateway
- API keys
- developer portal
- SDK publishing
- event bus
- distributed tracing
- GraphQL federation
- service mesh

---

# 20. Canonical Principle

The Netcomplex API layer is a governed platform system.

It exists to provide:

- tenant safety
- interoperability
- modular scalability
- stable contracts
- long-term architectural sustainability
