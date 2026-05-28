---
phase: 35-api-alignment
plan: B02
type: execute
wave: 2
depends_on: ['35-A01', '35-B01']
files_modified:
  - src/server/routers/identity.ts
  - src/server/routers/index.ts
  - src/shared/api/trpc/routers.ts
  - src/entities/identity/api/router.ts
  - src/app/api/users/route.ts
  - src/app/api/households/route.ts
  - src/app/api/seats/route.ts
autonomous: true
requirements:
  - API-TRPC-03

must_haves:
  truths:
    - 'Identity domain has a canonical tRPC router in src/server/routers/'
    - 'Identity REST handlers delegate to tRPC procedures where possible'
    - 'src/server/routers/ directory established as canonical tRPC location'
    - 'New tRPC routers can be added by creating files in src/server/routers/'
  artifacts:
    - path: 'src/server/routers/identity.ts'
      provides: 'Canonical identity tRPC router'
    - path: 'src/server/routers/index.ts'
      provides: 'Router aggregation for appRouter'
  key_links:
    - from: 'src/server/routers/index.ts'
      to: 'src/shared/api/trpc/routers.ts'
      via: 'appRouter imports from server/routers'
---

<objective>
Migrate the identity domain's REST routes to the canonical tRPC router structure and establish `src/server/routers/` as the standard tRPC location.

Purpose: The governance model requires tRPC as the canonical contract layer. Currently only `src/entities/identity/api/router.ts` holds the tRPC router. This plan relocates it to `src/server/routers/` (per tRPC.md §15), migrates overlapping REST routes (users listing, households, seats) to tRPC procedures, and sets up the server router directory for future domain migrations.

Output: Canonical tRPC router structure at `src/server/routers/`, expanded identity router, REST-tRPC parity for identity domain.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/tRPC.md
@docs/STEERING/API.md
@src/shared/api/trpc/server.ts
@src/shared/api/trpc/routers.ts
@src/entities/identity/api/router.ts
@src/app/api/users/route.ts
@src/app/api/households/route.ts
@src/app/api/seats/route.ts
@src/app/api/users/[id]/route.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Establish src/server/routers/ and relocate identity router</name>
<files>src/server/routers/identity.ts, src/server/routers/index.ts, src/shared/api/trpc/routers.ts</files>
<action>
**Step 1: Create directory structure**
```
src/server/
├── routers/
│   ├── identity.ts    (canonical identity router)
│   └── index.ts       (aggregates all routers)
├── openapi/
│   └── generator.ts   (from B01)
├── schemas/           (future — shared Zod)
├── dto/               (future — shared DTOs)
└── permissions/       (future — shared permissions)
```

**Step 2: Create `src/server/routers/identity.ts`**
Copy the contents of `src/entities/identity/api/router.ts` into this file. The copy should be identical in procedures and logic, but import from canonical locations:

- `import { router, publicProcedure, protectedProcedure, adminProcedure } from '@api/trpc/server';` — keep this, it's already the canonical import
- Keep all procedure implementations identical

**Step 3: Create `src/server/routers/index.ts`**

```typescript
import { router } from '@api/trpc/server';
import { identityRouter } from './identity';

// Domain routers are added here as they migrate to tRPC
export const appRouter = router({
  identity: identityRouter,
});

export type AppRouter = typeof appRouter;
```

**Step 4: Update `src/shared/api/trpc/routers.ts`**
Redirect to the canonical location:

```typescript
// Re-export from canonical server router location
export { appRouter } from '@server/routers';
export type { AppRouter } from '@server/routers';
```

If `@server` alias doesn't exist in tsconfig, add it:

```json
"paths": {
  "@server/*": ["./src/server/*"]
}
```

**Step 5: Update `src/entities/identity/api/router.ts`**
Add a deprecation comment at the top:

```typescript
// @deprecated Moved to src/server/routers/identity.ts
// New routers should be added to src/server/routers/
// This file will be removed once all routers are migrated
```

Keep the file in place to avoid breaking existing imports — just add the comment.

Verify: `npx tsc --noEmit` passes. `curl /api/trpc/identity.*` still works.
</action>
<verify>
<automated>test -f src/server/routers/identity.ts && test -f src/server/routers/index.ts && test -f src/shared/api/trpc/routers.ts && npx tsc --noEmit 2>&1 | head -10</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>src/server/routers/ established, identity router relocated, backward compat maintained.</done>
</task>

<task type="auto">
<name>Task 2: Migrate REST user list to tRPC procedure</name>
<files>src/server/routers/identity.ts, src/app/api/users/route.ts</files>
<action>
Add a `listUsers` procedure to `src/server/routers/identity.ts` that mirrors the GET /api/users/route.ts functionality:

```typescript
listUsers: protectedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/identity/users',
      tags: ['Identity'],
      summary: 'List tenant users with optional filters',
      protect: true,
    },
  })
  .input(
    z.object({
      search: z.string().optional(),
      role: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
    }).optional()
  )
  .output(
    z.object({
      users: z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        phone: z.string().nullable(),
        role: z.string(),
        // Add all fields from the REST response
      })),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    // Copy the query logic from src/app/api/users/route.ts
    // Use ctx.tenantId (from tRPC context) instead of withTenant()
    // Use ctx.userId/ctx.role instead of getSessionAndRole()
    ...
  }),
```

Implementation notes:

- Copy the full query logic from `src/app/api/users/route.ts` GET handler
- Adapt to use `ctx.tenantId` directly (tRPC context already resolves this)
- Use `ctx.role` directly (tRPC context already resolves this)
- Import Drizzle helpers, `hasPermission`, etc. from their current locations
- Keep the REST route working — this is additive, not replacement

After adding, verify the new procedure is callable via tRPC:

- `curl 'http://localhost:3000/api/trpc/identity.listUsers?batch=1&input={}'`
- And appears in the OpenAPI spec at `/api/openapi.json`
  </action>
  <verify>
  <automated>grep -q "listUsers" src/server/routers/identity.ts && npx tsc --noEmit 2>&1 | head -10</automated>
  <manual>Verify GET /api/openapi.json includes identity.listUsers with correct path</manual>
  <sampling_rate>run after task commits</sampling_rate>
  </verify>
  <done>listUsers tRPC procedure exists, compiles, appears in OpenAPI spec.</done>
  </task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. Existing tRPC calls unchanged (backward compat maintained)
3. New tRPC procedure `identity.listUsers` callable and in OpenAPI spec
4. `src/server/routers/` established as canonical router directory
</verification>

<success_criteria>

- src/server/routers/ directory established with identity router and index
- Old entity router kept as deprecated re-export
- listUsers tRPC procedure mirrors REST /api/users GET
- All compilation passes
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-B02-SUMMARY.md`
</output>
