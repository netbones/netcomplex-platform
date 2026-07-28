---
title: ADVISORY-013: Achievements System
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-013: Achievements System

> **Status:** Phase A complete (2026-06-22) — event emitter built and wired into 6 domains. Decision gates G1–G4 resolved (2026-06-23). Phases B–E ready for execution.
> **Author:** Claude (architectural advisor)
> **Date:** 2026-06-21
> **Related:** ADVISORY-012 (Community Merits — explicitly out of scope, see Boundary section), C2 (gating consolidation, Phase 41), GATE_PLAN.md, BD `soralia-village-k9q7`

| Phase                            | Status                  | Commit     |
| -------------------------------- | ----------------------- | ---------- |
| A — Event Infrastructure         | ✅ done                 | `59540ddf` |
| B — Schema + Achievement Service | 📋 ready                | —          |
| C — API + Admin Configuration    | 📋 ready                | —          |
| D — Widgets                      | 📋 ready                | —          |
| E — Backfill                     | ~~📋~~ N/A (G4=forward) | —          |

---

## 1. Problem Statement

The platform has no mechanism to recognize user engagement milestones (first booking, fifth maintenance request, tenth event RSVP, etc.) outside of the behavioral standing system. DavDev has confirmed Achievements is a **separate concern** from Community Merits:

|            | **Achievements** (this advisory)   | **Merits** (ADVISORY-012)                        |
| ---------- | ---------------------------------- | ------------------------------------------------ |
| Measures   | Milestone/volume engagement        | Behavioral standing (recognition vs. discipline) |
| Direction  | Always positive, additive          | Bidirectional (recognition + disciplinary)       |
| Disputable | No                                 | Yes (dispute workflow)                           |
| Display    | Badge collection, profile showcase | Public standing score/badge                      |

No shared model, no shared UI. They may both render as "badges" colloquially but are domain-distinct. This advisory does not modify `BehaviorRecord` or touch the Merits decision gate.

### Confirmed scope (from decision session)

- **Trigger breadth:** broad coverage — bookings, content, maintenance, events, groups, competitions, and (read-only) merits counts are eligible achievement triggers
- **Architecture:** central event bus — domain actions emit events, an Achievement service listens and evaluates rules
- **Definitions:** tenant-customizable, modeled like `PlatformModule` (platform catalog + tenant-level enable/configure)
- **Progress tracking:** stored counter, incremented per event, threshold checked on write

---

## 2. Root Cause / Why This Needs Architecture (Not Just a Feature)

This is not a single-entity feature — it is a **cross-cutting concern** that touches at minimum 7 existing domains (Booking, Content, MaintenanceRequest, Event, Group, Competition, BehaviorRecord). The platform has no existing event infrastructure:

```
grep-equivalent check: no src/shared/api/events.ts, no event bus, no pub/sub layer exists today
```

This means Phase scope is **two systems, not one**:

1. A minimal event-emission infrastructure (new — does not exist)
2. The Achievements domain itself (definitions, progress, unlocks, UI)

This sequencing matters and is reflected in the phased plan (Section 7).

### Relationship to existing systemic risk

The 20-routes-missing-tenant-filters issue (`e0w`) exists _because_ cross-cutting concerns were bolted on per-route rather than centralized. An event bus is the correct structural answer to "broad coverage across many entities" — but it is also a second, parallel cross-cutting mechanism alongside `canAccess()` (Phase 41) and `withTenant()`. Three cross-cutting systems in flight at once (gating, tenant filtering, events) raises real risk of inconsistent adoption. **This is flagged as a phasing risk, not a blocker** — see Risk Register.

---

## 3. Options Considered

### 3.1 Trigger architecture

| Option                                   | Pros                                                                                                           | Cons                                                                                                                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Central event bus** (confirmed)     | Single integration point; new domains opt in without touching achievement logic; matches "broad coverage" goal | New infra to build and maintain; async complexity; needs at-least-once delivery guarantee or progress counters drift                                                                                    |
| B. Scattered `checkAchievements()` calls | No new infra; immediate                                                                                        | Easy to miss callsites (same failure mode as `e0w`); achievement logic leaks into unrelated routers                                                                                                     |
| C. Postgres triggers                     | DB-enforced, can't be bypassed                                                                                 | Triggers can't easily call application-layer rules (tenant config, notification dispatch); hard to test; violates "Drizzle for runtime queries" pattern since trigger logic lives outside the ORM layer |

