---
phase: 35-api-alignment
plan: F02
type: execute
wave: 4
depends_on: ['35-F01']
files_modified:
  - src/shared/api/schemas.ts
  - src/entities/identity/api/schema.ts
  - src/app/api/groups/[...slug]/route.ts
  - src/app/api/platform/tenants/[id]/route.ts
  - src/entities/booking/api/router.ts
  - src/middleware.ts
autonomous: true
requirements:
  - API-SWEEP-01

must_haves:
  truths:
    - 'All schemas are defined in entity-owned locations, not in a monolithic shared file'
    - 'All inline role checks (hasPermission) are replaced with canonical guards'
    - 'Every route now uses the canonical response envelope'
    - 'Error codes follow defined taxonomy'
  artifacts:
    - path: 'src/shared/api/schemas.ts'
      provides: 'Source-of-truth schemas (or re-exports from entity modules)'
    - path: 'src/entities/*/schema.ts'
      provides: 'Entity-owned schema definitions'
  key_links:
    - from: 'src/app/api/*/route.ts'
      to: 'src/shared/api/error-codes.ts'
      via: 'All error responses use canonical error codes'
    - from: 'src/app/api/*/route.ts'
      to: 'src/shared/api/api-response.ts'
      via: 'All responses use apiSuccess/apiError'
---

<objective>
Final compliance sweep: schema ownership, inline role checks, error code adoption, response envelope completeness.

Purpose: Close remaining P1 gaps from the audit — specifically G13 (schema ownership — schemas distributed to domain modules but not re-organized), G14 (inline role checks still exist in some routes), and verify G1/G2/G3/G5 (response envelope + error code adoption) are complete across all files.

This is the final closeout plan for Phase 35. After this, every API in the codebase should be compliant with API.md and API_ARCHITECTURE.md standards.

Output: Full API governance compliance across all route handlers.
</output>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@src/shared/api/schemas.ts
@src/shared/api/error-codes.ts
@src/shared/api/api-response.ts
@src/shared/api/permissions.ts  # if exists, or check @entities/tenant/
@src/app/api/*/route.ts  (all 85+ routes)
@src/middleware.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Schema ownership reorganization and inline role check sweep</name>
<files>src/shared/api/schemas.ts, src/app/api/groups/[...slug]/route.ts, src/app/api/platform/tenants/[id]/route.ts</files>
<action>
**Step 1: Schema ownership re-organization**

Open `src/shared/api/schemas.ts` and identify which schemas belong to which entity domain. For each schema:

- If the entity has a `schema.ts` file (like identity does), MOVE the schema definition there and RE-EXPORT from `src/shared/api/schemas.ts`
- If the entity doesn't have a `schema.ts` yet, leave for now (future entity work will move it)
- If a schema doesn't belong to any specific entity, keep in shared location

Pattern for re-export:

```typescript
// src/shared/api/schemas.ts
export { maintenanceSchema, maintenanceInsertSchema } from '@entities/maintenance/schema';
export { bookingSchema } from '@entities/booking/schema';
// ... keep remaining shared schemas
```

For each entity that already has an `api/` directory but no `schema.ts`, create `src/entities/{domain}/schema.ts` with its relevant schemas.

Update all imports across the codebase that reference these moved schemas via the old path.

**Step 2: Inline role check sweep**

Search for patterns like:

- `hasPermission(` — check if any route handler inlines role checks instead of using guarded procedures
- `expect.xxx('admin')` — string comparisons on roles
- Direct `session.user.role ===` — role comparison outside of middleware/guards

For each instance found in route handlers:

- If the route has a tRPC procedure, use `adminProcedure` or `agentProcedure` instead
- If still REST, wrap with `requireRole()` or `requirePermission()` from canonical auth utilities

Check specifically the identified files:

- `src/app/api/groups/[...slug]/route.ts` — likely has inline role checks for board members
- `src/app/api/platform/tenants/[id]/route.ts` — platform admin checks

Replace with:

```typescript
import { requireRole } from '@entities/tenant/api/permissions';

// Before:
if (session.user.role !== 'admin') {
  return apiError('UNAUTHORIZED', 403, 'Admin access required');
}

// After:
const roleCheck = requireRole(session, ['admin']);
if (!roleCheck.allowed) return apiError(...);
```

Do NOT modify auth middleware or Better Auth handler.
</action>
<verify>
<automated>grep -n "session\.user\.role\s*===" src/app/api/*/route.ts; echo "---"; npx tsc --noEmit 2>&1 | head -10</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Schemas distributed to entity owners (with re-exports). Inline role checks replaced with canonical guards.</done>
</task>

<task type="auto">
<name>Task 2: Response envelope and error code adoption audit</name>
<files>src/app/api/*/route.ts, src/shared/api/schemas.ts</files>
<action>
**Step 1: Automated scan for non-compliant responses**

Run a comprehensive audit across ALL route handler files:

```bash
# Find any NextResponse.json that aren't using canonical helpers
grep -n "NextResponse.json" src/app/api/*/route.ts src/app/api/**/route.ts

# Find any plain { success: true } or { error: } in non-DTO responses
grep -n "return.*{.*success" src/app/api/*/route.ts src/app/api/**/route.ts

# Find any bare error string returns
grep -n "return.*error" src/app/api/*/route.ts src/app/api/**/route.ts

# Find direct Response() constructions (non-canonical)
grep -n "new Response(" src/app/api/*/route.ts src/app/api/**/route.ts
```

For each non-compliant instance found, fix it:

1. Replace `NextResponse.json(data)` with `apiSuccess(data)`
2. Replace `{ error: 'message' }` or `new Response('error', { status })` with `apiError()`
3. Verify error codes match the taxonomy from error-codes.ts

**Step 2: Error code taxonomy verification**

Open `src/shared/api/error-codes.ts` and verify:

- Each error has a unique code (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, etc.)
- Standard HTTP status mapping exists (4xx/5xx)
- All error codes used in route handlers exist in the taxonomy

Add any missing error codes:

```typescript
// src/shared/api/error-codes.ts — add audit-found missing codes
import { type ErrorCode } from './types';

// ... existing error codes, plus any discovered during audit
```

**Do NOT touch the auth handler (`/api/auth/[...all]`) or the tRPC handler (`/api/trpc/[trpc]`).**
</action>
<verify>
<automated>grep -c "apiSuccess\|apiError\|apiCreated" src/app/api/bookings/route.ts src/app/api/maintenance/route.ts src/app/api/events/route.ts src/app/api/content/route.ts src/app/api/groups/route.ts src/app/api/notifications/route.ts src/app/api/users/route.ts</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>All route handlers use canonical response helpers and valid error codes.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. Sweep grep: `grep -rn "NextResponse.json\|new Response\|success: true\|error:" src/app/api/*/route.ts` shows no non-canonical response patterns (except in exempt handlers)
3. All inline role checks replaced
4. `src/shared/api/error-codes.ts` covers all codes used across route handlers
</verification>

<success_criteria>

- Zero inline role checks in route handlers
- All API responses use canonical envelope (apiSuccess, apiError)
- Error codes in use are all present in the taxonomy
- Schemas are entity-owned where the entity exists, re-exported from shared
- `npx tsc --noEmit` passes
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-F02-SUMMARY.md`
</output>
