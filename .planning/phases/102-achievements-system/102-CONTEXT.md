# Phase 102: Achievements System - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-cutting achievements engine: event bus (Phase A already shipped), schema + achievement service, API + admin configuration, and resident widget. Scoped from ADVISORY-013 Phases B–D. Phase E (backfill) is N/A per G4=forward-only.

Delivers:

- 4 new Prisma models (AchievementDefinition, TenantAchievement, UserAchievementProgress, UserAchievement)
- Event listener that matches events against tenant-configurable rules, upserts progress, creates unlock records
- Resident-facing API (list achievements + progress)
- Admin API (toggle, configure thresholds, icons, categories per tenant)
- Dashboard widget (badge grid)
- Directory profile section (achievement display)

</domain>

<decisions>
## Implementation Decisions

### Event Wiring Scope

- **D-01:** Create-only mutations emit events for v1 (no status changes, no deletes)
- **D-02:** 6 domains wired: bookings, maintenance, events, content, groups, competitions
- **D-03:** Event types: `booking.created`, `maintenance.created`, `event.attendee.added`, `content.created`, `group.member.added`, `competition.entry.created`

### V1 Achievement Catalog

- **D-04:** Standard catalog — 12 achievements (6 one-shot + 6 cumulative)
- **D-05:** One-shot: `first_booking`, `first_maintenance`, `first_event_rsvp`, `first_post`, `first_group_join`, `first_competition_entry`
- **D-06:** Cumulative: `maintenance_5` (threshold 5), `maintenance_10` (10), `event_attendee_5` (5), `event_attendee_10` (10), `content_creator_5` (5), `bookings_3` (3)

### Widget & Profile Display

- **D-07:** Dashboard widget: badge grid — locked (gray/muted), unlocked (colored with icon). Hover tooltip shows name + unlock date.
- **D-08:** Directory profile: separate "Achievements" section in profile detail view with full badge grid. No changes to directory listing cards.
- **D-09:** Widget registered via `widgets.ts` convention, assigned to `home` space. Navigation Governance compliant — no new page, no header changes.

### Admin Configuration

- **D-10:** Full customization per tenant: enable/disable toggle, custom threshold override, icon upload, category management
- **D-11:** Disabling hides achievement from discovery but preserves historical `UserAchievement` rows (per ADVISORY-013 Phase C done criteria)
- **D-12:** Admin UI mirrors `PageSettingsWidget` pattern for catalog management

### Gating & Architecture (from ADVISORY-013)

- **D-13:** Always-on module, not gated through `canAccess()` (G2)
- **D-14:** In-process event emitter, fire-and-forget, post-commit (G1)
- **D-15:** Merits as trigger source deferred — 6 domains only for v1 (G3)
- **D-16:** Forward-only counting, no backfill (G4)

### agent's Discretion

- Achievement category enum values: ENGAGEMENT, CONTRIBUTION, MILESTONE (from ADVISORY-013)
- Icon storage: text field (URL or emoji) for v1; file upload can be added later if needed
- Notification on unlock: reuse existing Notification model, optional per achievement definition

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Design

- `docs/advisories/ADVISORY-013.md` — Full architectural advisory: problem statement, options considered, Prisma models, phased plan, risk register
- `docs/advisories/ADVISORY-012.md` — Community Merits (related but explicitly out of scope — boundary reference)

### Existing Patterns

- `src/widgets/dashboard/model/widgets.ts` — Widget registry pattern (registerAllWidgets, WidgetManifest)
- `src/widgets/dashboard/ui/WidgetCard.tsx` — WidgetCard component pattern
- `src/entities/widget/model/widget-store.ts` — Widget store (Zustand)
- `src/db/schema/schema.ts` — Drizzle schema consolidation point

### Event Infrastructure (Phase A — already shipped)

- `src/shared/api/events/` — Existing event emitter (Phase A, commit `59540ddf`)

### Migration Patterns

- `prisma/migrations/` — Existing migration conventions
- `src/db/schema/` — Drizzle schema file conventions (table + relations separate files)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **Event emitter (Phase A):** `src/shared/api/events/emitter.ts` — typed in-process emitter already wired into 6 domain routes
- **Widget system:** `src/widgets/dashboard/` — full registration, manifest, lazy-loading pattern established
- **Notification model:** `src/db/schema/notifications.ts` — reusable for unlock notifications
- **withTenant pattern:** existing tenant-scoped query pattern for all new tables
- **withErrorHandler:** existing API route wrapper for consistent error handling

### Established Patterns

- **PlatformModule/TenantModule:** Achievement definitions follow this exact pattern (platform catalog + tenant enable/configure join)
- **WidgetCard + registry:** All widgets go through `registerAllWidgets()` in `widgets.ts` with lazy loading
- **Drizzle schema:** Separate files per table (`tablename.ts`) + relations file (`tablename-relations.ts`), all re-exported from `schema.ts`

### Integration Points

- **Event emission:** Post-commit hooks in existing mutation routes (Phase A already added these)
- **Dashboard home space:** Widget slots available in `home` Focus Space
- **Profile detail view:** Existing directory profile component where achievements section gets added
- **Admin routes:** `src/app/api/admin/` — existing admin API convention for tenant-scoped configuration

</code_context>

<specifics>
## Specific Ideas

- Badge grid should feel like a "trophy case" — visual, satisfying to fill
- Locked achievements should show what they are (not hidden) to create aspirational pull
- Admin should be able to upload custom icons per achievement (not just emojis)
- Category management allows admins to group achievements (Engagement, Contribution, Milestone)

</specifics>

<deferred>
## Deferred Ideas

- Merits as achievement trigger source (G3 = deferred) — future phase will read BehaviorRecord.recognitionPoints
- Retroactive backfill for existing users (G4 = forward-only) — if demand exists, a future phase can add a backfill script
- Status-change events (cancelled bookings, resolved maintenance) — richer achievement types for v2
- Achievement sharing to chat — social feature for future consideration

</deferred>

---

_Phase: 102-Achievements System_
_Context gathered: 2026-06-23_
