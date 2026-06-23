# Phase 102: Achievements System - Research

**Researched:** 2026-06-23
**Domain:** Cross-cutting achievements engine — event-driven unlock system
**Confidence:** HIGH

## Summary

Phase 102 delivers the Achievements System scoped from ADVISORY-013 Phases B–D. Phase A (event emitter) is already shipped at `src/shared/api/events/emitter.ts` — a typed, in-process, fire-and-forget emitter wired into 6 domain routes. The remaining work adds 4 Prisma models, an achievement event listener service, resident/admin APIs, and dashboard + directory widgets.

This is a **pure internal infrastructure phase** — no new npm packages, no external services, no new frameworks. The entire stack is: existing Prisma + Drizzle ORM, existing event emitter, existing widget registry, existing Notification model, existing admin API conventions. The PlatformModule/TenantModule pattern is the exact template for AchievementDefinition/TenantAchievement.

**Primary recommendation:** Build the 4 models + listener service + 2 APIs + 2 widgets in 3 plans (schema+service, API+admin, widgets). All decisions are locked from CONTEXT.md — no alternatives to evaluate.

## Architectural Responsibility Map

| Capability                       | Primary Tier       | Secondary Tier | Rationale                                                     |
| -------------------------------- | ------------------ | -------------- | ------------------------------------------------------------- |
| Achievement definitions catalog  | Database / Storage | —              | Platform-wide catalog, DB-backed for admin editability        |
| Tenant achievement config        | Database / Storage | —              | Per-tenant enable/configure join table                        |
| Event emission                   | API / Backend      | —              | Post-commit fire-and-forget in mutation routes (Phase A done) |
| Progress tracking & unlock logic | API / Backend      | —              | Event listener upserts counters, checks thresholds            |
| Resident achievement display     | Browser / Client   | —              | Badge grid widget, profile section                            |
| Admin achievement config         | Browser / Client   | API / Backend  | Admin UI + API for toggle/threshold/icon management           |

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create-only mutations emit events for v1 (no status changes, no deletes)
- **D-02:** 6 domains wired: bookings, maintenance, events, content, groups, competitions
- **D-03:** Event types: `booking.created`, `maintenance.created`, `event.attendee.added`, `content.created`, `group.member.added`, `competition.entry.created`
- **D-04:** Standard catalog — 12 achievements (6 one-shot + 6 cumulative)
- **D-05:** One-shot: `first_booking`, `first_maintenance`, `first_event_rsvp`, `first_post`, `first_group_join`, `first_competition_entry`
- **D-06:** Cumulative: `maintenance_5` (threshold 5), `maintenance_10` (10), `event_attendee_5` (5), `event_attendee_10` (10), `content_creator_5` (5), `bookings_3` (3)
- **D-07:** Dashboard widget: badge grid — locked (gray/muted), unlocked (colored with icon). Hover tooltip shows name + unlock date.
- **D-08:** Directory profile: separate "Achievements" section in profile detail view with full badge grid. No changes to directory listing cards.
- **D-09:** Widget registered via `widgets.ts` convention, assigned to `home` space. Navigation Governance compliant — no new page, no header changes.
- **D-10:** Full customization per tenant: enable/disable toggle, custom threshold override, icon upload, category management
- **D-11:** Disabling hides achievement from discovery but preserves historical `UserAchievement` rows
- **D-12:** Admin UI mirrors `PageSettingsWidget` pattern for catalog management
- **D-13:** Always-on module, not gated through `canAccess()` (G2)
- **D-14:** In-process event emitter, fire-and-forget, post-commit (G1)
- **D-15:** Merits as trigger source deferred — 6 domains only for v1 (G3)
- **D-16:** Forward-only counting, no backfill (G4)

### agent's Discretion

- Achievement category enum values: ENGAGEMENT, CONTRIBUTION, MILESTONE (from ADVISORY-013)
- Icon storage: text field (URL or emoji) for v1; file upload can be added later if needed
- Notification on unlock: reuse existing Notification model, optional per achievement definition

### Deferred Ideas (OUT OF SCOPE)

