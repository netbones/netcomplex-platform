---
phase: 35-api-alignment
plan: A01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/shared/api/api-response.ts
  - src/app/api/users/route.ts
  - src/app/api/users/[id]/route.ts
  - src/app/api/users/[id]/suspend/route.ts
  - src/app/api/users/[id]/unsuspend/route.ts
  - src/app/api/users/[id]/suspensions/route.ts
  - src/app/api/maintenance/route.ts
  - src/app/api/maintenance/[id]/route.ts
  - src/app/api/bookings/route.ts
  - src/app/api/bookings/[id]/route.ts # if exists
  - src/app/api/events/route.ts
  - src/app/api/events/[id]/route.ts
  - src/app/api/announcements/route.ts
  - src/app/api/announcements/[id]/route.ts
  - src/app/api/content/route.ts
  - src/app/api/content/[id]/route.ts
  - src/app/api/groups/route.ts
  - src/app/api/groups/[id]/route.ts
  - src/app/api/households/route.ts
  - src/app/api/households/[id]/route.ts
  - src/app/api/admin/platform/tenants/route.ts
  - src/app/api/admin/platform/tenants/[id]/route.ts
  - src/app/api/resources/route.ts
  - src/app/api/resources/[id]/route.ts
  - src/app/api/competitions/route.ts
  - src/app/api/competitions/[id]/route.ts
  - src/app/api/conversations/route.ts
  - src/app/api/messages/route.ts
  - src/app/api/messages/unread/route.ts
  - src/app/api/notifications/route.ts
  - src/app/api/settings/route.ts
  - src/app/api/settings/[key]/route.ts
  - src/app/api/settings/contact/route.ts
  - src/app/api/admin/board-members/route.ts
  - src/app/api/admin/settings/page-flags/route.ts
  - src/app/api/dashboard/stats/route.ts
  - src/app/api/stats/route.ts
  - src/app/api/groups/members/route.ts
  - src/app/api/groups/membership-requests/route.ts
  - src/app/api/groups/membership-requests/[id]/route.ts
  - src/app/api/invitations/route.ts
  - src/app/api/invitations/[id]/route.ts
  - src/app/api/invitations/accept/route.ts
  - src/app/api/invitations/validate/route.ts
  - src/app/api/external-surveys/route.ts
  - src/app/api/surveys/route.ts
  - src/app/api/surveys/[id]/responses/route.ts
  - src/app/api/community-services/listings/route.ts
  - src/app/api/community-services/listings/[id]/route.ts
  - src/app/api/community-services/listings/related/route.ts
  - src/app/api/community-services/listings/[id]/publish/route.ts
  - src/app/api/community-services/reviews/[listingId]/route.ts
  - src/app/api/community-services/inquiries/route.ts
  - src/app/api/community-services/provider/inquiries/[id]/route.ts
  - src/app/api/community-services/analytics/route.ts
  - src/app/api/community-services/moderation/listings/[id]/route.ts
  - src/app/api/agents/activity/route.ts
  - src/app/api/agents/managed-properties/route.ts
  - src/app/api/agents/marketplace/route.ts
  - src/app/api/seats/route.ts
  - src/app/api/pricing/route.ts
  - src/app/api/campaign/route.ts
  - src/app/api/conservation/route.ts
  - src/app/api/flags/route.ts
  - src/app/api/media/route.ts
  - src/app/api/upload/route.ts
  - src/app/api/premium/portfolio/route.ts
  - src/app/api/premium/listings/route.ts
  - src/app/api/tenants/[id]/modules/route.ts
  - src/app/api/platform/onboarding/route.ts
  - src/app/api/platform/tenants/route.ts
  - src/app/api/admin/maintenance-stats/route.ts
  - src/app/api/admin/platform/assist/route.ts
  - src/app/api/admin/platform/assist/[id]/route.ts
  - src/app/api/user/albums/route.ts
  - src/app/api/user/tags/route.ts
  - src/app/api/health/route.ts
  - src/app/api/auth/suspension-status/route.ts
  - src/entities/tenant/api/permissions.ts
autonomous: true
requirements:
  - API-RESP-01
  - API-RESP-02

