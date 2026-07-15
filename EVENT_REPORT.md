# Events System Review

> **Date:** 2026-07-15
> **Scope:** All event-related code across DB schema, API routes, tRPC routers, entities, features, widgets, DTOs, and tests.
> **Status:** Verified against codebase 2026-07-15. Corrections applied.

## Verification Corrections

The following corrections were made after checking every claim against the source code:

| Issue       | Change                                                                      | Reason                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | "Three conflicting schemas" → "Two conflicting schemas + tRPC input"        | tRPC `CreateEventInput` actually **matches** the DB model (uses `date`, not `startDate`/`endDate`). It's a third schema but NOT conflicting — just redundant with `adminEventSchema`.                |
| 5           | Added tRPC `createEvent` as second location                                 | Original report only cited REST handler. tRPC `createEvent` at line 188 also emits `event.rsvp` — same bug in both paths.                                                                            |
| 7 (new)     | **Added: Re-registration after cancellation is impossible**                 | MISSED in original report. Unique constraint `@@unique([eventId, userId])` includes soft-deleted rows. Registration check doesn't filter `deletedAt IS NULL`. Cancelled users can never re-register. |
| 8 (new)     | **Added: REST unregister missing tenant isolation**                         | MISSED in original report. REST DELETE at line 106 doesn't call `withTenant()` and WHERE clause lacks `tenantId` filter. tRPC version is correct.                                                    |
| 9           | Added detail: tRPC handler never passes `category` to service               | Verified `listEvents` call (line 134) omits `input.category` — the param is accepted but never forwarded.                                                                                            |
| 13 (was 11) | "No icon library is imported" → "Font Awesome loaded via CDN"               | `src/app/layout.tsx` line 74 loads Font Awesome 6.4.0 via cdnjs `<link>` tag. Icons render correctly but create an external CDN dependency across 69 usages in 12 admin widget files.                |
| 17 (was 15) | Softened from "Fix: Rename to User" → "Investigate Better Auth conventions" | `user` is a Better Auth managed table. Drizzle `pgTable('user', ...)` matches. Renaming risks breaking auth flows. Defer to Better Auth upgrade.                                                     |

---

## What's Working Well

1. **Tenant isolation** — All event queries correctly filter by `tenantId` via `withTenant()`
2. **Soft deletes** — `deletedAt` field + `notDeleted()` helper prevents deleted events from surfacing
3. **Dual API surface** — Both REST (`/api/events`) and tRPC (`community/events`) exist with consistent permission checks
4. **Registration system** — `EventAttendee` join table with unique constraint on `(eventId, userId)` prevents duplicates
5. **Tests** — Solid test coverage across API routes, DTOs, entity schema, and entity services
6. **Revalidation** — Content caches are properly invalidated on create/update/delete

---

## Critical Issues

### 1. Schema Mismatch: `eventSchema` vs `adminEventSchema` vs DB Model

**Location:** `src/entities/event/schema.ts`

There are **two conflicting event schemas** plus a third input schema in tRPC:

- `eventSchema` (line 12) uses `startDate`/`endDate` with datetime format, plus `maxAttendees` and `requiresRegistration` — none of these fields exist in the DB `Event` model, which has a single `date` field
- `adminEventSchema` (line 41) uses `date` (single) — matches the DB model correctly
- The tRPC router (`src/server/routers/community/events.ts` line 45-53) uses its own `CreateEventInput`/`UpdateEventInput` — these also match the DB model (uses `date`, not `startDate`/`endDate`), but with looser validation (no regex on date format)

**Impact:** The `eventSchema` tests pass against data the DB can never store. The `startDate`/`endDate`/`maxAttendees`/`requiresRegistration` pattern is dead code that misleads developers into thinking these fields exist.

**Fix:** Remove `eventSchema` entirely. It was likely created for a different event concept (e.g., multi-day activities) and never reconciled with the canonical DB model. Consolidate `adminEventSchema` and the tRPC `CreateEventInput` into a single shared schema in `@entities/event`.

---

### 2. Public Events Endpoint Is Broken

**Location:** `src/app/api/v1/public/events/route.ts`

```ts
export { GET } from '@/app/api/events/route';
```

This re-exports the authenticated GET handler. It returns 401 without a session. The `publicEventDto` exists in the DTO layer (`src/shared/api/dto/event.ts` line 27) but is **never used in any API route**.

**Impact:** Unauthenticated users (search engines, public pages, newsletter embeds) cannot access events. The `isPublic` field on the Event model has no effect because the gate is auth, not the flag.

**Fix:** Create a dedicated unauthenticated GET handler for `/api/v1/public/events` that:

