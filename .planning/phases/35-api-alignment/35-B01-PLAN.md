---
phase: 35-api-alignment
plan: B01
type: execute
wave: 2
depends_on: ['35-A01']
files_modified:
  - src/server/openapi/generator.ts
  - src/app/api/openapi.json/route.ts
  - .redocly.yaml
  - package.json
  - next.config.ts
  - src/shared/api/trpc/routers.ts
  - src/entities/identity/api/router.ts
  - src/server/routers/identity.ts
autonomous: true
requirements:
  - API-TRPC-01
  - API-TRPC-02

must_haves:
  truths:
    - 'OpenAPI 3.0 spec is generated from tRPC procedures, not hand-written'
    - 'GET /api/openapi.json returns a complete OpenAPI spec generated from appRouter'
    - 'npx redocly lint passes against the generated spec'
    - 'All public tRPC procedures have .meta({ openapi: { ... } }) defined'
  artifacts:
    - path: 'src/server/openapi/generator.ts'
      provides: 'OpenAPI generation from tRPC appRouter'
      min_lines: 30
    - path: 'src/app/api/openapi.json/route.ts'
      provides: 'OpenAPI spec endpoint (replaces hand-written version)'
    - path: '.redocly.yaml'
      provides: 'Redocly configuration for linting'
  key_links:
    - from: 'src/server/openapi/generator.ts'
      to: 'src/shared/api/trpc/routers.ts'
      via: 'import appRouter to generate spec'
    - from: 'src/app/api/openapi.json/route.ts'
      to: 'src/server/openapi/generator.ts'
      via: 'calls generate() on GET'
    - from: '.redocly.yaml'
      to: 'package.json'
      via: 'npm run script runs redocly lint'
---

<objective>
Wire trpc-openapi to generate the OpenAPI 3.0 specification from governed tRPC procedures.

Purpose: The governance model (API.md §3.2, tRPC.md §16) specifies that OpenAPI specs MUST be generated from tRPC, not hand-written. Currently, `/api/openapi.json` is a manually crafted JSON that only describes one endpoint and is perenially stale. This plan installs `trpc-openapi`, creates the generator, and replaces the manual route.

Output: Auto-generated OpenAPI spec from tRPC routers, Redocly CI configuration for validation.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/tRPC.md
@docs/STEERING/API.md
@docs/architecture/API_ARCHITECTURE.md
@src/shared/api/trpc/server.ts
@src/shared/api/trpc/routers.ts
@src/entities/identity/api/router.ts
@src/app/api/openapi.json/route.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Install trpc-openapi and create generator</name>
<files>src/server/openapi/generator.ts, src/app/api/openapi.json/route.ts, .redocly.yaml, package.json</files>
<action>
**Step 1: Install trpc-openapi**
```bash
pnpm add trpc-openapi
```

Verify it's compatible with @trpc/server@^11. If version conflict arises, check `trpc-openapi` latest version compatibility.

**Step 2: Create `src/server/` directory structure**
Create `src/server/openapi/generator.ts` — this is the canonical tRPC router location per tRPC.md §15.

**Step 3: Implement OpenAPI generator**

```typescript
// src/server/openapi/generator.ts
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from '@shared/api/trpc/routers';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Netcomplex API',
  description: 'Multi-tenant community management platform API',
  version: '1.0.0',
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  docsUrl: '/api/openapi.json',
  tags: ['Identity', 'Properties', 'Households', 'Profiles', 'Solo Seats', 'Agent Access'],
});

export function generateOpenApiSpec() {
  return openApiDocument;
}
```

**Step 4: Replace the manual OpenAPI route**

Rewrite `src/app/api/openapi.json/route.ts`:

- Remove the manual spec object entirely
- Import `{ openApiDocument }` from `@server/openapi/generator` (use path alias — check tsconfig for existing `@server` alias or create one)
- `export function GET() { return Response.json(openApiDocument); }`

If no `@server` alias exists in tsconfig, add it:

- `"@server/*": ["./src/server/*"]`

**Step 5: Create Redocly configuration**

Create `.redocly.yaml` at project root:

```yaml
apis:
  netcomplex@v1:
    root: http://localhost:3000/api/openapi.json
    x-openapi-version: '3.0.0'

features:
  openapi:
    lint:
      rules:
        operation-4xx-response: warn
        operation-operationId: warn
        path-parameters-defined: error

lint:
  plugins: []
  extends:
    - recommended
  rules:
    no-server-trailing-slash: error
    no-empty-servers: error
```