must_haves:
  truths:
    - 'Every API response follows the canonical success envelope: { success, data, meta }'
    - 'Every API error follows the canonical error envelope: { success: false, error: { code, message, details? } }'
    - 'Canonical error codes are used: AUTH_REQUIRED, FORBIDDEN, TENANT_REQUIRED, TENANT_FORBIDDEN, VALIDATION_ERROR, NOT_FOUND, RATE_LIMITED, FEATURE_DISABLED, SUSPENDED_USER, INTERNAL_ERROR'
    - 'Paginated responses use canonical format: { data, meta: { page, pageSize, total, hasMore } }'
  artifacts:
    - path: 'src/shared/api/api-response.ts'
      provides: 'Standardized API response + error builders'
      min_lines: 120
    - path: 'All API route files under src/app/api/'
      provides: 'Consistent response envelope across all endpoints'
    - path: 'src/test/schemas.test.ts'
      provides: 'Tests for canonical response helpers'
  key_links:
    - from: 'src/shared/api/api-response.ts'
      to: 'src/app/api/*/route.ts'
      via: 'Import and use apiSuccess()/apiError()/apiPaginated()'
      pattern: 'import.*api(success|Error|Paginated)'
    - from: 'api-response.ts'
      to: 'API.md §11-12'
      via: 'Implementation of the response envelope standard'
---

<objective>
Standardize the API response envelope and error codes across all 85+ REST API routes.

Purpose: Every API route currently uses its own response format — some return raw `NextResponse.json(data)`, some use `{success: true}`, some return `{error: 'message'}` with inconsistent status codes. This creates integration friction for mobile clients and external consumers.

The governance documents (API.md §11-12) specify:

- Success: `{ success: true, data, meta? }`
- Error: `{ success: false, error: { code, message, details? } }`
- Paginated: `{ success: true, data, meta: { page, pageSize, total, hasMore } }`
- Canonical error codes: AUTH_REQUIRED, FORBIDDEN, TENANT_REQUIRED, TENANT_FORBIDDEN, VALIDATION_ERROR, NOT_FOUND, RATE_LIMITED, FEATURE_DISABLED, SUSPENDED_USER, INTERNAL_ERROR

Output: `src/shared/api/api-response.ts` with factory functions + all API routes updated.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/35-api-alignment/35-AUDIT.md
@docs/STEERING/API.md
@src/shared/api/schemas.ts
@src/entities/tenant/api/permissions.ts
@src/entities/tenant/api/with-tenant.ts
@src/shared/api/auth-utils.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Create canonical response helpers (api-response.ts)</name>
<files>src/shared/api/api-response.ts</files>
<action>
Create `src/shared/api/api-response.ts` with the following exports:

**1. Canonical error code constants (`ERROR_CODES`):**

```typescript
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  TENANT_FORBIDDEN: 'TENANT_FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  SUSPENDED_USER: 'SUSPENDED_USER',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

**2. `apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200)`** — Returns `NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status })`. Meta is optional. If meta contains `page`/`pageSize`/`total`/`hasMore`, the response shape becomes `{ success: true, data, meta: { page, pageSize, total, hasMore } }` automatically.

**3. `apiError(code: string, message: string, status: number, details?: unknown)`** — Returns `NextResponse.json({ success: false, error: { code, message, ...(details && { details }) } }, { status })`.

**4. `apiPaginated<T>(data: T[], page: number, pageSize: number, total: number)`** — Calls `apiSuccess(data, { page, pageSize, total, hasMore: page * pageSize < total })`.

**5. `apiCreated<T>(data: T)`** — Calls `apiSuccess(data, undefined, 201)`.

**6. `apiNoContent()`** — Returns `new NextResponse(null, { status: 204 })`.

**7. Convenience wrappers for common errors:**

- `apiUnauthorized(msg?)` → `apiError(ERROR_CODES.AUTH_REQUIRED, msg || 'Authentication required', 401)`
- `apiForbidden(msg?)` → `apiError(ERROR_CODES.FORBIDDEN, msg || 'Forbidden', 403)`
- `apiTenantRequired()` → `apiError(ERROR_CODES.TENANT_REQUIRED, 'Tenant context required', 400)`
- `apiTenantForbidden()` → `apiError(ERROR_CODES.TENANT_FORBIDDEN, 'Cross-tenant access denied', 403)`
- `apiValidationError(details)` → `apiError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', 422, details)`
- `apiNotFound(msg?)` → `apiError(ERROR_CODES.NOT_FOUND, msg || 'Not found', 404)`
- `apiSuspendedUser(details?)` → `apiError(ERROR_CODES.SUSPENDED_USER, 'Account suspended', 403, details)`
- `apiInternalError(msg?)` → `apiError(ERROR_CODES.INTERNAL_ERROR, msg || 'Internal server error', 500)`