- Skips auth checks
- Filters `isPublic = true`
- Returns `publicEventDto` (strips `tenantId`, `isPublic`, `createdAt`, `updatedAt`)

---

### 3. Duplicate `useUpcomingEvents` Hooks — Cache Collision

**Two versions exist:**

| File                                             | Typed                  | Stale Time | Import Path         |
| ------------------------------------------------ | ---------------------- | ---------- | ------------------- |
| `src/features/events/model/useUpcomingEvents.ts` | Yes, `UpcomingEvent[]` | 60s        | `@features/events`  |
| `src/shared/lib/hooks/useUpcomingEvents.ts`      | No, raw JSON           | 30s        | `@shared/lib/hooks` |

Both use the same query key `['events', 'upcoming']`. The dashboard widget (`EventsWidget.tsx`) imports the **untyped** version from `@shared/lib/hooks`. The feature version is exported but unused.

**Impact:** TanStack Query treats these as the same cache. Whichever hook mounts last overwrites the other's data shape, causing type errors or `undefined` fields in the UI.

**Fix:** Keep only the typed version in `@features/events`. Remove the shared hook. Update `EventsWidget.tsx` to import from `@features/events`.

---

### 4. Admin `EventList` Component Doesn't Authenticate

**Location:** `src/widgets/admin/ui/EventList.tsx` line 25

```ts
fetch('/api/events')
  .then(res => res.json())
  .then(data => { setEvents(data); ... });
```

**Issues:**

- No auth token or session check — the API requires authentication and returns 401
- Doesn't handle the API envelope format `{ success: true, data: [...] }` — assumes `data` is the array directly
- Silent failure: errors only set `loading = false`, leaving the table blank with no message

**Fix:** Use TanStack Query with proper auth context, or switch to the tRPC client. Handle the envelope response shape.

---

### 5. `emitEvent('event.rsvp', ...)` on Event Creation Is Semantically Wrong

**Locations:**

- `src/app/api/events/route.ts` line 186-190 (REST POST create handler)
- `src/server/routers/community/events.ts` line 188-192 (tRPC `createEvent` mutation)

```ts
emitEvent('event.rsvp', {
  tenantId,
  userId: authData.userId,
  eventId: event.id,
});
```

This fires an `event.rsvp` event when an admin **creates** an event — in both the REST and tRPC create handlers. The same `emitEvent('event.rsvp', ...)` is correctly used in the tRPC `registerForEvent` mutation (`src/server/routers/community/events.ts` line 328) for the actual RSVP action.

**Impact:** Achievement systems and notification pipelines listening for `event.rsvp` will incorrectly trigger when events are created, not when users register. This inflates event-related achievements (e.g., "Event Goer", "Event Enthusiast" badges keyed on `event.rsvp` eventType in the seed data).

**Fix:** Both create handlers should either:

- Remove the `emitEvent` call entirely (creation ≠ registration), or
- Emit `event.created` instead, and ensure the achievement system recognizes the distinction

---

### 6. Registration Cancellation Uses UPDATE With Fragile Destructuring

**Locations:**

- `src/server/routers/community/events.ts` line 350-360 (tRPC `cancelRegistration`)
- `src/app/api/events/[id]/register/route.ts` line 103-107 (REST DELETE)

Both use:

```ts
const [deleted] = await db.update(eventAttendees)
  .set({ deletedAt: now() })
  .where(...)
  .returning();
```

