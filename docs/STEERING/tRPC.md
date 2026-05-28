# tRPC_GUIDE.md

# Netcomplex tRPC Best Practices Guide

Version: 2.0
Status: Active
Applies To: All tRPC Procedures
Related Documents:

- API_GOVERNANCE.md
- docs/architecture/API_ARCHITECTURE.md
- ADRs related to API design and OpenAPI generation

---

# 1. Purpose

This guide defines the implementation standards for:

- tRPC procedures
- OpenAPI generation
- Android/mobile compatibility
- schema consistency
- REST semantics
- API scalability

Netcomplex uses:

- tRPC as the canonical contract layer
- Zod for schema definition
- trpc-openapi for external API generation

This guide exists to ensure that:

- public procedures generate stable OpenAPI contracts
- Android/iOS clients remain compatible
- APIs remain maintainable at scale
- internal and external procedures are consistently implemented

---

# 2. Relationship to API Governance

This guide implements the standards defined in:

- API_GOVERNANCE.md
- API ADRs
- platform architectural policies

API_GOVERNANCE.md defines:

- lifecycle
- security
- versioning
- observability
- tenant isolation
- API philosophy

This document defines:

- tRPC implementation patterns
- OpenAPI-safe Zod usage
- procedure structure
- schema organization
- spec generation rules

---

# 3. Canonical Architecture

```txt id="b7i8rm"
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

tRPC procedures exported through OpenAPI are considered governed external APIs.

---

# 4. Procedure Categories

---

## 4.1 Internal Procedures

Used for:

- dashboards
- widgets
- internal services
- admin UX

Characteristics:

- may evolve rapidly
- may remain unversioned
- may omit OpenAPI metadata

---

## 4.2 Public Procedures

Used for:

- Android/mobile
- external integrations
- partner systems
- future SDKs

Characteristics:

- OpenAPI exported
- versioned
- governed
- stable
- backward-compatible

---

## 4.3 Platform Procedures

Used by:

- platform administrators
- SaaS operations
- moderation systems

Require elevated authorization controls.

---

## 4.4 System Procedures

Used for:

- infrastructure
- health checks
- internal orchestration

---

# 5. Golden Rules

These apply to all public procedures.

| Rule                               | Why                               |
| ---------------------------------- | --------------------------------- |
| Always define `.input()`           | Validation and OpenAPI generation |
| Always define `.output()`          | Stable response contracts         |
| Always define `.meta({ openapi })` | Required for OpenAPI visibility   |
| Never expose raw DB models         | Prevent contract drift            |
| Use OpenAPI-safe Zod types         | Maintain schema compatibility     |
| Match HTTP method to intent        | Preserve REST semantics           |

---

# 6. Required Procedure Structure

Every public procedure MUST include:

```ts id="5fxh2s"
publicProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/users/{id}',
      tags: ['Users'],
      summary: 'Get user',
      protect: true,
    },
  })
  .input(GetUserInputSchema)
  .output(UserSchema);