**Decision: A**, per DavDev confirmation.

### 3.2 Event bus implementation shape

Given there's no existing infra, three concrete implementation options for "the event bus" itself:

| Option                                                                    | Description                                                                                       | Fit                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. In-process event emitter** (Node `EventEmitter` or typed equivalent) | Synchronous, in the same request lifecycle, fire-and-forget after the triggering mutation commits | Matches single-instance Vercel deployment reality (same constraint already noted for the in-memory rate limiter in HOLISTIC.md); simplest to ship; **recommended starting point** |
| B. DB outbox table + polling worker                                       | Durable, survives process restarts, supports retry                                                | Requires a worker/cron process — platform has no background worker today; adds operational surface                                                                                |
| C. External queue (e.g. Redis streams, Supabase queues)                   | Most robust                                                                                       | Redis is already flagged as a _future_ dependency (rate limiter) but not present; introduces a new piece of infrastructure for a non-critical-path feature                        |

**Recommendation: Option A (in-process emitter) for v1**, explicitly scoped as "best-effort, not durable." Achievement unlocks are not legally or financially consequential (unlike audit logs, which must be durable) — a missed event means a badge appears a day late after a backfill job, not a compliance problem. This keeps the new infra surface small and matches the existing single-instance architecture rather than fighting it. Flagged as a decision gate below in case DavDev wants durability guarantees from day one.

### 3.3 Definition storage shape

Mirrors the existing `PlatformModule` / `TenantModule` pattern exactly, since DavDev confirmed "modeled like PlatformModule":

- `AchievementDefinition` (platform-wide catalog, like `PlatformModule`)
- `TenantAchievement` (tenant enable/configure join, like `TenantModule`)

This reuses a proven pattern rather than inventing a fourth gating-adjacent system. Deliberately **not** reusing `FeatureRegistry` (dot-notation, code-defined) because achievement catalogs need to be admin-editable without a deploy — that requirement is what makes `PlatformModule`'s DB-backed shape the right fit, not `FeatureRegistry`'s code-backed shape.

---

## 4. Architecture: Before / After

### Before

```
Booking/Content/Maintenance/Event/Group/Competition mutations
  → write directly via Drizzle, apiSuccess()
  → (no cross-cutting hook point exists)
```

### After

```
Booking/Content/Maintenance/Event/Group/Competition mutations
  → write via Drizzle (unchanged)
  → apiSuccess() (unchanged)
  → emitEvent('booking.created', { tenantId, userId, ... })  [new, fire-and-forget, post-commit]
       ↓
  AchievementEventListener (new, src/shared/api/achievements/)
       ↓
  matches event type against active TenantAchievement rules
       ↓
  increments UserAchievementProgress.count (upsert)
       ↓
  if count >= threshold AND not already unlocked:
       → create UserAchievement (unlock record)
       → optional: Notification row (existing model, reused)
```

### New Prisma models (proposed — NOT to be written by agent without confirmation)

```prisma
model AchievementDefinition {
  id            String   @id @default(cuid())
  key           String   @unique          // e.g. "first_booking", "maintenance_5"
  label         String
  description   String?
  icon          String?
  eventType     String                    // e.g. "booking.created" — matches emitted event name
  threshold     Int      @default(1)       // 1 = one-shot, >1 = cumulative
  category      AchievementCategory @default(ENGAGEMENT)
  createdAt     DateTime @default(now())
  tenantAchievements TenantAchievement[]
}

model TenantAchievement {
  id           String   @id @default(cuid())
  tenantId     String
  definitionId String
  enabled      Boolean  @default(true)
  definition   AchievementDefinition @relation(fields: [definitionId], references: [id])
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, definitionId])
  @@index([tenantId])
}

model UserAchievementProgress {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String
  definitionId String
  count        Int      @default(0)
  updatedAt    DateTime @updatedAt
  user         user     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, definitionId])
  @@index([tenantId])
}

model UserAchievement {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String
  definitionId String
  unlockedAt   DateTime @default(now())
  user         user     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, definitionId])
  @@index([tenantId])
  @@index([userId])
}

enum AchievementCategory {
  ENGAGEMENT
  CONTRIBUTION
  MILESTONE
}
```