- Merits as achievement trigger source (G3 = deferred) — future phase will read BehaviorRecord.recognitionPoints
- Retroactive backfill for existing users (G4 = forward-only) — if demand exists, a future phase can add a backfill script
- Status-change events (cancelled bookings, resolved maintenance) — richer achievement types for v2
- Achievement sharing to chat — social feature for future consideration
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID             | Description                                                                                                             | Research Support                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ADVISORY-013-B | Schema + achievement service — 4 Prisma models, Drizzle tables, event listener, seed catalog                            | Models defined in ADVISORY-013 §4; listener pattern uses existing `onEvent()` from emitter.ts; seed follows existing seed patterns  |
| ADVISORY-013-C | API + admin configuration — resident API (list + progress), admin API (toggle, configure thresholds, icons, categories) | Admin route pattern from `src/app/api/admin/settings/page-flags/route.ts`; resident API uses `withTenant()` + `getSessionAndRole()` |
| ADVISORY-013-D | Widgets — dashboard badge grid widget + directory profile achievement section                                           | Widget registry pattern from `widgets.ts`; profile section additive to `UnifiedResidentCard.tsx`                                    |

</phase_requirements>

## Standard Stack

### Core

| Library                    | Version | Purpose                           | Why Standard                                                 |
| -------------------------- | ------- | --------------------------------- | ------------------------------------------------------------ |
| Prisma (existing)          | current | Schema definition + migration     | Already in project; 4 new models follow existing conventions |
| Drizzle ORM (existing)     | current | Runtime queries (edge-compatible) | Already in project; new tables auto-generated from Prisma    |
| Node EventEmitter (stdlib) | —       | In-process event bus              | Phase A already uses this; no new dependency                 |

### Supporting

| Library                 | Version | Purpose                            | When to Use                                                     |
| ----------------------- | ------- | ---------------------------------- | --------------------------------------------------------------- |
| lucide-react (existing) | current | Widget icons (Trophy, Award, Star) | Already installed; `Trophy` icon already imported in widgets.ts |
| Sonner (existing)       | current | Toast notifications on unlock      | Already installed; unified toast system per ADR-018             |

### Alternatives Considered

| Instead of              | Could Use                       | Tradeoff                                                                              |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| In-process EventEmitter | DB outbox + polling             | Durable but requires worker process (not available); overkill for non-compliance data |
| Separate Progress table | Count from UserAchievement rows | Expensive aggregate queries on read; progress exists before unlock                    |

**Installation:**

```bash
# No new packages needed — all existing dependencies
```

**Version verification:** No new packages to verify. All dependencies are already installed and in use.

## Package Legitimacy Audit

> No external packages are installed in this phase. All infrastructure uses existing project dependencies (Prisma, Drizzle, Node stdlib EventEmitter, lucide-react, Sonner).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition     |
| ------- | -------- | --- | --------- | ----------- | ------- | --------------- |
| (none)  | —        | —   | —         | —           | —       | No new packages |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Mutation Routes                     │
│  bookings/  maintenance/  events/  content/  groups/  comp/  │
│                          │                                   │
│                    emitEvent() [Phase A]                      │
│                    (fire-and-forget)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AchievementEventListener (NEW)                   │
│                                                              │
│  onEvent('booking.created', handler)                         │
│  onEvent('maintenance.created', handler)                     │
│  onEvent('event.attendee.added', handler)                    │
│  onEvent('content.created', handler)                         │
│  onEvent('group.member.added', handler)                      │
│  onEvent('competition.entry.created', handler)               │
│                                                              │
│  ┌─────────────────────────────────────────┐                 │
│  │ For each event:                          │                │
│  │  1. Query active TenantAchievement rules │                │
│  │     matching eventType                   │                │
│  │  2. Upsert UserAchievementProgress       │                │
│  │  3. If count >= threshold → unlock       │                │
│  │     → INSERT UserAchievement             │                │
│  │     → INSERT Notification (optional)     │                │
│  └─────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                    │
│                                                              │
│  AchievementDefinition  ──┐                                  │
│  (platform catalog)       ├── TenantAchievement              │
│                           │   (tenant enable/configure)      │
│                           │                                  │
│  UserAchievementProgress  │                                  │
│  (per-user counter)       │                                  │
│                           │                                  │
│  UserAchievement          │                                  │
│  (unlock record)          │                                  │
└─────────────────────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  Resident API    │    │  Admin API       │
│  GET /achievements│    │  PATCH /admin/   │
│  GET /progress   │    │  achievements/:id│
└──────────────────┘    └──────────────────┘
          │                         │
          ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  Badge Grid      │    │  Catalog Mgmt    │
