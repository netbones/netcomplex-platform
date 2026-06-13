# Test Coverage Gaps

> Generated 2026-06-13. Updated after FSD gate migration and P0 test expansion.

## Current State

| Metric             | Original | After Mock Fix | After P0 Tests | After P1 Tests |
| ------------------ | -------- | -------------- | -------------- | -------------- |
| Test files passing | 15       | 30             | 33             | **38**         |
| Test files failing | 15       | 0              | 0              | **0**          |
| Total tests        | 301      | 388            | 595            | **749**        |
| Tests passing      | 208      | 388            | 595            | **749**        |
| Tests failing      | 93       | 0              | 0              | **0**          |

## Root Cause of Prior Failures

All 93 failures were pre-existing, caused by **incomplete `vi.mock('@api/server', ...)` setups** in test files. Production routes imported API response helpers (`apiSuccess`, `apiUnauthorized`, etc.) from `@api/server`, but test mock factories didn't include them. When Vitest hoisted the mock, these identifiers were `undefined`, producing `TypeError`.

Other contributing issues fixed in this pass:

- Multiple `vi.mock()` calls for the same module overwriting each other (platform-admin, competitions)
- Missing `next/headers`, `next/navigation` mocks causing import-time crashes in jsdom
- Missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars (chat tests)
- Default `fetch` mock returning `undefined` instead of a proper `Response`
- Incomplete mock `Response` object missing `status` / `headers` (useResidentFilter)
- `Object.defineProperty` on read-only `Response.status` (api-response.test.ts)

## Test File Inventory

### Co-located Tests (8 files, 61 tests)

| File                                                             | Tests | Layer    |
| ---------------------------------------------------------------- | ----- | -------- |
| `entities/tenant/api/gate/gate.test.ts`                          | 24    | entities |
| `entities/tenant/api/flags/platform-flags.test.ts`               | 3     | entities |
| `entities/tenant/model/__tests__/roles.test.ts`                  | 5     | entities |
| `entities/maintenance/permissions/__tests__/permissions.test.ts` | 11    | entities |
| `widgets/dashboard/model/active-space.test.ts`                   | 16    | widgets  |
| `widgets/dashboard/model/spaces.test.ts`                         | 6     | widgets  |
| `shared/api/__tests__/http-client.test.ts`                       | 9     | shared   |
| `shared/api/db.test.ts`                                          | 2     | shared   |

### Bulk Tests in `src/test/` (25 files, 327 tests)

| File                         | Tests | Domain                           |
| ---------------------------- | ----- | -------------------------------- |
| `navigation-config.test.ts`  | 32    | Navigation config                |
| `chat.test.tsx`              | 28    | Chat UI + realtime               |
| `api-response.test.ts`       | 25    | API response utilities           |
| `schemas.test.ts`            | 22    | Zod validation schemas           |
| `registry.test.ts`           | 21    | Module/feature registry          |
| `permissions.test.ts`        | 20    | RBAC permissions                 |
| `constants.test.ts`          | 17    | Shared constants                 |
| `competitions.test.ts`       | 15    | Competition API + platform admin |
| `content-i18n.test.ts`       | 15    | i18n content                     |
| `resources.test.ts`          | 15    | Resources API                    |
| `sidebar-widget-box.test.ts` | 15    | Sidebar widget box               |
| `flags.test.ts`              | 14    | Feature flags                    |
| `useResidentFilter.test.ts`  | 14    | Directory resident filter        |
| `auth-forms.test.tsx`        | 13    | Auth form pages                  |
| `platform-flags.test.ts`     | 12    | Platform flags                   |
| `api/bookings.test.ts`       | 12    | Bookings API                     |
| `api/events.test.ts`         | 11    | Events API                       |
| `platform-admin.test.ts`     | 11    | Platform admin                   |
| `ui-components.test.tsx`     | 11    | UI components                    |
| `api/maintenance.test.ts`    | 10    | Maintenance API                  |
| `content-routes.test.ts`     | 9     | Content API routes               |
| `api/invitations.test.ts`    | 8     | Invitations API                  |
| `chat-hooks.test.tsx`        | 7     | Chat hooks                       |
| `api/auth.test.ts`           | 6     | Auth API                         |
| `auth-routes.test.ts`        | 4     | Auth routes                      |

## Coverage Gaps by Layer

### API Routes (`src/app/api/`) — 62% covered (98/157)

98 endpoints now have handler-level tests across 11 test files. P0+P1 test suites added:

| Test File                                 | Tests | Endpoints | Added |
| ----------------------------------------- | ----- | --------- | ----- |
| `src/test/api/surveys.test.ts`            | 84    | 18        | P0    |
| `src/test/api/community-services.test.ts` | 71    | 18        | P0    |
| `src/test/api/admin.test.ts`              | 52    | 13        | P0    |