```

---

# 7. Input Schema Rules

---

## 7.1 Always Use Named Schemas

Avoid inline schemas for reusable APIs.

Preferred:

```ts id="7m8wzn"
export const GetUserInputSchema = z.object({
  id: z.string().uuid(),
});
```

---

## 7.2 Path Parameters Must Match

Example:

```txt id="lf5s4r"
/users/{id}
```

Must match:

```ts id="57o0u0"
z.object({
  id: z.string(),
});
```

---

## 7.3 GET Inputs Must Remain Flat

Avoid deeply nested GET query structures.

Preferred:

```ts id="98v7ko"
z.object({
  page: z.number().default(1),
  search: z.string().optional(),
});
```

---

# 8. Output Schema Rules

---

## 8.1 `.output()` Is Mandatory

Never omit `.output()` on public procedures.

---

## 8.2 Never Return Raw ORM Entities

Forbidden:

```ts id="5clb8x"
return db.user.findMany();
```

Preferred:

```ts id="v91xq4"
return users.map(mapUserDto);
```

---

## 8.3 Shared Schema Ownership

Shared schemas belong in:

```txt id="s1x6m5"
src/server/schemas/
```

Example:

```txt id="ah9yy1"
src/server/schemas/user.ts
```

---

# 9. OpenAPI Metadata Standards

---

## 9.1 Required Fields

Every public procedure MUST define:

| Field   | Required |
| ------- | -------- |
| method  | Yes      |
| path    | Yes      |
| tags    | Yes      |
| summary | Yes      |

---

## 9.2 Recommended Fields

| Field       | Purpose              |
| ----------- | -------------------- |
| description | Better documentation |
| protect     | Auth metadata        |
| deprecated  | Lifecycle visibility |

---

## 9.3 Example

```ts id="m0g9g7"
.meta({
  openapi: {
    method: 'GET',
    path: '/users/{id}',
    tags: ['Users'],
    summary: 'Get a user',
    protect: true,
  },
})
```

---

# 10. REST Semantics

| Intent         | tRPC Type | HTTP Method |
| -------------- | --------- | ----------- |
| Fetch          | query     | GET         |
| Create         | mutation  | POST        |
| Replace        | mutation  | PUT         |
| Partial Update | mutation  | PATCH       |
| Delete         | mutation  | DELETE      |

---

## 10.1 Never Use Mutation for Reads

Forbidden:

```ts id="4bhl9v"
.meta({
  openapi: {
    method: 'POST',
    path: '/users/search',
  },
})
.mutation(...)
```

---

# 11. Route Naming Standards

---

## 11.1 Resource-Oriented Design

Preferred:

```txt id="7p29qz"
/users
/users/{id}
/users/{id}/posts
```

---

## 11.2 Naming Conventions

| Element         | Convention          |
| --------------- | ------------------- |
| API paths       | kebab-case          |
| Procedure names | camelCase           |
| Schema names    | PascalCase + Schema |
| OpenAPI tags    | PascalCase          |

---

# 12. OpenAPI-Safe Zod Patterns

---

## 12.1 Approved Patterns

Preferred:

- `z.object()`
- `z.enum()`
- `z.array()`
- `z.discriminatedUnion()`
- `z.literal()`

---

## 12.2 Restricted Patterns

Avoid on public procedures:

- `z.any()`
- `z.unknown()`
- `z.lazy()`
- unsafe `.transform()`
- plain `z.union()`

---

## 12.3 Prefer Discriminated Unions

Preferred:

```ts id="u7q7q7"
z.discriminatedUnion('type', [...])
```

Avoid:

```ts id="w8w8w8"
z.union([...])
```

---

# 13. Error Handling

---

## 13.1 Use TRPCError

Preferred:

```ts id="8ldqtr"
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'User not found',
});
```

---

## 13.2 Never Throw Raw Errors

Forbidden:

```ts id="k0ov5v"
throw new Error('oops');
```

---

## 13.3 Canonical Error Mapping

| TRPCError             | HTTP |
| --------------------- | ---- |
| BAD_REQUEST           | 400  |
| UNAUTHORIZED          | 401  |
| FORBIDDEN             | 403  |
| NOT_FOUND             | 404  |
| CONFLICT              | 409  |
| TOO_MANY_REQUESTS     | 429  |
| INTERNAL_SERVER_ERROR | 500  |

---

# 14. Authentication and Authorization

---

## 14.1 Use Canonical Procedures

Preferred:

```ts id="hr9k6n"
publicProcedure;
protectedProcedure;
platformProcedure;
```

---

## 14.2 Keep Metadata In Sync

If using protectedProcedure:

```ts id="z4r2qt"
protect: true;
```

must exist in `.meta()`.

---

## 14.3 Tenant Isolation Remains Mandatory

Every tenant-scoped procedure MUST:

- resolve tenant from context
- scope database queries
- reject cross-tenant access

---

# 15. Router Organization

Recommended structure:

```txt id="c2w5v7"
src/server/
├── routers/
├── schemas/
├── dto/
├── permissions/
├── services/
└── openapi/
```

---

## 15.1 One Router Per Resource Domain

Preferred:

```txt id="5ksp6f"
users.ts
posts.ts
auth.ts
maintenance.ts
bookings.ts
```

Avoid giant routers.

---

# 16. OpenAPI Generation

---

## 16.1 Canonical Setup

```ts id="4o4r2y"
generateOpenApiDocument(appRouter, {
  title: 'Netcomplex API',
  version: '1.0.0',
  baseUrl: process.env.API_BASE_URL,
});
```

---

## 16.2 OpenAPI Route

```txt id="hz8pr0"
/api/openapi.json
```

---

# 17. CI Validation

---

## 17.1 Validation Is Mandatory

Required:

```bash id="mr0iyc"
npx redocly lint
```

A procedure that breaks OpenAPI generation is considered a governance violation.

---

# 18. Android/iOS Contract Stability

Public procedures are consumed by generated mobile clients.

Breaking changes require:

- versioning
- migration path
- deprecation notice
- mobile coordination

---

# 19. Performance Standards

Public procedures SHOULD:

- paginate collections
- minimize payload size
- avoid N+1 queries
- stream where appropriate

---

# 20. Testing Standards

Public procedures SHOULD include:

- validation tests
- authorization tests
- tenant isolation tests
- OpenAPI generation tests
- happy-path tests

---

# 21. Agent Requirements

Agents MUST:

- define `.input()`
- define `.output()`
- use `.meta({ openapi })`
- use OpenAPI-safe schemas
- preserve tenant isolation
- use DTOs
- preserve REST semantics

Agents MUST NOT:

- expose raw ORM entities
- use unsafe Zod patterns
- introduce undocumented public procedures
- bypass authorization helpers

---

# 22. Canonical Principle

Public tRPC procedures are governed API contracts.

They must be treated with the same rigor as any external API platform.