All functions import `NextResponse` from `next/server`. Return type is `NextResponse`.

Type exports: `type ApiSuccessResponse<T>`, `type ApiErrorResponse`, `type ApiPaginatedMeta`, `type ApiPaginatedResponse<T>`, `type CanonicalErrorCode`.

Test coverage:

- `apiSuccess` returns correct shape with and without meta
- `apiError` returns correct shape with code, message, details
- `apiPaginated` sets hasMore correctly for edge cases (page at boundary)
- All convenience wrappers map to correct HTTP status codes
- TypeScript strict: calling `apiSuccess` without data should error
  </action>
  <verify>
  <automated>npx vitest run src/test/api-response.test.ts --reporter=verbose 2>/dev/null || echo "No test file yet — checking file exists"; test -f src/shared/api/api-response.ts && echo "File created"</automated>
  <manual>Verify the helper exports compile: `npx tsc --noEmit src/shared/api/api-response.ts`</manual>
  <sampling_rate>run after task commits, before next task begins</sampling_rate>
  </verify>
  <done>
  api-response.ts exists with all 12 exports (6 response builders + 8 error shortcuts). Test file passes all cases.
  </done>
  </task>

<task type="auto">
<name>Task 2: Update the auth-utils helpers to use canonical errors</name>
<files>src/shared/api/auth-utils.ts</files>
<action>
Update `src/shared/api/auth-utils.ts` to use the new canonical error response helpers instead of manually constructing `{error: 'message'}` objects:

1. Import `{ apiUnauthorized, apiForbidden, apiSuspendedUser }` from `./api-response`
2. Replace all `return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` with `return apiUnauthorized()`
3. Replace all `return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })` with `return apiForbidden('Insufficient permissions')`
4. Replace the suspension error response in `throwIfSuspended()` with `apiSuspendedUser({ id, reason, suspensionType, startDate, endDate, isPermanent })`

Do NOT change the function signatures or logic — only the response construction calls.
</action>
<verify>
<automated>npx tsc --noEmit src/shared/api/auth-utils.ts 2>&1 | head -20</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>auth-utils.ts uses canonical error responses, compiles without errors.</done>
</task>

<task type="auto">
<name>Task 3: Update all 85+ API route files to use canonical response helpers</name>
<files>src/app/api/</files>
<action>
This is a bulk mechanical transformation. Process every `src/app/api/*/route.ts` file.

**Pattern for each route:**

For each file found via `find src/app/api -name 'route.ts'`:

1. Add import: `import { apiSuccess, apiError, apiCreated, apiPaginated, apiUnauthorized, apiForbidden, apiNotFound, apiValidationError, apiInternalError, apiSuspendedUser } from '@shared/api/api-response';` (use correct path alias — check if file uses `@api/` or `@shared/` style imports)

2. **GET routes that return lists:**
   - If the route supports pagination params (page, limit), use `apiPaginated(data, page, pageSize, total)`
   - If not paginated, use `apiSuccess(data)`

3. **GET routes that return single items:**
   - Replace `return NextResponse.json(data)` with `return apiSuccess(data)`
   - Replace null/undefined returns with `return apiNotFound('Resource not found')`
   - Replace `return NextResponse.json({ error: 'Not found' }, { status: 404 })` with `return apiNotFound()`

4. **POST routes (create):**
   - Replace `return NextResponse.json(data, { status: 201 })` with `return apiCreated(data)`
   - Replace `return NextResponse.json(data)` (no status) with `return apiSuccess(data, undefined, 201)` if it creates

