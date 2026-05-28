---
phase: 35-api-alignment
plan: C02
type: execute
wave: 2
depends_on: ['35-A01']
files_modified:
  - src/shared/api/dto/index.ts
  - src/shared/api/dto/user.ts
  - src/shared/api/dto/maintenance.ts
  - src/shared/api/dto/booking.ts
  - src/shared/api/dto/event.ts
  - src/shared/api/dto/content.ts
  - src/shared/api/dto/group.ts
  - src/shared/api/dto/announcement.ts
  - src/shared/api/dto/resource.ts
  - src/shared/api/dto/invitation.ts
  - src/shared/api/dto/conversation.ts
  - src/shared/api/dto/message.ts
  - src/shared/api/dto/notification.ts
  - src/shared/api/dto/household.ts
  - src/shared/api/dto/property.ts
autonomous: true
requirements:
  - API-DTO-01

must_haves:
  truths:
    - 'Raw ORM entities are never directly returned from API routes'
    - 'Each domain has DTO functions that map DB rows to API-safe shapes'
    - 'DTOs strip internal fields (internal IDs where inappropriate, timestamps for privacy)'
    - 'DTOs flatten nested relations into clean response shapes'
  artifacts:
    - path: 'src/shared/api/dto/'
      provides: 'DTO mapping layer for all entities'
  key_links:
    - from: 'src/shared/api/dto/*.ts'
      to: 'src/app/api/*/route.ts'
      via: 'Route handlers call dto functions before returning responses'
    - from: 'src/shared/api/dto/user.ts'
      to: 'src/db/schema/users.ts'
      via: 'Maps Drizzle user rows to API-safe UserDTO'
---

<objective>
Create a DTO (Data Transfer Object) layer to decouple API responses from raw database entities.

Purpose: API_ARCHITECTURE.md §13 and API.md §15 strictly forbid exposing raw ORM entities. DTOs isolate database evolution, API contracts, mobile stability, and frontend decoupling. Currently many routes return raw Drizzle rows or inline transformations, creating tight coupling between DB schema and API contract.

This plan creates per-domain DTO functions in `src/shared/api/dto/` that map DB rows to API-safe shapes, then updates route handlers to use them.

Output: DTO mapping layer for all entity domains, route handlers using DTOs.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@docs/architecture/API_ARCHITECTURE.md
@src/db/schema/
@src/shared/api/schemas.ts
@src/entities/identity/api/router.ts
@src/app/api/maintenance/route.ts
@src/app/api/bookings/route.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Create the shared DTO directory and core DTOs</name>
<files>src/shared/api/dto/index.ts, src/shared/api/dto/user.ts, src/shared/api/dto/property.ts, src/shared/api/dto/household.ts, src/shared/api/dto/maintenance.ts, src/shared/api/dto/booking.ts, src/shared/api/dto/event.ts, src/shared/api/dto/content.ts, src/shared/api/dto/group.ts, src/shared/api/dto/announcement.ts, src/shared/api/dto/resource.ts, src/shared/api/dto/conversation.ts, src/shared/api/dto/message.ts, src/shared/api/dto/notification.ts, src/shared/api/dto/invitation.ts</files>
<action>
Create the directory `src/shared/api/dto/` and implement per-domain DTO files.

Each DTO file exports:

1. **TypeScript interfaces** for the API-safe shapes (suffixed with `DTO`)
2. **Mapper functions** that convert DB rows to DTO shapes

**Pattern for every DTO file:**

```typescript
// src/shared/api/dto/user.ts
import type { InferSelectModel } from 'drizzle-orm';
import { users } from '@api/db';

// API-safe user shape — never exposes internal fields
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  profileSlug: string | null;
  isPublic: boolean;
  createdAt: string;
}

// Maps a Drizzle user row to UserDTO
export function toUserDTO(user: InferSelectModel<typeof users>): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.image || null,
    role: user.role,
    profileSlug: user.profileSlug || null,
    isPublic: user.isPublic,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle user rows
export function toUserDTOs(users: InferSelectModel<typeof users>[]): UserDTO[] {
  return users.map(toUserDTO);
}
```

Fields to STRIP from DTO (not exposed to clients):

- Internal IDs not useful to clients
- `emailVerified`, `twoFactorEnabled`, `isActive` (security)
- `showEmail`, `showPhone` (privacy — use UserSettingsDTO instead)
- `dashboardLayout` (internal state)
- `tenantId` — only needed for server-side enforcement, not client

**Create these DTO files:**

| File            | Entity              | Key DTO                                      | Notable Stripped Fields                                                                    |
| --------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| user.ts         | users               | UserDTO, UserSummaryDTO                      | emailVerified, twoFactorEnabled, isActive, showEmail, showPhone, dashboardLayout, tenantId |
| property.ts     | properties          | PropertyDTO, PropertySummaryDTO              | tenantId (internal only)                                                                   |
| household.ts    | households          | HouseholdDTO, HouseholdProfileDTO            | tenantId                                                                                   |
| maintenance.ts  | maintenanceRequests | MaintenanceRequestDTO, MaintenanceSummaryDTO | tenantId                                                                                   |
| booking.ts      | bookings            | BookingDTO                                   | tenantId                                                                                   |
| event.ts        | events              | EventDTO, PublicEventDTO                     | tenantId                                                                                   |
| content.ts      | contents            | ContentDTO, PublicContentDTO                 | tenantId                                                                                   |
| group.ts        | groups              | GroupDTO, GroupDetailDTO                     | tenantId                                                                                   |
| announcement.ts | announcements       | AnnouncementDTO                              | tenantId                                                                                   |
| resource.ts     | resources           | ResourceDTO                                  | tenantId                                                                                   |
| conversation.ts | conversations       | ConversationDTO                              | tenantId                                                                                   |
| message.ts      | messages            | MessageDTO                                   | tenantId                                                                                   |
| notification.ts | notifications       | NotificationDTO                              | tenantId (internal)                                                                        |
| invitation.ts   | invitations         | InvitationDTO                                | tenantId                                                                                   |