**Note on `user` model impact:** adds 2 new back-relations (`UserAchievementProgress[]`, `UserAchievement[]`) to an already-large `user` model (30+ relations). No structural concern, just noting for the agent's diff review.

**Why a separate `Progress` table instead of computing threshold from `UserAchievement` rows directly:** one-shot achievements (threshold=1) don't need a progress row at all — they unlock on first event. Cumulative ones need a live counter that exists _before_ unlock. Storing progress separately avoids counting "almost unlocked" achievements via expensive aggregate queries on read.

---

## 5. Pre-Execution Discovery Checklist

Per project convention, the agent MUST run these and report results before writing any code. Do not proceed on assumption.

```bash
# 1. Confirm no event infrastructure already exists under a name we haven't seen
grep -ril "eventemitter\|event.bus\|emitEvent\|pubsub" src/shared/ src/entities/ 2>/dev/null

# 2. Confirm no prior Achievement-related code exists anywhere
grep -ril "achievement" src/ prisma/ 2>/dev/null

# 3. Confirm exact current relation count / shape on `user` model (for diff sizing)
grep -c "user\[\]\|user?\[\]\|user " prisma/schema.prisma

# 4. Confirm BehaviorRecord is NOT touched by this work (boundary check)
git diff --stat -- prisma/schema.prisma | grep -i behavior  # should be empty after implementation

# 5. Verify which existing routers/routes would be the v1 event-emission points
ls src/app/api/bookings src/app/api/maintenance-requests src/app/api/events src/app/api/content 2>/dev/null

# 6. Confirm canAccess()/Phase 41 status before deciding if Achievements should be
#    gated through the new unified gate system or ship ungated for v1
cat .planning/phases/41-feature-gate-consolidation/41-CONTEXT.md 2>/dev/null | grep -A5 "Trajectory"

# 7. Check for existing notification dispatch pattern to reuse for unlock notifications
grep -rl "Notification" src/shared/api/ src/entities/ 2>/dev/null | head -5
```

**Escalate, do not proceed, if:**

