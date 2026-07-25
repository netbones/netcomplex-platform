# Phase 101: Soft Deletes - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `deletedAt` timestamp columns across all domain entities for systematic soft-delete support, with a query wrapper helper that excludes soft-deleted records by default and a 90-day auto-purge background job. Migrate existing inconsistent soft-delete patterns (`isDeleted`, `isActive`) to use `deletedAt`. Do NOT add restore endpoints, admin management of deleted records, or soft-delete for auth/internal tables.

</domain>

<decisions>
## Implementation Decisions

### Pattern Standardization

- **D-01:** Use `deletedAt DateTime?` (nullable timestamp) as the universal soft-delete field across all entities. No `isDeleted` boolean, no `isActive` used as soft-delete.
- **D-02:** Migrate `Message.isDeleted` (boolean) → rename to `deletedAt` (timestamp).
- **D-03:** Add `deletedAt` to MaintenanceTeam, ServiceProvider, MaintenanceCategory. Keep `isActive` for its original lifecycle purpose — `deletedAt` is the soft-delete field now.
- **D-04:** Fix Group — currently hard-deletes despite having the `deletedAt` field. The DELETE endpoint must set `deletedAt` instead.

### Scope — Which Entities

- **D-05:** Apply to domain (user-facing) entities: Content, Announcement, Event, Booking, Survey, Question, Notification, Conversation, Competition, Resource, ResourceVersion, CommunityServiceListing, CommunityServiceReview, Group, Message, CommunityServiceInquiry, PropertyListing, GroupMember, GroupMembershipRequest, Member, Property, Household.
- **D-06:** Skip auth/internal tables: account, session, verification, passkey, twoFactor, Setting, RequestHistory, RequestNote, agentProfile, agentAccess, premiumSeat, soloSeat, standardSeat, platformSuspension, ExternalSurvey, AssistSession, organization, member (refers to org membership — distinct domain), agentAccess.

### DELETE Endpoint Behavior

- **D-07:** All DELETE endpoints set `deletedAt = new Date()` on the record. No conditional logic (e.g., maintenance's current "soft if refs exist, else hard-delete" pattern). Always soft-delete.
- **D-08:** PATCH/PUT endpoints must reject updates to soft-deleted records (return 404 or 410 Gone).

### Query Filtering

- **D-09:** Create a `notDeleted(table)` query wrapper helper that appends `isNull(table.deletedAt)` to Drizzle queries. Import and wrap all LIST/GET queries.
- **D-10:** All existing LIST/GET endpoints must be updated to use the wrapper. Single-record GET endpoints too.
- **D-11:** Stats and aggregation queries (dashboard counts, etc.) must filter out soft-deleted records unless they explicitly query for them.

### Unique Constraints

- **D-12:** Replace existing unique constraints with Postgres partial unique indexes: `UNIQUE (field) WHERE deletedAt IS NULL`. This allows reusing unique values after soft-delete.
- **D-13:** Entities with unique constraints that need this treatment include: group slug, event slug (if exists), and any other unique field on entities receiving soft-delete.

### the agent's Discretion

The following scope exclusions are intentional and not tracked as plan requirements:

- **D-14:** No restore endpoints in this phase. Deleted records stay soft-deleted.
- **D-15:** No admin list/view of deleted records. Build if needed later.

### Retention / Auto-Purge

- **D-16:** Add a background job (cron) that permanently hard-deletes records with `deletedAt` older than 90 days.
- **D-17:** Integrate with existing pruning cron (`src/app/api/messages/route.ts:263` area) or create a dedicated cron route.

### Audit Trail

- **D-18:** No `deletedById` tracking in this phase. `deletedAt` timestamp is sufficient for now. Add user tracking if needed later.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project documentation

- `.planning/PROJECT.md` §Soft deletes — project-level acknowledgment of this gap
- `.planning/BD.md` — Issue 6i9 tracking this work

### Existing patterns (codebase)

- `prisma/schema.prisma` — All model definitions; add `deletedAt` fields here
- `src/lib/db.ts` — Drizzle DB client; query wrapper goes here or nearby
- `src/app/api/messages/route.ts` — Existing `isDeleted` pattern for Message (model for migration)
- `src/app/api/maintenance/teams/[id]/route.ts` — Existing `isActive` soft-delete pattern for maintenance (model for migration)
- `src/app/api/groups/[id]/route.ts` — Group currently hard-deletes; needs fix
- `src/app/api/groups/route.ts` — Group list currently filters `isActive` but not `deletedAt`

### Domain docs

- `docs/STEERING/ADR.md` — Check for existing ADRs on data lifecycle

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **Message pruning cron** (`src/app/api/messages/route.ts:263`): Existing pattern for scheduled purging of old/soft-deleted records. Extend for 90-day auto-purge.
- **Drizzle query patterns**: All API routes use Drizzle (`src/lib/db.ts`). The `notDeleted` wrapper should be a Drizzle helper.

### Established Patterns

- **Maintenance conditional soft-delete**: MaintenanceTeam/ServiceProvider/Category use `isActive` with conditional logic (soft if active refs). This is being replaced/migrated.
- **Message isDeleted**: Boolean pattern being migrated to `deletedAt` timestamp.
- **Group hard-delete**: Bug — has `deletedAt` field but doesn't use it. Fix required.

### Integration Points

- `prisma/schema.prisma` — All `deletedAt` field additions, plus migration of `Message.isDeleted` to `deletedAt`
- `src/lib/db.ts` — Home for the `notDeleted` query wrapper
- `src/app/api/*/route.ts` — Every DELETE endpoint must be updated to set `deletedAt` instead of hard-delete
- `src/app/api/*/route.ts` — Every GET/LIST endpoint must use the `notDeleted` wrapper
- Drizzle schema files (`src/db/schema/*.ts`) — Regenerated after Prisma migration changes

</code_context>

<specifics>
## Specific Ideas

- The `notDeleted` wrapper should be a pure function that takes a Drizzle table reference and returns a filter condition: `(table, alias?) => isNull((alias ?? table).deletedAt)`. Simple, composable.
- Partial unique indexes should be created via Prisma migration SQL (not Prisma schema, which doesn't support partial indexes natively).
- Maintenance team/category/provider queries that already accept `?isActive=` filter should be extended to also handle `deletedAt`.

</specifics>

<deferred>
## Deferred Ideas

- **Restore endpoints** — user chose not to build restore for now. Could be added as a follow-up BD issue.
- **Admin deleted-record manager** — viewing/managing soft-deleted records. Future phase.
- **deletedById tracking** — recording which user performed the delete. Future enhancement.
- **Event sourcing / hard-delete log** — permanent record of deletions. Far future.

</deferred>

---

_Phase: 101-soft-deletes_
_Context gathered: 2026-06-17_
