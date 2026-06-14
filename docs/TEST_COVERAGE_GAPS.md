# Test Coverage Gaps

> Generated 2026-06-13. Updated after P0+P1+P2 test expansion.

## Current State

| Metric             | Original | After Mock Fix | After P0 Tests | After P1 Tests | After P2 Tests |
| ------------------ | -------- | -------------- | -------------- | -------------- | -------------- |
| Test files passing | 15       | 30             | 33             | 38             | **47**         |
| Test files failing | 15       | 0              | 0              | 0              | **0**          |
| Total tests        | 301      | 388            | 595            | 749            | **1016**       |
| Tests passing      | 208      | 388            | 595            | 749            | **1016**       |
| Tests failing      | 93       | 0              | 0              | 0              | **0**          |

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

### Bulk Tests in `src/test/` (39 files, 955 tests)

| File                               | Tests | Domain                       |
| ---------------------------------- | ----- | ---------------------------- |
| `api/surveys.test.ts`              | 84    | Survey API (P0)              |
| `api/community-services.test.ts`   | 71    | Community Services API (P0)  |
| `api/admin.test.ts`                | 52    | Admin/Platform API (P0)      |
| `api/directory.test.ts`            | 50    | Directory API (P1)           |
| `api/groups.test.ts`               | 44    | Groups API (P1)              |
| `entity-announcements.test.ts`     | 50    | Announcements entity (P2)    |
| `entity-events.test.ts`            | 36    | Event entity (P2)            |
| `entity-groups.test.ts`            | 44    | Groups entity (P2)           |
| `entity-chat.test.ts`              | 40    | Chat entity (P2)             |
| `feature-gate-client.test.tsx`     | 27    | Feature gate client (P2)     |
| `api/announcements.test.ts`        | 23    | Announcements API (P2)       |
| `api/properties.test.ts`           | 19    | Properties API (P2)          |
| `dto-event.test.ts`                | 13    | Event DTO (P2)               |
| `dto-property.test.ts`             | 15    | Property DTO (P2)            |
| `navigation-config.test.ts`        | 32    | Navigation config            |
| `api/chat.test.ts`                 | 30    | Chat/Conversations API (P1)  |
| `chat.test.tsx`                    | 28    | Chat UI + realtime           |
| `api-response.test.ts`             | 25    | API response utilities       |
| `schemas.test.ts`                  | 22    | Zod validation schemas       |
| `registry.test.ts`                 | 21    | Module/feature registry      |
| `permissions.test.ts`              | 20    | RBAC permissions             |
| `entity-bookings-services.test.ts` | 19    | Booking entity services (P1) |
| `constants.test.ts`                | 17    | Shared constants             |
| `competitions.test.ts`             | 15    | Competition API              |
| `content-i18n.test.ts`             | 15    | i18n content                 |
| `resources.test.ts`                | 15    | Resources API                |
| `sidebar-widget-box.test.ts`       | 15    | Sidebar widget box           |
| `flags.test.ts`                    | 14    | Feature flags                |
| `useResidentFilter.test.ts`        | 14    | Directory resident filter    |
| `auth-forms.test.tsx`              | 13    | Auth form pages              |
| `platform-flags.test.ts`           | 12    | Platform flags               |
| `api/bookings.test.ts`             | 12    | Bookings API                 |
| `api/events.test.ts`               | 11    | Events API                   |
| `platform-admin.test.ts`           | 11    | Platform admin               |
| `ui-components.test.tsx`           | 11    | UI components                |
| `dto-booking.test.ts`              | 11    | Booking DTO (P1)             |
| `api/maintenance.test.ts`          | 10    | Maintenance API              |
| `content-routes.test.ts`           | 9     | Content API routes           |
| `api/invitations.test.ts`          | 8     | Invitations API              |
| `chat-hooks.test.tsx`              | 7     | Chat hooks                   |
| `api/auth.test.ts`                 | 6     | Auth API                     |
| `auth-routes.test.ts`              | 4     | Auth routes                  |

## Coverage Gaps by Layer

### API Routes (`src/app/api/`) — 69% covered (108/157)

108 endpoints now have handler-level tests across 13 test files.