- Any event infrastructure already exists under an unexpected name (#1)
- Any achievement-related code already exists (#2)
- Phase 41's `canAccess()` is not yet stable enough to gate a new module against (#6) — if so, agent must ask whether Achievements ships ungated for v1 or waits

---

## 6. Decision Gates — RESOLVED (2026-06-23)

| Gate   | Decision                                                | Rationale                                                              |
| ------ | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| **G1** | ✅ In-process emitter for v1 (best-effort)              | Matches single-instance Vercel reality; backfill handles missed events |
| **G2** | ✅ Ship always-on, not gated through canAccess()        | Avoids coupling to unstable Phase 41; can add gating later             |
| **G3** | ✅ Deferred — merits as trigger source excluded from v1 | Keeps Merits/Achievements boundary clean; 6 domains in scope for v1    |
| **G4** | ✅ Forward-only — no retroactive backfill               | Simpler; users start earning from launch                               |

---

## 7. Phased Execution Plan

### Phase A — Event Infrastructure (prerequisite, blocks everything else)

1. `src/shared/api/events/emitter.ts` — typed in-process event emitter, fire-and-forget wrapper that never throws into the calling request (failures logged via Pino, never block the original mutation's response)
2. Event type registry (string literal union) for the 7 confirmed domains' relevant events
3. Wire `emitEvent()` calls into existing Booking/Content/Maintenance/Event/Group/Competition mutation routes — **after** `apiSuccess()` is determined, not blocking it
4. Done criteria: events fire and are logged in dev without altering any existing route's response shape or latency in a measurable way

### Phase B — Schema + Achievement Service

1. Add 4 new Prisma models (Section 4) — confirm via discovery checklist first
2. `npx prisma generate` → verify Drizzle schema output
3. `AchievementEventListener` — subscribes to emitter, matches `eventType`, upserts `UserAchievementProgress`, checks threshold, creates `UserAchievement` on cross
4. Seed script: initial `AchievementDefinition` catalog (e.g. first_booking, maintenance_5, maintenance_10, event_attendee_5, content_creator)
5. Done criteria: triggering a booking via API results in a `UserAchievementProgress` row; crossing threshold creates `UserAchievement`

### Phase C — API + Admin Configuration

1. `GET /api/achievements` — list definitions + user's unlock status (tenant-scoped, respects `TenantAchievement.enabled`)
2. `GET /api/achievements/progress` — current user's progress across all active achievements
3. Admin: `PATCH /api/admin/achievements/:id` — toggle `TenantAchievement.enabled`
4. Done criteria: tenant admin can disable an achievement; disabled achievements stop appearing for residents but historical unlocks are preserved (do not delete `UserAchievement` rows on disable)

### Phase D — Widgets (Navigation Governance compliant)

1. `AchievementsWidget` (resident-facing) — registered in `widgets.ts` per existing convention, Workspace-scoped, dashboard-only per Navigation Governance (no new page, no header item — meets Tab Rejection Criteria avoidance since this is widget-native, not a tab)
2. Public profile badge display — surfaces in the existing Resident directory display concept (`src/entities/directory/model/types.ts`), additive field, does not require new routes
3. Admin widget for catalog management (mirrors `PageSettingsWidget` pattern)
4. Done criteria: widget registrations follow Navigation Governance — no header/burger changes required since this rides the existing Workspace dashboard and Directory surfaces

### Phase E — Backfill (only if G4 = "yes, retroactive")

1. One-off script computing historical counts per user per eligible event type, inserting `UserAchievementProgress` and any already-crossed `UserAchievement` rows
2. Done criteria: idempotent (safe to re-run), tenant-scoped, does not fire notifications for backfilled unlocks (avoid notification spam for old activity)

---

## 8. Risk Register

| Risk                                                                                                                                                  | Severity | Mitigation                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Three parallel cross-cutting systems in flight (gating/Phase 41, tenant filters/`e0w`, events/this advisory) increase chance of inconsistent adoption | P2       | Sequence Achievements' event emission additions to land _after_ Phase 41 stabilizes, or explicitly ship ungated (G2)  |
| In-process emitter is not durable — a crash between mutation commit and event handling silently drops the achievement update                          | P3       | Documented as best-effort (G1); low consequence since achievements are not compliance-bearing data, unlike audit logs |
| `UserAchievementProgress` table could see high write volume if many events map to cumulative achievements (every booking write = an upsert)           | P3       | Single-row upsert via unique constraint is cheap; revisit only if write volume becomes measurable                     |
| Admin disables an achievement after users have unlocked it — risk of confusing UI state if not handled                                                | P3       | Explicit done-criteria in Phase C: disabling hides from discovery, never deletes existing unlocks                     |
| Merits/Achievements boundary erodes over time if a future agent conflates "recognition points" with "achievement progress"                            | P2       | This advisory explicitly states the boundary (Section 1 table); G3 scopes merits-as-trigger to read-only              |
| New models add to `user`'s already-large relation list (791-file codebase, C1 Property-shape-style sprawl risk)                                       | P4       | Cosmetic only; flagged for awareness, not a blocker                                                                   |

---

## 9. Done Criteria Checklist

- [x] ✅ Discovery checklist (Section 5) run and results reported before any code written
- [x] ✅ Decision gates G1–G4 explicitly confirmed by DavDev (2026-06-23)
- [ ] ⏳ Event emitter ships without altering response shape/latency of existing routes
- [ ] ⏳ 4 new Prisma models added, `prisma generate` run, Drizzle schema verified
- [ ] ⏳ Zero changes to `BehaviorRecord` model or Merits-related code paths
- [ ] ⏳ Tenant-scoped: all new tables carry `tenantId`, all queries filtered (no new entries to the `e0w` tenant-filter-gap list)
- [ ] ⏳ Widget registered via `widgets.ts` convention; no header/burger/page navigation changes (Navigation Governance compliant)
- [ ] ⏳ Admin can enable/disable per tenant; historical unlocks preserved on disable
- [ ] ⏳ `pnpm typecheck`, `pnpm lint`, `pnpm fsd:check` pass
- [ ] ADR entry added if event-bus infrastructure is judged ADR-worthy (recommend yes — this is a new architectural pattern, not routine implementation)