5. **PATCH/PUT routes (update):**
   - Replace `return NextResponse.json({ success: true })` with `return apiSuccess({ success: true })`
   - Replace `return NextResponse.json(data)` with `return apiSuccess(data)`

6. **DELETE routes:**
   - Replace `return NextResponse.json({ success: true })` with `return apiNoContent()` or `return apiSuccess({ success: true })`

7. **Error responses:** Replace all:
   - `{ error: 'Unauthorized' }, { status: 401 }` → `apiUnauthorized()`
   - `{ error: 'Forbidden' }, { status: 403 }` → `apiForbidden()`
   - `{ error: 'Not found' }, { status: 404 }` → `apiNotFound()`
   - `{ error: 'Invalid input', details }, { status: 400 }` → `apiValidationError(details)`
   - `{ error: 'Internal server error' }, { status: 500 }` → `apiInternalError()`
   - `{ error: 'Account suspended', ... }, { status: 403 }` → `apiSuspendedUser(...)`

8. **Remove unused imports** that were replaced (e.g., if `NextResponse` is no longer used directly, remove the import).

**Important caveats:**

- Do NOT change business logic, query logic, or permission checks
- Do NOT change the data shape — only wrap it in the canonical envelope
- Keep `maxDuration` exports as-is
- The `/api/health` route can use `apiSuccess({ status: 'ok', ... })`
- The `/api/auth/[...all]/route.ts` is a Better Auth handler — do NOT touch
- The `/api/trpc/[trpc]/route.ts` is a tRPC handler — do NOT touch
- The `/api/openapi.json/route.ts` will be replaced in a later plan — leave as-is

**Batch process by domain group** to minimize commits:

1. Users/Seats group: users, users/[id], suspension, seats, user/albums, user/tags
2. Maintenance group: maintenance, maintenance/[id], maintenance/[id]/notes, maintenance/[id]/history, maintenance/[id]/notify
3. Bookings + Events: bookings, events
4. Content + Announcements: content, content/[id], announcements, announcements/[id]
5. Groups: groups, groups/[id], groups/members, groups/membership-requests
6. Households + Resources + Competitions: households, resources, competitions
7. Community Services: all community-services/\*
8. Admin: admin/platform/tenants, admin/board-members, admin/settings, admin/platform/assist
9. Conversations + Messages + Notifications
10. Settings, Dashboard, Stats, Flags
11. Platform: platform/onboarding, platform/tenants, tenants/[id]/modules
12. Remaining: agents, premium, pricing, campaign, conservation, media, upload, external-surveys, surveys, invitations, health, auth/suspension-status

After each group, run `npx tsc --noEmit src/app/api/{group}/*/route.ts` to verify compilation.
</action>
<verify>
<automated>npx tsc --noEmit 2>&1 | grep -i "error" | head -20; echo "---"; find src/app/api -name 'route.ts' | wc -l</automated>
<manual>Spot-check 5 routes via curl or visual inspection to verify response envelopes are correct</manual>
<sampling_rate>run after all route groups are updated</sampling_rate>
</verify>
<done>All API routes use canonical response envelope. TypeScript compilation passes with zero errors. Response format is consistent across all endpoints.</done>
</task>

</tasks>

<verification>

1. Run `npx tsc --noEmit` — must pass with zero errors
2. Run `npx vitest run src/test/api-response.test.ts` — response helper tests pass
3. Grep for bare `NextResponse.json(` in `src/app/api/` — should be zero (all wrapped through helpers)
4. Grep for `{ error: 'Unauthorized' }` in route files — should be zero
5. Grep for `{ success: true }` in route files — should now be wrapped through `apiSuccess()`
6. Verify no files were skipped: `find src/app/api -name 'route.ts' | wc -l` should match count of modified files
   </verification>

<success_criteria>

- `src/shared/api/api-response.ts` created with all 6+8 helper functions
- Every API route (85+) refactored to use canonical response envelope
- All error responses use canonical error codes from ERROR_CODES
- Paginated responses use canonical `{ data, meta: { page, pageSize, total, hasMore } }` format
- `npx tsc --noEmit` passes with zero errors
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-A01-SUMMARY.md`
</output>