**Issue:** When zero rows match (user wasn't registered), `.returning()` returns `[]`. The destructuring `const [deleted] = []` produces `undefined`. The subsequent check `if (!deleted)` returns 404 — which is correct — but relying on undefined from an empty array is fragile. Drizzle's behavior may differ between PostgreSQL driver versions.

**Fix:** Use `db.delete(eventAttendees).where(...).returning()` for the unregister action, or explicitly check `deleted != null` before accessing properties.

---

### 7. Re-Registration After Cancellation Is Impossible (P0 — MISSED IN ORIGINAL REPORT)

**Locations:**

- `prisma/schema/schema.prisma` line 989: `@@unique([eventId, userId])`
- `src/db/schema/event-attendees.ts`: no partial unique index on `deletedAt IS NULL`
- `src/app/api/events/[id]/register/route.ts` line 67-71 (REST POST)
- `src/server/routers/community/events.ts` line 308-312 (tRPC `registerForEvent`)

The `EventAttendee` table has a unique constraint on `(eventId, userId)` that does NOT exclude soft-deleted rows. Both registration handlers check for an existing row **without** filtering `deletedAt IS NULL`:

```ts
const [existing] = await db
  .select({ id: eventAttendees.id })
  .from(eventAttendees)
  .where(and(eq(eventAttendees.eventId, id), eq(eventAttendees.userId, userId)))
  .limit(1);
```

**Impact:** When a user cancels registration (soft-delete sets `deletedAt = now()`), the row remains in the table. If they try to re-register, the SELECT finds the soft-deleted row and returns "Already registered" (409). Re-registration is permanently blocked until an admin manually hard-deletes the row or clears `deletedAt`.

**Fix (two options):**

1. **Preferred:** Change cancellation to hard-delete: `db.delete(eventAttendees).where(...)` instead of `db.update(...).set({ deletedAt: now() })`. This removes the row entirely, allowing re-registration.
2. **Alternative:** Add a partial unique index and update the SELECT to filter `deletedAt IS NULL`: `where(and(eq(...), eq(...), isNull(eventAttendees.deletedAt)))`. Also use `ON CONFLICT ... WHERE deletedAt IS NULL` for the insert.

---

### 8. REST Unregister Endpoint Missing Tenant Isolation (P0 — MISSED IN ORIGINAL REPORT)

**Location:** `src/app/api/events/[id]/register/route.ts` line 94-107 (REST DELETE)

```ts
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const userId = session.user.id;

    const [deleted] = await db
      .update(eventAttendees)
      .set({ deletedAt: now() })
      .where(and(eq(eventAttendees.eventId, id), eq(eventAttendees.userId, userId)))
      // ← NO tenantId filter
      .returning();
```

The DELETE handler does **not** call `withTenant()` and the WHERE clause does **not** filter by `tenantId`. Compare with the tRPC `cancelRegistration` at line 353-357 which correctly filters by `eq(eventAttendees.tenantId, tenantId)`.

**Impact:** A malicious user could potentially soft-delete an EventAttendee row in a different tenant by crafting requests with different event IDs. Since `eventId` is the only scoping field and event IDs are UUIDs, the risk is low but it violates the tenant isolation principle.

**Fix:** Call `withTenant()` and add `eq(eventAttendees.tenantId, tenantId)` to the WHERE clause.

---

### 9. No Event Categories/Tags Implemented

The tRPC `ListEventsInput` (line 39) accepts a `category` param:

```ts
category: z.string().optional(),
```

But neither the DB schema nor the service layer implements category filtering. The tRPC `listEvents` query (line 134) never passes `category` to the `listEvents` service function. Events can't be categorized (yoga, meetings, social, etc.).

**Fix:** Add `category` column to the `Event` model, pass `input.category` through in the tRPC handler, and implement filtering in `listEvents()`.

---

### 10. No Max Attendees Enforcement

The `eventSchema` has a `maxAttendees` field but the actual DB `Event` model has no capacity column. The registration system never checks capacity limits.

**Fix:** Add `maxAttendees integer` to the DB schema and check `count(attendees) < event.maxAttendees` before inserting in `registerForEvent`.

---

### 11. No Recurring Events Support

Events are single-point-in-time. There's no support for recurring events (weekly yoga, monthly meetings) — a core need for community platforms.

**Fix (phased):**

1. Add `recurrenceRule` text field (iCal RRULE format)
2. Add a view or materialized query that expands recurring events for calendar displays
3. Future: generate `Event` instances from recurrence rules on a schedule

---

### 12. Missing Composite Indexes on Hot Query Patterns

The Prisma schema has `@@index([date])` on `Event` but queries frequently filter by `tenantId + date` combined. A composite index would help. Similarly, `EventAttendee` is queried by `(eventId, userId)` for registration checks but only has individual indexes.

**Fix:**

```sql
-- In Prisma migration
@@index([tenantId, date])
@@index([eventId, userId])  -- covers the unique constraint lookup
```

---

## Minor Issues

### 13. `EventList` Uses Font Awesome via CDN Dependency

Uses `<i className="fas fa-edit">` and `<i className="fas fa-trash">` (lines 98, 120). Font Awesome is loaded globally via CDN link tag in `src/app/layout.tsx` line 74:

```tsx
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
  rel="stylesheet"
/>
```

**Impact:** The icons render correctly but the entire admin widget ecosystem (69 occurrences across 12 files) depends on an external CDN being available. If the CDN is blocked (offline, firewall, China), all admin icons break silently. This is inconsistent with the rest of the app which uses `lucide-react` as bundled icons.

**Fix:** Replace Font Awesome `<i>` tags with `lucide-react` icons (already used in `EventsWidget.tsx` dashboard, `EventAttendance.tsx`, and `EventForm.tsx`). This eliminates the CDN dependency and reduces layout shift.

---

### 14. `formatForDatePicker` Loses Timezone Info

**Location:** `src/widgets/admin/ui/EventForm.tsx` line 27-36

```ts
return d.toISOString().slice(0, 10);
```

`toISOString()` converts to UTC. A user in South Africa (UTC+2) viewing `2026-07-15T23:00` will see `2026-07-15T21:00:00.000Z` → slices to `2026-07-15`. This works for date-only inputs but will show the **wrong date** for events near midnight in different timezones.

**Fix:** Use local date slicing: `d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())`.

---

### 15. `EventAttendance` Component Uses Raw `fetch`

**Location:** `src/features/events/ui/EventAttendance.tsx`

Uses raw `fetch` with `useEffect` instead of TanStack Query. This bypasses the shared cache, meaning the dashboard widget and this component can show different attendee counts simultaneously.

**Fix:** Replace with TanStack Query using the same query key pattern as other event hooks.

---

### 16. `DisputeEventType` Enum Mixes Concerns

**Location:** `src/db/schema/dispute-event-type-enum.ts`

The enum has 15 values including `NOTE_ADDED`, `EVIDENCE_ADDED` — these are audit-log events, not dispute lifecycle transitions. Mixing event-sourcing audit events with status transitions in one enum is confusing and makes it hard to query "show me all status changes" vs "show me all notes".

**Fix:** Split into two enums:

- `DisputeStatusTransition`: `CREATED`, `SUBMITTED`, `ASSIGNED`, `MEDIATION_OFFERED`, `RULING_ISSUED`, `RESOLVED`, `WITHDRAWN`, `ESCALATED_CSOS`, `CSOS_CLOSED`, `STATUS_CHANGED`
- `DisputeAuditEvent`: `NOTE_ADDED`, `EVIDENCE_ADDED`

---

### 17. Prisma Model Uses Lowercase `user` (Better Auth Convention)

**Location:** `prisma/schema/schema.prisma` line 96

```prisma
model user {
```

Inconsistent with the rest of the codebase which uses `User`/`users`.

**Context:** The API does not endorse renaming this model. Drizzle uses `pgTable('user', ...)` in `src/db/schema/users.ts` which matches. Use existing `users` (Drizzle) for queries.

**Action:** Investigate Better Auth's current schema conventions and whether newer versions standardize on PascalCase. No schema rename — coordinate with any future Better Auth upgrade. Optionally document ADR-NNN accepting this deviation.

---

## Summary Matrix

| #   | Severity | Issue                                                | Effort |
| --- | -------- | ---------------------------------------------------- | ------ |
| 1   | **P0**   | `eventSchema` dead code conflicts with DB model      | Low    |
| 2   | **P0**   | Public events endpoint always returns 401            | Medium |
| 3   | **P1**   | Duplicate hooks cause cache collision                | Low    |
| 4   | **P1**   | Admin `EventList` doesn't handle API envelope shape  | Low    |
| 5   | **P1**   | Wrong `emitEvent` on creation (both REST & tRPC)     | Low    |
| 6   | **P1**   | Fragile undefined from empty array destructuring     | Low    |
| 7   | **P0**   | Re-registration after cancellation is blocked        | Low    |
| 8   | **P0**   | REST unregister missing tenant isolation             | Low    |
| 9   | **P2**   | Category param accepted but not implemented          | Medium |
| 10  | **P2**   | No max attendees enforcement                         | Medium |
| 11  | **P3**   | No recurring events                                  | High   |
| 12  | **P2**   | Missing composite indexes                            | Low    |
| 13  | **P3**   | Font Awesome CDN dependency (icons work but fragile) | Low    |
| 14  | **P3**   | Timezone-aware date formatting                       | Low    |
| 15  | **P3**   | Raw fetch bypasses cache                             | Low    |
| 16  | **P3**   | Mixed concern in `DisputeEventType` enum             | Medium |
| 17  | **P3**   | Lowercase `user` model (Better Auth convention)      | Low    |

---

## Recommended Action Order

1. **P0-7:** Fix re-registration — change unregister to hard-delete or filter `deletedAt IS NULL` in registration check
2. **P0-8:** Add `tenantId` filter to REST unregister DELETE handler
3. **P0-1:** Remove `eventSchema` — eliminates confusion, zero risk
4. **P0-2:** Create public events endpoint — unlocks external event discovery
5. **P1-3:** Consolidate `useUpcomingEvents` — prevents runtime cache corruption
6. **P1-4:** Fix `EventList` response parsing — admin UI becomes usable
7. **P1-5:** Fix `emitEvent` on creation (both handlers) — stops incorrect achievement triggers
8. **P1-6:** Harden unregister destructuring — prevents edge-case crashes
9. **P2-9, P2-10, P2-12:** Add category, maxAttendees, composite indexes — schema evolution
10. **P3:** Address minor issues iteratively