Remaining gaps:

| Route                   | Risk   | Notes                              |
| ----------------------- | ------ | ---------------------------------- |
| `/api/directory/**`     | Medium | Resident directory — used daily    |
| `/api/groups/**`        | Medium | Community groups                   |
| `/api/properties/**`    | Medium | Property management                |
| `/api/conversations/**` | Medium | Chat/messages — realtime dependent |
| `/api/announcements/**` | Medium | Community announcements            |

### Pages (`src/app/**/page.tsx`) — 0% covered

81 page files. No page-level rendering tests except auth forms.

### Features (`src/features/`) — 0% covered

95 files across 17 domains. Complete gap:

| Domain             | Files | Criticality             |
| ------------------ | ----- | ----------------------- |
| `admin/`           | 8     | Platform & tenant admin |
| `booking/`         | 5     | Facility booking        |
| `chat/`            | 7     | Real-time messaging     |
| `content/`         | 6     | CMS content editing     |
| `directory/`       | 4     | Resident directory      |
| `event/`           | 4     | Community events        |
| `gate/`            | 3     | Feature access control  |
| `marketing/`       | 4     | Public-facing pages     |
| `onboarding/`      | 6     | New resident onboarding |
| `resources/`       | 5     | Knowledge base          |
| `service/`         | 6     | Community services      |
| `survey-builder/`  | 8     | Survey creation         |
| `tenant-selector/` | 3     | Tenant switcher         |
| Others             | 26    | Various features        |

### Entities (`src/entities/`) — 4% covered

105 files, only 3 domains tested (tenant, maintenance). Missing:

| Asserted but untested | Files | Risk                  |
| --------------------- | ----- | --------------------- |
| `booking/`            | 18    | Core commerce flow    |
| `chat/`               | 15    | Real-time messaging   |
| `content/`            | 8     | CMS content APIs      |
| `event/`              | 7     | Event management      |
| `directory/`          | 5     | Resident directory    |
| `survey/`             | 10    | Survey infrastructure |
| `admin/`              | 6     | Admin operations      |
| `user/`               | 5     | User management       |
| `service/`            | 6     | Community services    |

### Widgets (`src/widgets/`) — 2% covered

97 files, only dashboard model tested. 95 files untested including `admin/`, `booking/`, `chat/`, `maintenance/`, `service/` widgets.

### Shared (`src/shared/`) — 3% covered

101 files, only `http-client` and `db` tested. Major gaps:

| Module          | Files | Notes                                          |
| --------------- | ----- | ---------------------------------------------- |
| `shared/ui/`    | 30+   | Header, MobileMenu, Tooltip, Breadcrumbs, etc. |
| `shared/lib/`   | 20+   | Hooks, nav, types, config, sanitize, i18n      |
| `shared/api/`   | 15+   | Revalidation, rate-limit, auth-utils, email    |
| `shared/model/` | 5     | Shared model logic                             |

## Priority Recommendations

### P0 — Critical (affects launch readiness) — DONE 2026-06-13

1. **Survey API tests** — 84 tests, 18 endpoints ✅
2. **Community services API tests** — 71 tests, 18 endpoints ✅
3. **Admin platform API tests** — 52 tests, 13 endpoints ✅ (complements `platform-admin.test.ts`)

### P1 — High (affects user experience) — DONE 2026-06-13

4. **Directory API tests** — 50 tests, 14 endpoints ✅
5. **Chat/Conversations API tests** — 30 tests, 9 endpoints ✅
6. **Groups API tests** — 44 tests, 9 endpoints ✅
7. **Booking entity tests** — 30 tests (buildBookingConditions, DTO, services) ✅

### P2 — Medium (completes coverage)

8. **Feature gate client tests** — `features/gate/model/gate.ts` was recently moved, has server tests but no client tests
9. **Dashboard widget tests** — model layer tested, UI layer untested
10. **Event entity + API tests** — already have API tests, add unit tests
11. **Content CMS tests** — editing, versioning, publishing

### P3 — Nice to have

12. **Shared UI component tests** — `ui-components.test.tsx` covers basics, expand to all components
13. **Page-level rendering tests** — at least smoke tests for key pages
14. **i18n hook tests** — translation loading, language switching

## Remediation Notes

- Created `src/test/helpers/mock-api-server.ts` as a centralized mock helper to prevent the mock fragmentation that caused the 93 failures
- All current test files pass with `pnpm test -- --run`
- Test infrastructure: Vitest with jsdom environment, configured in `vitest.config.ts`
- Run tests: `pnpm test` (watch) or `pnpm test -- --run` (single run)
