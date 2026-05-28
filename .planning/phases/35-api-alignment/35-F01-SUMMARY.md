---
phase: 35-api-alignment
plan: F01
subsystem: api-testing
tags:
  - api-governance
  - testing
  - ci-cd
  - openapi
  - vitest
dependency_graph:
  requires:
    - 35-D01 (Canonical module structure)
    - 35-D02 (Entity service boundaries)
    - 35-E01 (Flat route → entity service refactor)
  provides:
    - Domain-level API test suites for 5 domains
    - CI workflow for OpenAPI validation
    - Shared test infrastructure (helpers)
  affects:
    - future-api-test-expansion (F02)
tech-stack:
  added:
    - vitest (existing, extended to src/test/api/)
    - @redocly/cli (CI validation)
    - trpc-openapi (spec generation)
  patterns:
    - Hoisted mock state via vi.hoisted() for route mocking
    - Chainable Drizzle mock (select/insert/update/delete)
    - Canonical response envelope checks (success, data, error.code)
key-files:
  created:
    - src/test/api/helpers.ts
    - src/test/api/auth.test.ts
    - src/test/api/maintenance.test.ts
    - src/test/api/bookings.test.ts
    - src/test/api/events.test.ts
    - src/test/api/invitations.test.ts
    - .github/workflows/api-ci.yml
  modified:
    - .redocly.yaml
    - src/app/api/bookings/route.ts
    - src/app/api/events/route.ts
    - package.json
decisions:
  - "Shared helpers in helpers.ts: chain builders + mock request, hoisted mocks stay per-file"
  - "Entity services mocked at module level to avoid deep import chains"
  - "Redocly lint configured via --config flag pointing to .redocly.yaml"
  - "Pre-existing test failures (21 tests) in src/test/ (not src/test/api/) deferred — caused by Phase 35-A01 response envelope change"
metrics:
  duration: 8m 51s
  tasks: 2
  test_files: 5
  tests_total: 47
  tests_passed: 47
  modified_files: 4
  created_files: 7
completed_date: 2026-05-28
---

# Phase 35 Plan F01: API Test Coverage and CI Validation

One-liner: Built comprehensive API test suites for 5 domains (auth, maintenance, bookings, events, invitations) with shared test infrastructure, plus OpenAPI CI validation workflow wired through redocly lint.

## What Was Built

### Task 1: API Test Infrastructure + 5 Domain Test Files

**Shared test helpers** (`src/test/api/helpers.ts`):

- `createMockRequest()` — standardized Request object with tenant headers
- `makeSelectChain()` — chainable Drizzle select mock (thenable + chainable)
- `makeInsertChain()` — insert().values().returning() chain
- `makeUpdateChain()` — update().set().where().returning() chain
- `makeDeleteChain()` — delete().where() chain

**5 domain test files (47 tests total):**

| File                  | Tests | Coverage                                                                                                                                           |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.test.ts`        | 6     | Better Auth wrapper delegation, rate limiting (10 req/min), error passthrough, suspension status                                                   |
| `maintenance.test.ts` | 10    | Auth guard, list with filters (status/priority), tenant isolation, validation (422), create with valid data                                        |
| `bookings.test.ts`    | 10    | Auth guard, feature gate (FEATURE_DISABLED), facility filtering, today normalization, Zod validation, invalid facility rejection, tenant isolation |
| `events.test.ts`      | 12    | Auth guard, list with upcoming/limit params, tenant isolation, permission check (403), field validation (400), create with valid data              |
| `invitations.test.ts` | 9     | GET tenant-scoped list, rate limiting (5 req/min), email sending, 7-day expiry validation                                                          |

### Task 2: OpenAPI CI Validation Workflow

**Created `.github/workflows/api-ci.yml`** with 2 jobs:

1. **OpenAPI Specification Lint** — generates spec via `trpc-openapi`, runs `redocly lint`
2. **API Tests** — runs `vitest run src/test/api/`

Triggers on PR changes to API files and pushes to main.

**Updated `.redocly.yaml`**:

- Points to local `public/openapi.json` instead of live server URL
- Cleaned up config format (removed invalid `features` and `lint` keys)
- Configured rules: `no-server-trailing-slash: error`, `no-empty-servers: warn`, `path-parameters-defined: error`

**Updated `package.json`**:

- Added `api:ci` script (generate + lint)
- Updated `api:lint` to use `--config .redocly.yaml`

### Bug Fixes (Rule 1)

During test development, discovered that `bookings/route.ts` and `events/route.ts` passed `{ status: 400 }` as the `meta` parameter to `apiSuccess()` instead of as the `status` parameter. This meant validation errors returned HTTP 200 instead of 400. Fixed both routes.

## Deviation Tracking

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed apiSuccess() status param in bookings and events routes**

- **Found during:** Task 1
- **Issue:** `apiSuccess({ error: '...' }, { status: 400 })` passed `{ status: 400 }` as `meta` (2nd param) instead of `status` (3rd param), resulting in HTTP 200 for validation errors
- **Fix:** Changed to `apiSuccess({ error: '...' }, undefined, 400)` in 3 call sites (bookings Zod validation, bookings facility validation, events field validation)
- **Files modified:** `src/app/api/bookings/route.ts`, `src/app/api/events/route.ts`
- **Commit:** `6994826`

## Pre-existing Issues (Out of Scope)

21 test failures in `src/test/` (not `src/test/api/`) are pre-existing — caused by Phase 35-A01's canonical response envelope change (old `{ error: "string" }` → new `{ success: false, error: { code, message } }`). These are in `resources.test.ts`, `competitions.test.ts`, `platform-admin.test.ts`, and `content-routes.test.ts`.

## Success Criteria Verification

- [x] 5+ domain API test files with auth, validation, tenant isolation, and happy-path coverage (5 files, 47 tests)
- [x] Shared test infrastructure (helpers.ts) for route testing
- [x] CI workflow with OpenAPI lint and API test jobs
- [x] `npx redocly lint` passes (0 errors, 14 warnings)
- [x] Each task committed individually
- [x] SUMMARY.md created