**`src/shared/api/dto/index.ts`** re-exports everything:

```typescript
export * from './user';
export * from './property';
export * from './household';
export * from './maintenance';
export * from './booking';
export * from './event';
export * from './content';
export * from './group';
export * from './announcement';
export * from './resource';
export * from './conversation';
export * from './message';
export * from './notification';
export * from './invitation';
```

Implementation approach for each DTO:

1. Read the corresponding Drizzle schema file at `src/db/schema/{table}.ts`
2. Read at least one existing route handler that uses this entity to understand what fields are currently returned
3. Create DTO that covers the fields actually used by clients plus any that are appropriate
4. Strip internal fields per the guidelines above

Test each DTO file:

```typescript
// src/test/dto/user.test.ts
import { describe, it, expect } from 'vitest';
import { toUserDTO } from '@shared/api/dto/user';

describe('UserDTO', () => {
  it('strips internal fields', () => {
    const result = toUserDTO(mockUserRow);
    expect(result).not.toHaveProperty('emailVerified');
    expect(result).not.toHaveProperty('twoFactorEnabled');
    expect(result).not.toHaveProperty('isActive');
  });
});
```

Create test files for at least the 5 most commonly used DTOs (user, maintenance, booking, event, content).
</action>
<verify>
<automated>find src/shared/api/dto -name '\*.ts' | wc -l | xargs echo "DTO files:"; npx tsc --noEmit 2>&1 | head -10</automated>
<manual>Verify each DTO file exports at least one mapper function and one type interface</manual>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>DTO directory created with 14+ domain files. All compile without errors.</done>
</task>

<task type="auto">
<name>Task 2: Update identity router and 3 key REST routes to use DTOs</name>
<files>src/entities/identity/api/router.ts, src/app/api/users/route.ts, src/app/api/maintenance/route.ts, src/app/api/bookings/route.ts</files>
<action>
Update 4 key route handlers to use DTO mapping functions from the new DTO layer.

**1. Identity router (`src/entities/identity/api/router.ts`):**

- Import `{ toUserDTO }` from `@shared/api/dto/user`
- Replace raw object construction in listProperties return with DTO mapping:
  - The properties output already has structured Zod schemas — update the data transformation to call `toPropertyDTO()` where appropriate
  - The profiles return: use `toProfileDTO()` from household.ts DTO
  - The users return: use `toUserDTO()` from user.ts DTO

**2. Users route (`src/app/api/users/route.ts`):**

- Import `{ toUserDTO, toUserDTOs }` from `@shared/api/dto/user`
- Replace the map construction in the GET handler response: instead of constructing raw user objects, pass through `toUserDTO()` mapping
- The response currently returns: `{ users: usersWithRelations, total, page, limit }` — wrap individual user rows through `toUserDTO()`

**3. Maintenance route (`src/app/api/maintenance/route.ts`):**

- Import `{ toMaintenanceRequestDTO }` from `@shared/api/dto/maintenance`
- Replace the manual `transformed` map with DTO calls

**4. Bookings route (`src/app/api/bookings/route.ts`):**

- Import `{ toBookingDTO }` from `@shared/api/dto/booking`
- Replace the manual `transformed` map with DTO calls

For each file, the pattern is:

```typescript
// Before
const transformed = results.map(row => ({
  id: row.id,
  userId: row.userId,
  // ... 20 lines of manual mapping
}));

// After
const transformed = results.map(row => toMaintenanceRequestDTO(row));
```

Do NOT change business logic, filtering, or pagination. Only change how the data is shaped for the response.

After updating each file, run `npx tsc --noEmit` to verify compilation.
</action>
<verify>
<automated>grep -c "toUserDTO\|toMaintenanceRequestDTO\|toBookingDTO" src/app/api/users/route.ts src/app/api/maintenance/route.ts src/app/api/bookings/route.ts src/entities/identity/api/router.ts; npx tsc --noEmit 2>&1 | head -10</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Identity router, users, maintenance, and bookings routes use DTO mapping functions.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. DTO functions exist for all major entity types
3. Key routes use DTOs instead of manual mapping
4. DTO test file(s) pass with `npx vitest run`
5. Grep for `@api/db` imports in route files — should still exist (DTOs are mappers, not replacements)
</verification>

<success_criteria>

- `src/shared/api/dto/` directory with 14+ domain DTO files
- Each DTO file exports types and mapper functions
- Identity router, users, maintenance, bookings routes use DTOs
- Test files for top DTOs
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-C02-SUMMARY.md`
</output>
