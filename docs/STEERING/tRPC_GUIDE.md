# tRPC Best Practices Guide

### Writing tRPC procedures that scale to OpenAPI / Android consumption

> **Why this guide exists:** Our Android client will consume our API via an OpenAPI spec generated from tRPC using `trpc-openapi`. Every procedure you write either makes that spec clean and usable, or broken and unmaintainable. This guide ensures every team member writes tRPC that works for both the web client and the Android client.

---

## Table of Contents

1. [The Golden Rules](#1-the-golden-rules)
2. [Always Define `.output()` Schemas](#2-always-define-output-schemas)
3. [Always Define `.input()` Schemas](#3-always-define-input-schemas)
4. [Use `.meta()` on Every Public Procedure](#4-use-meta-on-every-public-procedure)
5. [REST Semantics — Query vs Mutation](#5-rest-semantics--query-vs-mutation)
6. [Path and Naming Conventions](#6-path-and-naming-conventions)
7. [Avoid Zod Patterns That Break OpenAPI](#7-avoid-zod-patterns-that-break-openapi)
8. [Error Handling](#8-error-handling)
9. [Authentication and Security](#9-authentication-and-security)
10. [Router Organisation](#10-router-organisation)
11. [Generating and Validating the Spec](#11-generating-and-validating-the-spec)
12. [Checklist](#12-checklist)

---

## 1. The Golden Rules

These apply to every procedure, no exceptions:

| Rule                                     | Why                                                       |
| ---------------------------------------- | --------------------------------------------------------- |
| **Always add `.output()`**               | OpenAPI spec is useless without it                        |
| **Always add `.meta({ openapi: ... })`** | Procedure won't appear in the spec without it             |
| **Use only OpenAPI-safe Zod types**      | Complex types silently break the spec                     |
| **Match HTTP method to intent**          | `GET` for reads, `POST`/`PUT`/`PATCH`/`DELETE` for writes |
| **Never return raw DB models**           | Always map to a defined output schema                     |

---

## 2. Always Define `.output()` Schemas

This is the single most important rule for OpenAPI compatibility. tRPC does not require `.output()` — but `trpc-openapi` produces an empty or invalid response schema without it.

### ❌ Wrong — no output schema

```ts
export const userRouter = router({
  getUser: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return db.user.findUnique({ where: { id: input.id } });
    // OpenAPI response schema: {} — useless to Android client
  }),
});
```

### ✅ Correct — explicit output schema

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export const userRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .output(UserSchema)
    .query(({ input }) => {
      return db.user.findUnique({ where: { id: input.id } });
    }),
});
```

### Reuse schemas across procedures

Define schemas once in a shared `schemas/` file and import them everywhere:

```ts
// src/schemas/user.ts
export const UserSchema = z.object({ ... });
export const UserListSchema = z.array(UserSchema);
export const CreateUserInputSchema = z.object({ ... });
```

This keeps input and output types consistent across procedures and makes the generated spec coherent.

---

## 3. Always Define `.input()` Schemas

Input schemas are required by tRPC anyway, but there are rules for OpenAPI compatibility.

### Path parameters must match the OpenAPI path

```ts
// The path is /users/{id} — so input must have a field called `id`
getUser: publicProcedure
  .meta({ openapi: { method: 'GET', path: '/users/{id}' } })
  .input(z.object({ id: z.string().uuid() }))  // ← field name matches {id}
  .output(UserSchema)
  .query(({ input }) => ...)
```

### For GET requests, keep inputs flat and simple

`GET` inputs are serialised as query string parameters. Nested objects and arrays don't serialise cleanly.

```ts
// ❌ Avoid for GET — nested objects don't map to query strings well
.input(z.object({
  filter: z.object({ status: z.string() }),
}))

// ✅ Prefer flat inputs for GET
.input(z.object({
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
}))
```

---

## 4. Use `.meta()` on Every Public Procedure

Without `.meta({ openapi: ... })`, a procedure is **invisible to the OpenAPI spec** and therefore invisible to the Android client. Treat it as mandatory.

```ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const userRouter = router({
  getUser: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/users/{id}',
        tags: ['Users'], // Groups procedures in the spec UI
        summary: 'Get a user by ID',
        description: 'Returns a single user. Requires authentication.',
        protect: true, // Marks as requiring auth in the spec
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .output(UserSchema)
    .query(({ input }) => db.user.findUnique({ where: { id: input.id } })),
});
```

### Required `.meta()` fields

| Field     | Required    | Notes                                                   |
| --------- | ----------- | ------------------------------------------------------- |
| `method`  | ✅          | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`                 |
| `path`    | ✅          | e.g. `/users/{id}` — use kebab-case                     |
| `tags`    | Recommended | Groups routes in Swagger UI and generated Kotlin client |
| `summary` | Recommended | One line, shown in generated docs                       |
| `protect` | Recommended | Set `true` on authenticated routes                      |

---

## 5. REST Semantics — Query vs Mutation

tRPC's `query` maps to `GET`. tRPC's `mutation` maps to `POST`, `PUT`, `PATCH`, or `DELETE`. Follow this strictly.

| Intent            | tRPC type  | HTTP method |
| ----------------- | ---------- | ----------- |
| Fetch a resource  | `query`    | `GET`       |
| Create a resource | `mutation` | `POST`      |
| Full replace      | `mutation` | `PUT`       |
| Partial update    | `mutation` | `PATCH`     |
| Delete a resource | `mutation` | `DELETE`    |

### ❌ Wrong — using mutation for a read

```ts
// Don't do this — breaks REST semantics and produces a bad spec
getUsers: publicProcedure
  .meta({ openapi: { method: 'POST', path: '/users/search' } })
  .mutation(({ input }) => ...)
```

### ✅ Correct

```ts
listUsers: publicProcedure
  .meta({ openapi: { method: 'GET', path: '/users' } })
  .input(z.object({ search: z.string().optional() }))
  .output(UserListSchema)
  .query(({ input }) => ...)
```

---

## 6. Path and Naming Conventions

Consistent naming makes the generated Kotlin client readable without manual cleanup.

### Path rules

```
/resources             → list / create
/resources/{id}        → get / update / delete
/resources/{id}/sub    → nested resource
```

### Examples

```
GET    /users              → listUsers
POST   /users              → createUser
GET    /users/{id}         → getUser
PATCH  /users/{id}         → updateUser
DELETE /users/{id}         → deleteUser
GET    /users/{id}/posts   → listUserPosts
```

### Naming conventions

- Paths: **kebab-case** (`/user-profiles/{id}`, not `/userProfiles/{id}`)
- tRPC procedure names: **camelCase** (`getUser`, `createUser`)
- Zod schema names: **PascalCase with `Schema` suffix** (`UserSchema`, `CreateUserInputSchema`)
- Tags: **PascalCase** (`Users`, `Posts`, `Auth`)

---

## 7. Avoid Zod Patterns That Break OpenAPI

Some Zod features are powerful in TypeScript but don't have clean OpenAPI equivalents. Avoid them on public procedures.

### Transformations — use with caution

`.transform()` changes the TypeScript type after validation, which can confuse the schema generator.

```ts
// ❌ Risky — transform changes the type; OpenAPI may not reflect output correctly
.input(z.object({
  ids: z.string().transform(s => s.split(',')),
}))

// ✅ Prefer explicit types
.input(z.object({
  ids: z.array(z.string().uuid()),
}))
```

### Union types — use discriminated unions

Plain `z.union()` generates a messy `oneOf` in OpenAPI. Discriminated unions are much cleaner.

```ts
// ❌ Avoid plain unions on public procedures
.output(z.union([UserSchema, AdminSchema]))

// ✅ Prefer discriminated unions
.output(z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), ...UserFields }),
  z.object({ role: z.literal('admin'), ...AdminFields }),
]))
```

### Refinements — keep on inputs only

`.refine()` and `.superRefine()` are validation logic — they don't appear in the OpenAPI schema. They're fine on inputs but don't rely on them to communicate schema shape to the Android client.

```ts
// ✅ Fine — refine for validation, but the type is still clear
.input(z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}))
```

### Safe Zod features reference

| Feature                                   | OpenAPI safe? | Notes                                             |
| ----------------------------------------- | ------------- | ------------------------------------------------- |
| `z.string()`, `z.number()`, `z.boolean()` | ✅            | Core primitives                                   |
| `z.object()`                              | ✅            | Always use for inputs/outputs                     |
| `z.array()`                               | ✅            | Fine at top level                                 |
| `z.enum()`                                | ✅            | Generates clean enum in spec                      |
| `z.literal()`                             | ✅            | Maps to `const` in OpenAPI                        |
| `z.discriminatedUnion()`                  | ✅            | Cleaner than plain union                          |
| `z.optional()` / `z.nullable()`           | ✅            | Use clearly                                       |
| `z.union()`                               | ⚠️            | Use discriminated union instead                   |
| `.transform()`                            | ⚠️            | Can break output schema                           |
| `z.record()`                              | ⚠️            | Maps to `additionalProperties` — test spec output |
| `z.any()` / `z.unknown()`                 | ❌            | Never on public procedures                        |
| `z.lazy()` (recursive)                    | ❌            | Not supported                                     |

---

## 8. Error Handling

Use tRPC's built-in `TRPCError` — it maps to standard HTTP error codes in the OpenAPI spec.

```ts
import { TRPCError } from '@trpc/server';

getUser: publicProcedure
  .meta({ openapi: { method: 'GET', path: '/users/{id}', tags: ['Users'] } })
  .input(z.object({ id: z.string().uuid() }))
  .output(UserSchema)
  .query(async ({ input }) => {
    const user = await db.user.findUnique({ where: { id: input.id } });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `User ${input.id} not found`,
      });
    }

    return user;
  }),
```

### tRPC error code → HTTP status mapping

| TRPCError code          | HTTP status |
| ----------------------- | ----------- |
| `BAD_REQUEST`           | 400         |
| `UNAUTHORIZED`          | 401         |
| `FORBIDDEN`             | 403         |
| `NOT_FOUND`             | 404         |
| `CONFLICT`              | 409         |
| `UNPROCESSABLE_CONTENT` | 422         |
| `TOO_MANY_REQUESTS`     | 429         |
| `INTERNAL_SERVER_ERROR` | 500         |

Never throw raw JavaScript errors — they become opaque 500s in the spec and on the Android client.

---

## 9. Authentication and Security

### Mark protected routes in `.meta()`

```ts
.meta({
  openapi: {
    method: 'GET',
    path: '/users/{id}',
    protect: true,   // ← Adds Bearer auth to this route in the spec
    tags: ['Users'],
  },
})
```

### Use separate procedures for public vs protected routes

```ts
// src/trpc.ts
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});
```

Use `protectedProcedure` for any route that requires a session, and always pair it with `protect: true` in `.meta()`. These must stay in sync — a mismatch means the spec lies to the Android team.

---

## 10. Router Organisation

Structure routers to produce a logical, navigable OpenAPI spec.

```
src/
  server/
    routers/
      user.ts          # /users/*
      post.ts          # /posts/*
      auth.ts          # /auth/*
    schemas/
      user.ts          # UserSchema, CreateUserInputSchema, etc.
      post.ts
    trpc.ts            # publicProcedure, protectedProcedure
    root.ts            # appRouter — merges all sub-routers
```

### Root router

```ts
// src/server/root.ts
import { router } from './trpc';
import { userRouter } from './routers/user';
import { postRouter } from './routers/post';
import { authRouter } from './routers/auth';

export const appRouter = router({
  users: userRouter,
  posts: postRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

Keep each router focused on a single resource domain. Avoid one giant router file.

---

## 11. Generating and Validating the Spec

### Setup `trpc-openapi`

```ts
// src/server/openapi.ts
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from './root';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Our API',
  version: '1.0.0',
  baseUrl: process.env.API_BASE_URL ?? 'https://api.ourapp.com',
  docsUrl: 'https://our-docs-url.com',
  tags: ['Users', 'Posts', 'Auth'],
});
```

### Expose the spec as a route

```ts
// src/app/api/openapi.json/route.ts  (Next.js App Router)
import { openApiDocument } from '@/server/openapi';

export function GET() {
  return Response.json(openApiDocument);
}
```

### Validate the spec in CI

Add this check to your CI pipeline so a bad procedure never silently breaks the Android client:

```bash
# Install validator
npm install -g @redocly/cli

# Validate
npx redocly lint http://localhost:3000/api/openapi.json
```

### Generate the Kotlin client (run when spec changes)

```bash
# Install openapi-generator
brew install openapi-generator

# Generate Kotlin + Retrofit client
openapi-generator generate \
  -i http://localhost:3000/api/openapi.json \
  -g kotlin \
  -o ./android-client \
  --additional-properties=library=jvm-retrofit2,serializationLibrary=gson
```

Commit the generated client to the Android repo and open a PR whenever the spec changes.

---

## 12. Checklist

Use this before merging any PR that adds or modifies a tRPC procedure.

### Per-procedure checklist

- [ ] `.input()` defined with a named `z.object()`
- [ ] `.output()` defined with a named `z.object()` (or imported schema)
- [ ] `.meta({ openapi: { method, path, tags, summary } })` present
- [ ] HTTP method matches intent (`GET` for queries, `POST`/`PUT`/`PATCH`/`DELETE` for mutations)
- [ ] Path uses kebab-case and `{paramName}` for path params
- [ ] Path param names match `.input()` field names exactly
- [ ] `protect: true` set if using `protectedProcedure`
- [ ] No `z.any()`, `z.unknown()`, or `z.lazy()` in public schemas
- [ ] Errors thrown via `TRPCError` with appropriate code
- [ ] Schema reused from `src/server/schemas/` rather than defined inline

### Team / project checklist

- [ ] OpenAPI spec generates without errors (`npx redocly lint`)
- [ ] New or changed routes reviewed by the Android team if they consume them
- [ ] Kotlin client regenerated and PR opened when spec changes
- [ ] Shared schemas kept in `src/server/schemas/` — not duplicated

---

_Last updated: May 2026. Owned by the platform team. PRs welcome._
