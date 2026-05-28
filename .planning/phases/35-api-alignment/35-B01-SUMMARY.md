---
phase: 35-api-alignment
plan: B01
name: trpc-openapi-wiring
subsystem: api
tags: [tRPC, OpenAPI, API-governance, spec-generation]
requires: [35-A01]
provides: [auto-generated-openapi-spec, redocly-config]
affects: [src/server/openapi, src/app/api/openapi.json, .redocly.yaml]
tech-stack:
  added: [@trpc/openapi]
  patterns: [auto-generated-openapi]
key-files:
  created:
    - src/server/openapi/generator.ts
    - .redocly.yaml
  modified:
    - src/app/api/openapi.json/route.ts
    - src/entities/identity/api/router.ts
    - package.json
    - tsconfig.json
decisions:
  - Used @trpc/openapi (official tRPC v11 package) instead of trpc-openapi (requires @trpc/server@^10)
  - Used @trpc/openapi's file-path-based generateOpenAPIDocument() instead of runtime generateOpenApiDocument()
  - Generated spec is OpenAPI 3.1 (trpc-openapi v1 generates 3.0)
  - @server/* path alias added to tsconfig.json for generator import
metrics:
  duration: 47m
  completed: 2026-05-28T13:42:00Z
---

# Phase 35 Plan B01: tRPC → OpenAPI Wiring

**One-liner:** Wired `@trpc/openapi` to auto-generate OpenAPI 3.1 spec from governed tRPC procedures, replacing the hand-written spec with an always-fresh tRPC-generated contract.

## Objective

Wire trpc-openapi (via `@trpc/openapi` official tRPC v11 package) to generate the OpenAPI specification from tRPC procedures. Replace the manually crafted `openapi.json` route with an auto-generated one. Add `.meta({ openapi })` to all identity procedures for governance compliance.

## Tasks Executed

| #   | Name                         | Status | Commit  | Key Files                   |
| --- | ---------------------------- | ------ | ------- | --------------------------- |
| 1   | Install and create generator | Done   | 9730cbc | generator.ts, openapi route |
| 2   | Add .meta() to identity      | Done   | cfc83ca | router.ts (81 lines added)  |

### Task 1: Install `@trpc/openapi` and create generator

**What was done:**

- Installed `@trpc/openapi@11.17.0-alpha` (official tRPC v11 OpenAPI package)
- Created `src/server/openapi/generator.ts` with async cached generation
- Replaced hand-written `src/app/api/openapi.json/route.ts` with auto-generated spec endpoint
- Added `@server/*` path alias to `tsconfig.json`
- Created `.redocly.yaml` for OpenAPI validation via Redocly
- Added `api:generate` and `api:lint` npm scripts
- Removed `trpc-to-openapi` and `zod-openapi` (incompatible with zod v3.25)

**Generated spec:** `/api/openapi.json` returns complete OpenAPI 3.1 spec with:

- All 12 identity procedures
- Full Zod-derived schema definitions including `typeToFlattenedError`
- `servers` configuration from `NEXT_PUBLIC_API_BASE_URL`

### Task 2: Add `.meta({ openapi })` to identity procedures

**What was done:**

- Added `.meta({ openapi })` to 9 procedure declarations:
  - `listProperties` (GET /identity/properties)
  - `getProperty` (GET /identity/properties/{id})
  - `createProperty` (POST /identity/properties)
  - `listHouseholds` (GET /identity/households)
  - `createHousehold` (POST /identity/households)
  - `getMyProperties` (GET /identity/properties/my)
  - `createProfile` (POST /identity/profiles)
  - `updateProfile` (PATCH /identity/profiles/{id})
  - `getProfile` (GET /identity/profiles/{id})
- 3 existing `.meta()` calls on solo seat/agent access procedures preserved
- All procedures now have complete openapi metadata per tRPC.md §9.3 pattern

## Deviations from Plan

### [Rule 3 - Blocking] Package substitution: trpc-openapi → @trpc/openapi

- **Found during:** Task 1
- **Issue:** `trpc-openapi@1.2.0` requires `@trpc/server@^10` — incompatible with project's `@trpc/server@^11.17.0`. `trpc-to-openapi@3.3.0` supports tRPC v11 but is incompatible with zod v3.25.76 (uses `_zod.def.type` internal check that doesn't exist in zod v3.25).
- **Solution:** Used `@trpc/openapi@11.17.0-alpha` — the official tRPC v11 OpenAPI generation package. Uses TypeScript compiler analysis (not runtime Zod introspection), so it works with any zod version.
- **API difference:** `generateOpenAPIDocument(routerFilePath, options?)` takes a file path and returns `Promise<Document>`, not `generateOpenApiDocument(appRouter, options)`.
- **Spec difference:** Generates OpenAPI 3.1 (not 3.0) with tRPC-style paths (e.g., `/identity.listProperties`) instead of REST paths (`/identity/properties`). The `.meta({ openapi })` paths are still defined for documentation/governance but not used by `@trpc/openapi`'s path generation.
- **Files modified:** `src/server/openapi/generator.ts`, `src/app/api/openapi.json/route.ts`

### [Rule 3 - Blocking] Path alias for generator

- **Found during:** Task 1
- **Issue:** No `@server` path alias existed for importing from `src/server/`
- **Fix:** Added `"@server/*": ["./src/server/*"]` to tsconfig.json
- **Files modified:** `tsconfig.json`

## Verification

- [x] `GET /api/openapi.json` returns 200 with valid OpenAPI spec
- [x] Spec contains all 12 identity procedures with complete schemas
- [x] TypeScript compiles without errors in modified files
- [x] All 12 procedures have `.meta({ openapi })` defined
- [x] Redocly configuration file created
- [x] npm scripts `api:generate` and `api:lint` registered

## Self-Check

- [x] `src/server/openapi/generator.ts` created → FOUND
- [x] `grep -q "generateOpenAPIDocument" src/server/openapi/generator.ts` → FOUND
- [x] `curl http://localhost:3000/api/openapi.json` returns 200
- [x] `grep -c "\.meta(" src/entities/identity/api/router.ts | xargs` → 12
- [x] `npx tsc --noEmit` passes for modified files