**Step 6: Add package.json scripts**

```json
{
  "scripts": {
    "api:generate": "tsx src/server/openapi/generator.ts",
    "api:lint": "redocly lint --format=stylish"
  }
}
```

Do NOT remove any existing scripts — only add new ones.

**Step 7: Verify**

1. Start dev server: `pnpm dev` in background
2. `curl http://localhost:3000/api/openapi.json` returns valid OpenAPI JSON
3. `npx redocly lint --format=stylish` passes (may have warnings for partial coverage — that's expected)
   </action>
   <verify>
   <automated>test -f src/server/openapi/generator.ts && echo "Generator exists" && grep -q "generateOpenApiDocument" src/server/openapi/generator.ts && echo "Uses trpc-openapi"</automated>
   <manual>Run `pnpm dev`, curl GET /api/openapi.json, verify it returns a valid OpenAPI 3.0 spec with at least the fields that have .meta({ openapi }) defined</manual>
   <sampling_rate>run after task commits</sampling_rate>
   </verify>
   <done>trpc-openapi installed, generator created, OpenAPI endpoint returns auto-generated spec, Redocly config exists.</done>
   </task>

<task type="auto">
<name>Task 2: Add .meta({ openapi }) to all public tRPC procedures</name>
<files>src/entities/identity/api/router.ts</files>
<action>
Scan the identity router at `src/entities/identity/api/router.ts` and add `.meta({ openapi: {...} })` to every procedure that should be externally consumable.

The current file has `.meta()` only on `getMySoloSeat`, `getAgentAccesses`, `getPropertyAgentAccesses`. Add it to all others that make sense as external endpoints:

| Procedure       | method | path                      | openapi                            |
| --------------- | ------ | ------------------------- | ---------------------------------- |
| listProperties  | GET    | /identity/properties      | protect: true, tags: ['Identity']  |
| getProperty     | GET    | /identity/properties/{id} | protect: true, tags: ['Identity']  |
| createProperty  | POST   | /identity/properties      | protect: true, tags: ['Identity']  |
| listHouseholds  | GET    | /identity/households      | protect: true, tags: ['Identity']  |
| createHousehold | POST   | /identity/households      | protect: true, tags: ['Identity']  |
| getMyProperties | GET    | /identity/properties/my   | protect: true, tags: ['Identity']  |
| createProfile   | POST   | /identity/profiles        | protect: true, tags: ['Identity']  |
| updateProfile   | PATCH  | /identity/profiles/{id}   | protect: true, tags: ['Identity']  |
| getProfile      | GET    | /identity/profiles/{id}   | protect: false, tags: ['Identity'] |

Follow the exact pattern from tRPC.md §9.3:

```typescript
.meta({
  openapi: {
    method: 'GET',
    path: '/identity/properties',
    tags: ['Identity'],
    summary: 'List all properties',
    protect: true,
  },
})
```

Keep the existing path/params, procedures, and logic unchanged — only add `.meta()`.

After adding, verify the OpenAPI spec at `/api/openapi.json` now includes these endpoints.
</action>
<verify>
<automated>grep -c "\.meta(" src/entities/identity/api/router.ts | xargs echo "Meta declarations found:"; npx tsc --noEmit 2>&1 | head -10</automated>
<manual>Check GET /api/openapi.json includes all 10 procedures with correct paths, methods, tags</manual>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>All public tRPC procedures have .meta({ openapi }). OpenAPI spec includes all 10 endpoints.</done>
</task>

</tasks>

<verification>
1. `pnpm dev` starts without errors
2. `curl http://localhost:3000/api/openapi.json` returns valid JSON with all 10+ endpoints
3. `npx redocly lint --format=stylish` passes (warnings for missing examples/deprecation OK)
4. Manual OpenAPI spec at `src/app/api/openapi.json/route.ts` is now auto-generated
</verification>

<success_criteria>

- trpc-openapi installed and working
- OpenAPI generator creates spec from tRPC appRouter
- All identity procedures have `.meta({ openapi })` metadata
- Redocly CI configuration ready
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-B01-SUMMARY.md`
</output>