│  Widget (home)   │    │  Widget (admin)  │
│  Profile Section │    │  PageSettings    │
│  (directory)     │    │  pattern         │
└──────────────────┘    └──────────────────┘
```

### Recommended Project Structure

```
src/
├── shared/api/achievements/         # Achievement service (listener + helpers)
│   ├── listener.ts                  # Event listener — subscribes to emitter
│   ├── service.ts                   # Achievement logic (upsert progress, check threshold, unlock)
│   ├── seed.ts                      # Seed 12 achievement definitions
│   └── index.ts                     # Barrel export
├── db/schema/
│   ├── achievement-definitions.ts   # Drizzle table
│   ├── achievement-definitions-relations.ts
│   ├── tenant-achievements.ts       # Drizzle table
│   ├── tenant-achievements-relations.ts
│   ├── user-achievement-progress.ts # Drizzle table
│   ├── user-achievement-progress-relations.ts
│   ├── user-achievements.ts         # Drizzle table
│   ├── user-achievements-relations.ts
│   └── achievement-category-enum.ts # pgEnum
├── app/api/
│   ├── achievements/
│   │   ├── route.ts                 # GET — list definitions + user unlock status
│   │   └── progress/
│   │       └── route.ts             # GET — current user's progress
│   └── admin/achievements/
│       └── [id]/
│           └── route.ts             # PATCH — toggle, configure thresholds/icons/categories
├── widgets/dashboard/ui/
│   ├── AchievementsWidget.tsx       # Badge grid widget
│   └── AdminAchievementsWidget.tsx  # Admin catalog management widget
└── entities/directory/ui/
    └── AchievementBadgeGrid.tsx     # Profile section component
```

### Pattern 1: PlatformModule/TenantModule Definition Pattern

**What:** Achievement definitions follow the exact PlatformModule + TenantModule pattern — platform-wide catalog + per-tenant enable/configure join.

**When to use:** Any time you need a platform catalog that tenants can customize per-instance.

**Example:**

```typescript
// Source: prisma/schema.prisma (PlatformModule + TenantModule pattern)
model AchievementDefinition {
  id            String   @id @default(cuid())
  key           String   @unique          // e.g. "first_booking"
  label         String
  description   String?
  icon          String?                   // URL or emoji
  eventType     String                    // matches emitted event name
  threshold     Int      @default(1)      // 1 = one-shot, >1 = cumulative
  category      AchievementCategory @default(ENGAGEMENT)
  createdAt     DateTime @default(now())
  tenantAchievements TenantAchievement[]
}

model TenantAchievement {
  id           String   @id @default(cuid())
  tenantId     String
  definitionId String
  enabled      Boolean  @default(true)
  customThreshold Int?                     // tenant override
  definition   AchievementDefinition @relation(fields: [definitionId], references: [id])
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, definitionId])
  @@index([tenantId])
}
```

### Pattern 2: Event Listener Registration

**What:** Subscribe to domain events via `onEvent()` from the existing emitter. Register listeners at module load time (top-level side effect).

**When to use:** Any cross-cutting concern that reacts to domain mutations without coupling to specific routes.

**Example:**

```typescript
// Source: src/shared/api/events/emitter.ts (existing API)
import { onEvent } from '@shared/api/events';
import { processAchievementEvent } from './service';

// Register at module load — fire-and-forget
onEvent('booking.created', async event => {
  await processAchievementEvent('booking.created', event.payload);
});

onEvent('maintenance.created', async event => {
  await processAchievementEvent('maintenance.created', event.payload);
});

