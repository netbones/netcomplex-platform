---
phase: 35-api-alignment
plan: E01
type: execute
wave: 3
depends_on: ['35-C01', '35-C02']
files_modified:
  - src/entities/booking/api/route.ts
  - src/entities/booking/dto/index.ts
  - src/entities/booking/services/index.ts
  - src/entities/booking/permissions/index.ts
  - src/entities/maintenance/api/route.ts
  - src/entities/maintenance/dto/index.ts
  - src/entities/maintenance/services/index.ts
  - src/entities/maintenance/permissions/index.ts
  - src/entities/events/api/route.ts
  - src/entities/events/dto/index.ts
  - src/entities/events/services/index.ts
  - src/entities/content/api/route.ts
  - src/entities/content/dto/index.ts
  - src/entities/content/services/index.ts
  - src/app/api/bookings/route.ts
  - src/app/api/maintenance/route.ts
  - src/app/api/events/route.ts
  - src/app/api/content/route.ts
autonomous: true
requirements:
  - API-MOD-01

must_haves:
  truths:
    - 'Each entity module follows the canonical structure: api/, dto/, services/, permissions/'
    - 'Business logic is extracted from route handlers into services/'
    - 'Existing REST routes delegate to entity services'
  artifacts:
    - path: 'src/entities/{domain}/services/'
      provides: 'Business logic extracted from route handlers'
    - path: 'src/entities/{domain}/permissions/'
      provides: 'Module-specific permission rules'
  key_links:
    - from: 'src/entities/{domain}/api/route.ts'
      to: 'src/entities/{domain}/services/'
      via: 'Route handlers call service functions'
    - from: 'src/app/api/{domain}/route.ts'
      to: 'src/entities/{domain}/api/'
      via: 'Flat REST routes delegate to entity API layer'
---

<objective>
Roll out the canonical module ownership model across all entity domains.

Purpose: API_ARCHITECTURE.md §11 and API.md §19 require every module to own its own api/, schemas/, dto/, permissions/, services/, openapi/, and tests/ directories. Currently only `tenant` and `identity` entities have api/ subdirectories. Business logic is mixed into route handlers — it should be in services/.

This plan establishes the canonical module structure for the 4 core entities (booking, maintenance, events, content) as a template that all other entities should follow.

Output: Canonical module structure for 4 core entities, business logic extracted from route handlers into services/.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@docs/architecture/API_ARCHITECTURE.md
@src/entities/tenant/api/
@src/entities/booking/
@src/entities/maintenance/
@src/entities/events/  # if not exists, check src/app/api/events or entity path
@src/app/api/bookings/route.ts
@src/app/api/maintenance/route.ts
@src/app/api/events/route.ts
@src/app/api/content/route.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Establish canonical module structure for 4 core entities</name>
<files>src/entities/booking/api/route.ts, src/entities/booking/dto/index.ts, src/entities/booking/services/index.ts, src/entities/booking/permissions/index.ts, src/entities/maintenance/api/route.ts, src/entities/maintenance/dto/index.ts, src/entities/maintenance/services/index.ts, src/entities/maintenance/permissions/index.ts, src/entities/events/api/route.ts, src/entities/events/dto/index.ts, src/entities/events/services/index.ts, src/entities/events/permissions/index.ts, src/entities/content/api/route.ts, src/entities/content/dto/index.ts, src/entities/content/services/index.ts, src/entities/content/permissions/index.ts</files>
<action>
For each of the 4 core entities (booking, maintenance, events, content), create the canonical module structure:

```
src/entities/{domain}/
├── api/
│   └── route.ts      (entity-specific API logic — route handler delegates here)
├── dto/
│   └── index.ts      (DTO types and mappers — or re-export from shared DTOs)
├── services/
│   └── index.ts      (business logic extracted from route handlers)
├── permissions/
│   └── index.ts      (entity-specific permission rules, if needed)
└── tests/
    └── index.ts      (entity-specific tests)
```

**For each entity, the approach is:**