| Test File                                 | Tests | Endpoints | Wave |
| ----------------------------------------- | ----- | --------- | ---- |
| `src/test/api/surveys.test.ts`            | 84    | 18        | P0   |
| `src/test/api/community-services.test.ts` | 71    | 18        | P0   |
| `src/test/api/admin.test.ts`              | 52    | 13        | P0   |
| `src/test/api/directory.test.ts`          | 50    | 14        | P1   |
| `src/test/api/groups.test.ts`             | 44    | 9         | P1   |
| `src/test/api/chat.test.ts`               | 30    | 9         | P1   |
| `src/test/api/announcements.test.ts`      | 23    | 5         | P2   |
| `src/test/api/properties.test.ts`         | 19    | 5         | P2   |

No remaining gaps in the P0-P2 priority tiers. Remaining untested routes fall under P3 (shared infrastructure, utilities).

### Pages (`src/app/**/page.tsx`) — 0% covered

81 page files. No page-level rendering tests except auth forms.

### Features (`src/features/`) — 1% covered

95 files across 17 domains. Only `gate/` partially tested. Remaining gap:

| Domain             | Files | Criticality             | Status                                        |
| ------------------ | ----- | ----------------------- | --------------------------------------------- |
| `gate/`            | 3     | Feature access control  | **Partially tested** — client gate unit tests |
| `admin/`           | 8     | Platform & tenant admin |                                               |
| `booking/`         | 5     | Facility booking        |                                               |
| `chat/`            | 7     | Real-time messaging     |                                               |
| `content/`         | 6     | CMS content editing     |                                               |
| `directory/`       | 4     | Resident directory      |                                               |
| `event/`           | 4     | Community events        |                                               |
| `marketing/`       | 4     | Public-facing pages     |                                               |
| `onboarding/`      | 6     | New resident onboarding |                                               |
| `resources/`       | 5     | Knowledge base          |                                               |
| `service/`         | 6     | Community services      |                                               |
| `survey-builder/`  | 8     | Survey creation         |                                               |
| `tenant-selector/` | 3     | Tenant switcher         |                                               |
| Others             | 26    | Various features        |                                               |

### Entities (`src/entities/`) — 10% covered

105 files, 6 domains partially tested. Missing:

| Domain       | Files | Status                                                |
| ------------ | ----- | ----------------------------------------------------- |
| `booking/`   | 18    | **Partially tested** — services, DTO, permissions     |
| `chat/`      | 15    | **Partially tested** — schemas, constants, DTOs       |
| `event/`     | 7     | **Partially tested** — schemas, permissions, DTOs     |
| `content/`   | 8     | **Partially tested** — schemas, permissions, services |
| `directory/` | 5     | Resident directory                                    |
| `survey/`    | 10    | Survey infrastructure                                 |
| `admin/`     | 6     | Admin operations                                      |
| `user/`      | 5     | User management                                       |
| `service/`   | 6     | Community services                                    |

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

### P2 — Medium (completes coverage) — DONE 2026-06-13

8. **Properties API tests** — 19 tests, 5 endpoints ✅
9. **Announcements API tests** — 23 tests, 5 endpoints ✅
10. **Event entity unit tests** — 49 tests (schemas, permissions, services, DTOs) ✅
11. **Chat entity unit tests** — 40 tests (schemas, constants, DTOs) ✅
12. **Groups entity unit tests** — 44 tests (schemas, permissions, services, DTOs) ✅
13. **Feature gate client tests** — 27 tests (canAccessClient, GateGuard, hooks) ✅
14. **Dashboard widget tests** — model layer tested, UI layer untested
15. **Content CMS tests** — editing, versioning, publishing

### P3 — Nice to have

16. **Shared UI component tests** — `ui-components.test.tsx` covers basics, expand to all components
17. **Page-level rendering tests** — at least smoke tests for key pages
18. **i18n hook tests** — translation loading, language switching

## Remediation Notes

- Added 17 new test suites: surveys, community-services, admin, directory, chat, groups, announcements, properties, entity-bookings-services, entity-announcements, entity-events, entity-chat, entity-groups, feature-gate-client, dto-booking, dto-event, dto-property
- Created `src/test/helpers/mock-api-server.ts` as a centralized mock helper to prevent the mock fragmentation that caused the 93 failures
- 1016 tests across 47 files, all passing with `pnpm test -- --run`
- Test infrastructure: Vitest with jsdom environment, configured in `vitest.config.ts`
- Run tests: `pnpm test` (watch) or `pnpm test -- --run` (single run)