// ... one registration per event type (6 total)
```

### Pattern 3: Widget Registration

**What:** Register widgets via `registerAllWidgets()` in `widgets.ts` with lazy loading, manifest, and space assignment.

**When to use:** Any new dashboard widget.

**Example:**

```typescript
// Source: src/widgets/dashboard/model/widgets.ts (existing pattern)
registry.register({
  id: 'achievements',
  version: '1.0.0',
  name: 'Achievements',
  description: 'Your achievement badges and progress',
  author: 'internal',
  category: 'content',
  icon: Trophy, // already imported in widgets.ts
  component: lazy(() =>
    import('../ui/AchievementsWidget').then(m => ({ default: m.AchievementsWidget }))
  ),
  defaultSize: { width: 3, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['home'],
});
```

### Pattern 4: Admin API Route

**What:** Admin routes use `getSessionAndRole()` + `hasPermission()` + `runWithRLS()` + `rateLimitByUser()` + `writeAuditLog()`.

**When to use:** Any admin-scoped API endpoint.

**Example:**

```typescript
// Source: src/app/api/admin/settings/page-flags/route.ts (existing pattern)
export async function PATCH(request: NextRequest) {
  const sessionRole = await getSessionAndRole();
  if (!sessionRole || !hasPermission(sessionRole.role, 'admin')) {
    return apiForbidden();
  }
  const rateLimit = await rateLimitByUser(sessionRole.userId, {
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (rateLimit) return rateLimit;

  const ctx = await getRLSContext(request);
  if (!ctx) return apiUnauthorized();

  return runWithRLS(ctx, async tx => {
    // ... achievement config logic
    return apiSuccess(result);
  });
}
```

### Anti-Patterns to Avoid

- **Scattered `checkAchievements()` calls:** The whole point of the event bus is centralized reaction. Never put achievement logic in domain routes.
- **Gating through `canAccess()`:** D-13 says always-on. Don't couple to the Phase 41 gate system.
- **Deleting UserAchievement on disable:** D-11 says disabling hides from discovery but preserves historical unlocks.
- **Aggregate queries for progress:** Store `UserAchievementProgress.count` as a counter, don't COUNT(\*) from UserAchievement.

## Don't Hand-Roll

| Problem                   | Don't Build               | Use Instead                                     | Why                                       |
| ------------------------- | ------------------------- | ----------------------------------------------- | ----------------------------------------- |
| Event bus                 | Custom pub/sub            | Existing `src/shared/api/events/emitter.ts`     | Phase A already built and wired           |
| Widget registration       | Custom widget system      | Existing `registerAllWidgets()` in `widgets.ts` | O(1) manifest-driven, lazy-loading        |
| Toast on unlock           | Custom notification UI    | Sonner (already unified per ADR-018)            | Single toast system                       |
| Achievement notifications | Custom notification model | Existing `Notification` model in Prisma         | Already has type, link, read status       |
| Tenant isolation          | Custom tenant filtering   | `withTenant()` + `runWithRLS()`                 | Existing pattern, prevents e0w-style gaps |
| Admin auth                | Custom auth checks        | `getSessionAndRole()` + `hasPermission()`       | Existing pattern                          |

**Key insight:** This phase has zero new infrastructure dependencies. The event bus (Phase A), widget system, notification model, and admin API conventions are all pre-existing. The only new code is the achievement-specific logic.

## Common Pitfalls

### Pitfall 1: Event Type Mismatch

**What goes wrong:** Event listener subscribes to `'event.rsvp'` but ADVISORY-013 defines `'event.attendee.added'` — listener never fires.
**Why it happens:** The emitter.ts uses `'event.rsvp'` as the type name (line 56), but CONTEXT.md D-03 says `'event.attendee.added'`. These don't match.
**How to avoid:** Use the event type names from `emitter.ts` as the source of truth (they're already wired into routes). The CONTEXT.md names are aspirational — the actual emitted types are: `booking.created`, `maintenance.created`, `event.rsvp`, `content.created`, `group.joined`, `competition.entered`. Map these to achievement eventTypes.
**Warning signs:** Achievement never unlocks despite user performing the action.

### Pitfall 2: TenantAchievement Missing on New Tenants

**What goes wrong:** New tenants have no TenantAchievement rows, so achievements never trigger.
**Why it happens:** AchievementDefinition is platform-wide, but TenantAchievement is per-tenant. New tenants need rows seeded.
**How to avoid:** Either (a) seed TenantAchievement rows during tenant creation/onboarding, or (b) query AchievementDefinition directly and treat missing TenantAchievement as "enabled by default" (simpler, matches PlatformModule pattern where `defaultEnabled` exists).
**Warning signs:** New tenants see zero achievements; existing tenants work fine.

### Pitfall 3: Concurrent Progress Upserts

**What goes wrong:** Two events for the same user+achievement arrive simultaneously, both read count=4, both write count=5, actual should be 6.
**Why it happens:** In-process emitter is synchronous per-event but async handlers could overlap if awaited.
**How to avoid:** Use Drizzle's `onConflictDoUpdate` with a SQL expression for the increment: `SET count = count + 1`. This is atomic at the DB level regardless of application-level races.
**Warning signs:** Progress counter is lower than expected for high-frequency achievements.

### Pitfall 4: user Model Relation Sprawl

**What goes wrong:** Adding 2 new back-relations to an already 30+ relation `user` model causes performance issues.
**Why it happens:** Prisma includes relations in some query patterns by default.
**How to avoid:** Use `select` or `omit` in queries — don't load achievement relations unless explicitly needed. The new relations are read-heavy (widget display), not write-heavy.
**Warning signs:** Slow user queries after migration.

## Code Examples

Verified patterns from official sources:

### Achievement Progress Upsert (Atomic)

```typescript
// Source: Drizzle ORM docs — onConflictDoUpdate for atomic counter increment
import { eq, and, sql } from 'drizzle-orm';
import { userAchievementProgress } from '@db/schema';

// Atomic upsert — no race condition
await tx
  .insert(userAchievementProgress)
  .values({
    id: crypto.randomUUID(),
    tenantId,
    userId,
    definitionId,
    count: 1,
  })
  .onConflictDoUpdate({
    target: [userAchievementProgress.userId, userAchievementProgress.definitionId],
    set: {
      count: sql`${userAchievementProgress.count} + 1`,
      updatedAt: new Date(),
    },
  });
```

### Threshold Check After Upsert

```typescript
// Source: ADVISORY-013 §4 — check threshold on write
const updated = await tx
  .select()
  .from(userAchievementProgress)
  .where(
    and(
      eq(userAchievementProgress.userId, userId),
      eq(userAchievementProgress.definitionId, definitionId)
    )
  )
  .limit(1);

if (updated[0] && updated[0].count >= threshold) {
  // Check if already unlocked
  const existing = await tx
    .select()
    .from(userAchievements)
    .where(
      and(eq(userAchievements.userId, userId), eq(userAchievements.definitionId, definitionId))
    )
    .limit(1);

  if (!existing[0]) {
    // Unlock!
    await tx.insert(userAchievements).values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      definitionId,
      unlockedAt: new Date(),
    });

    // Optional: create notification
    if (notifyOnUnlock) {
      await tx.insert(notifications).values({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        title: 'Achievement Unlocked!',
        message: `You earned: ${achievementLabel}`,
        type: 'success',
        link: '/dashboard',
      });
    }
  }
}
```

### Event Listener Registration (Module-Level Side Effect)

```typescript
// Source: src/shared/api/events/emitter.ts — onEvent API
import { onEvent, type BookingCreatedEvent } from '@shared/api/events';
import { processAchievementEvent } from './service';

// Register at import time — listeners persist for process lifetime
onEvent('booking.created', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'booking.created',
    });
  } catch (err) {
    // Listener errors must not propagate to emitter
    console.error('[achievements] Failed to process booking.created:', err);
  }
});
```

## State of the Art

| Old Approach                   | Current Approach                  | When Changed                 | Impact                                |
| ------------------------------ | --------------------------------- | ---------------------------- | ------------------------------------- |
| No event infrastructure        | In-process EventEmitter (Phase A) | 2026-06-22 (commit 59540ddf) | Phase 102 builds on existing emitter  |
| Scattered cross-cutting checks | Centralized event bus             | ADVISORY-013                 | Achievements subscribe, don't scatter |
| No achievement system          | This phase                        | Phase 102                    | New cross-cutting concern             |

**Deprecated/outdated:**

- None — this is greenfield within existing infrastructure.

## Assumptions Log

> All claims in this research were verified against the codebase or cited from ADVISORY-013/CONTEXT.md. No assumptions required.

| #      | Claim | Section | Risk if Wrong |
| ------ | ----- | ------- | ------------- |
| (none) | —     | —       | —             |

## Open Questions

1. **Event type name mismatch (emitter.ts vs CONTEXT.md)**
   - What we know: `emitter.ts` uses `event.rsvp`, `group.joined`, `competition.entered`. CONTEXT.md D-03 uses `event.attendee.added`, `group.member.added`, `competition.entry.created`.
   - What's unclear: Which names does the achievement listener subscribe to?
   - Recommendation: Use the names from `emitter.ts` (they're already wired into routes). Update CONTEXT.md D-03 to match. The listener subscribes to the actual emitted types.

2. **TenantAchievement seeding strategy**
   - What we know: AchievementDefinition is platform-wide; TenantAchievement is per-tenant join.
   - What's unclear: Should TenantAchievement rows be auto-created for new tenants, or should missing rows mean "enabled by default"?
   - Recommendation: Treat missing TenantAchievement as "enabled with default threshold" (matches PlatformModule `defaultEnabled` pattern). This avoids a seeding dependency on tenant creation flow.

3. **Custom threshold override scope**
   - What we know: D-10 says "custom threshold override" per tenant.
   - What's unclear: Does this mean TenantAchievement has a `customThreshold` column that overrides AchievementDefinition.threshold?
   - Recommendation: Yes — add `customThreshold Int?` to TenantAchievement. Listener reads `tenantAchievement.customThreshold ?? definition.threshold`.

## Environment Availability

> Skip — no external dependencies needed. All infrastructure is existing project code.

| Dependency | Required By | Available | Version | Fallback |
| ---------- | ----------- | --------- | ------- | -------- |
| (none)     | —           | —         | —       | —        |

**Missing dependencies with no fallback:**

- None

**Missing dependencies with fallback:**

- None

## Validation Architecture

> `workflow.nyquist_validation` is `false` in config.json — this section is included for completeness but validation is not enforced.

### Test Framework

| Property           | Value                                             |
| ------------------ | ------------------------------------------------- |
| Framework          | Vitest (existing)                                 |
| Config file        | `vitest.config.ts`                                |
| Quick run command  | `pnpm test -- --run src/shared/api/achievements/` |
| Full suite command | `pnpm test`                                       |

### Phase Requirements → Test Map

| Req ID         | Behavior                                                   | Test Type   | Automated Command                                    | File Exists? |
| -------------- | ---------------------------------------------------------- | ----------- | ---------------------------------------------------- | ------------ |
| ADVISORY-013-B | Achievement listener processes events and upserts progress | unit        | `pnpm test -- --run src/shared/api/achievements/`    | ❌ Wave 0    |
| ADVISORY-013-B | Threshold crossing creates UserAchievement                 | unit        | `pnpm test -- --run src/shared/api/achievements/`    | ❌ Wave 0    |
| ADVISORY-013-C | GET /achievements returns definitions + unlock status      | integration | `pnpm test -- --run src/app/api/achievements/`       | ❌ Wave 0    |
| ADVISORY-013-C | PATCH /admin/achievements/:id toggles enabled              | integration | `pnpm test -- --run src/app/api/admin/achievements/` | ❌ Wave 0    |
| ADVISORY-013-D | Widget registered in widgets.ts                            | smoke       | manual check                                         | N/A          |

### Sampling Rate

- **Per task commit:** `pnpm test -- --run src/shared/api/achievements/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/shared/api/achievements/__tests__/listener.test.ts` — covers event processing + threshold logic
- [ ] `src/app/api/achievements/__tests__/route.test.ts` — covers GET endpoints
- [ ] `src/app/api/admin/achievements/__tests__/route.test.ts` — covers admin PATCH

## Security Domain

> `security_enforcement` is not explicitly set in config.json — treating as enabled (default).

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                              |
| --------------------- | ------- | ----------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth session via `getSessionAndRole()`                                 |
| V3 Session Management | no      | No session changes                                                            |
| V4 Access Control     | yes     | `hasPermission('admin')` for admin routes; `withTenant()` for resident routes |
| V5 Input Validation   | yes     | Zod schemas for admin PATCH body; tenant isolation on all queries             |
| V6 Cryptography       | no      | No crypto operations                                                          |

### Known Threat Patterns for Achievements System

| Pattern                                          | STRIDE                 | Standard Mitigation                                                                 |
| ------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------- |
| Tenant isolation bypass on achievement queries   | Information Disclosure | All queries carry `tenantId` filter; `runWithRLS()` wraps sensitive routes          |
| Admin can see/modify other tenants' achievements | Elevation of Privilege | `getRLSContext()` enforces tenant scope; admin routes check `hasPermission()`       |
| Achievement spam (rapid event firing)            | Denial of Service      | Rate limiting on admin routes; event listener is fire-and-forget with error logging |
| Stored XSS via achievement label/description     | Tampering              | Admin input sanitized; resident-facing display uses React (auto-escaped)            |

## Sources

### Primary (HIGH confidence)

- `docs/advisories/ADVISORY-013.md` — Full architectural advisory with models, phases, risk register
- `src/shared/api/events/emitter.ts` — Existing event emitter (Phase A, verified in codebase)
- `src/widgets/dashboard/model/widgets.ts` — Widget registry pattern (verified in codebase)
- `prisma/schema.prisma` — Prisma schema with PlatformModule/TenantModule pattern (verified)
- `src/app/api/admin/settings/page-flags/route.ts` — Admin API pattern (verified)

### Secondary (MEDIUM confidence)

- CONTEXT.md — Locked decisions from `/gsd-discuss-phase` (user-confirmed)

### Tertiary (LOW confidence)

- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero new dependencies, all existing infrastructure
- Architecture: HIGH — ADVISORY-013 provides complete model definitions and phased plan
- Pitfalls: HIGH — event type name mismatch is the only ambiguity, resolved via codebase inspection

**Research date:** 2026-06-23
**Valid until:** 30 days — stable architecture, no fast-moving dependencies