1. **Create `services/index.ts`** — Extract business logic from existing route handlers:
   - For `booking`: Extract `getTenantFacilities()`, `validateFacility()`, booking conflict checking logic
   - For `maintenance`: Extract the query building logic, status transition validation
   - For `events`: Extract event date validation, registration logic
   - For `content`: Extract content filtering, scheduling logic

   Each service file exports functions that take Drizzle `db` and return/process data. They should NOT import `NextResponse` or construct HTTP responses — that's the route handler's job.

   Example pattern for `booking/services/index.ts`:

   ```typescript
   import { db, bookings, settings } from '@api/db';
   import { eq, and, gte } from 'drizzle-orm';
   import type { TenantFacility } from '@entities/booking';

   export async function getTenantFacilities(tenantId: string): Promise<TenantFacility[]> {
     const result = await db
       .select()
       .from(settings)
       .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'booking_facilities')))
       .limit(1);
     // ... parse and return
   }
   ```

2. **Create `dto/index.ts`** — Either re-export from `@shared/api/dto/{domain}` or create entity-specific DTOs:

   ```typescript
   export { toBookingDTO } from '@shared/api/dto/booking';
   ```

3. **Create `api/route.ts`** — Entity-specific API logic:

   ```typescript
   import { db } from '@api/db';
   import * as bookingService from '../services';

   export async function listBookings(tenantId: string, filters: { ... }) {
     // ... call bookingService helpers, return data
   }
   ```

4. **Create `permissions/index.ts`** — Entity-specific permission rules:
   ```typescript
   // Only needs to exist if the entity has unique permission rules
   // beyond what hasPermission() provides
   ```

**Important:** The existing flat route handlers (`src/app/api/bookings/route.ts`, etc.) should be updated to import from these service files rather than having inline logic. But this is internal refactoring — the route handler signatures and responses must NOT change.

For entities where the existing `src/entities/{domain}/` already has files (like booking's model/ and ui/), add the new directories alongside existing ones. Do NOT delete anything.
</action>
<verify>
<automated>for dir in booking maintenance events content; do test -d "src/entities/$dir/services" && echo "$dir/services OK"; done; npx tsc --noEmit 2>&1 | head -10</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Canonical module structure (api/, dto/, services/, permissions/) created for booking, maintenance, events, content.</done>
</task>

<task type="auto">
<name>Task 2: Refactor flat route handlers to use entity services</name>
<files>src/app/api/bookings/route.ts, src/app/api/maintenance/route.ts, src/app/api/events/route.ts, src/app/api/content/route.ts</files>
<action>
Update the flat REST route handlers to delegate business logic to the new entity service layer.

For each route handler:

1. **Identify extractable logic** — Look at the handler and find:
   - Database query building logic (conditions, filters)
   - Data transformation/mapping (move to DTOs)
   - Business rules (validate facility, check conflicts)
   - Side effects (revalidation, notifications)

2. **Move to service** — Add functions to the corresponding `services/index.ts` file

3. **Import in route handler** — Replace inline logic with service function calls

Example for `src/app/api/bookings/route.ts`:

```typescript
// Before:
import { db, bookings, users, settings } from '@api/db';
// ... 30 lines of settings parsing

// After:
import { getTenantFacilities } from '@entities/booking/services';
// ... 1 line: const facilities = await getTenantFacilities(tenantId);
```

The route handler should become a thin orchestrator:

- Parse request (params, body, headers)
- Auth/tenant checks
- Call service functions for business logic
- Return response via canonical helpers (apiSuccess, apiCreated)

Do NOT rename exports — keep `GET`, `POST`, etc. function names. Do NOT change response shapes. The response envelope standardization was already done in Phase A.

**Do this for 4 route handler files:** bookings, maintenance, events, content.
</action>
<verify>
<automated>grep -c "from '@entities/\(booking\|maintenance\|events\|content\)/services" src/app/api/bookings/route.ts src/app/api/maintenance/route.ts src/app/api/events/route.ts src/app/api/content/route.ts; npx tsc --noEmit 2>&1 | head -10</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Flat route handlers delegate business logic to entity services. All response shapes unchanged.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. `curl /api/bookings` returns same data as before (backward compat)
3. Grep for non-trivial SQL query building in route handlers — should be reduced
4. Entity services are importable and callable without HTTP dependencies
</verification>

<success_criteria>

- 4 core entities follow canonical module structure (api/, dto/, services/, permissions/)
- Business logic extracted from route handlers into services/
- All existing API responses unchanged
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-E01-SUMMARY.md`
</output>
