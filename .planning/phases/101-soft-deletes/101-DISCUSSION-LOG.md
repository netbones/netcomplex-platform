# Phase 101: Soft Deletes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 101-soft-deletes
**Areas discussed:** Pattern, Scope, Existing entities, Query filtering, Restore, Uniques, Retention

---

## 1. Pattern — field convention

| Option                    | Description                                                                                                                                    | Selected |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `deletedAt` (Recommended) | `deletedAt DateTime?` — single nullable timestamp. Consistent, records when, supports partial unique indexes. Migrate Message and maintenance. | ✓        |
| `isDeleted` boolean       | Simpler but no "when" info. Match Message's existing pattern.                                                                                  |          |
| Keep hybrid               | Different entities keep existing pattern. Least refactoring but most cognitive load.                                                           |          |

**User's choice:** `deletedAt` (Recommended)
**Notes:** None

---

## 2. Scope — which entities get soft deletes?

| Option                        | Description                                                                                        | Selected |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| Domain entities (Recommended) | User-facing models: Content, Announcement, Event, Booking, Survey, etc. Skip auth/internal tables. | ✓        |
| Everything                    | All 47+ models including auth tables. Risk breaking Better Auth.                                   |          |
| Core only                     | Just the most critical entities. Hard-delete the rest.                                             |          |

**User's choice:** Domain entities (Recommended)
**Notes:** None

---

## 3. Existing entities with partial soft-delete

| Option                     | Description                                                                    | Selected |
| -------------------------- | ------------------------------------------------------------------------------ | -------- |
| Migrate all to `deletedAt` | Group: fix hard-delete. Message: rename isDeleted. Maintenance: add deletedAt. | ✓        |
| Fix Group, keep others     | Only fix Group's hard-delete. Leave Message and maintenance as-is.             |          |
| Leave all as-is            | Only add deletedAt to entities that have nothing.                              |          |

**User's choice:** Migrate all to `deletedAt`
**Notes:** Maintenance keeps `isActive` for its original lifecycle purpose; `deletedAt` is the new soft-delete field.

---

## 4. Query filtering — how to enforce

| Option               | Description                                                                             | Selected |
| -------------------- | --------------------------------------------------------------------------------------- | -------- |
| Query wrapper helper | A `notDeleted(table)` helper appending `isNull(table.deletedAt)`. Explicit, zero magic. | ✓        |
| Per-endpoint manual  | Each route adds `isNull(table.deletedAt)` manually. More to miss.                       |          |
| Prisma middleware    | Auto-inject at DB level. Most automatic but hardest to debug.                           |          |

**User's choice:** Query wrapper helper
**Notes:** Simple pure function approach recommended.

---

## 5. Restore & Admin

| Option                   | Description                                                             | Selected |
| ------------------------ | ----------------------------------------------------------------------- | -------- |
| Restore endpoint         | PATCH /api/foo/[id]/restore sets deletedAt=null. Admin or self-service. |          |
| Also admin list view     | Restore + admin list of deleted records with ability to browse/select.  |          |
| No restore (Recommended) | Soft-delete is permanent. Build later if needed.                        | ✓        |

**User's choice:** No restore (Recommended)
**Notes:** None

---

## 6. Unique constraints

| Option                       | Description                                                                | Selected |
| ---------------------------- | -------------------------------------------------------------------------- | -------- |
| Partial unique index         | `UNIQUE WHERE deletedAt IS NULL` — allows reused values after soft-delete. | ✓        |
| Drop unique, app-level check | Remove DB constraints, validate in API handler.                            |          |
| Accept the constraint        | Soft-deleted values remain reserved.                                       |          |

**User's choice:** Partial unique index
**Notes:** Create via migration SQL (Prisma schema doesn't support partial indexes natively).

---

## 7. Retention — auto-purge

| Option                          | Description                                                      | Selected |
| ------------------------------- | ---------------------------------------------------------------- | -------- |
| No retention limit              | Records stay soft-deleted forever.                               |          |
| 90-day auto-purge (Recommended) | Background job purges records with deletedAt older than 90 days. | ✓        |
| 30-day auto-purge               | More aggressive cleanup.                                         |          |

**User's choice:** 90-day auto-purge (Recommended)
**Notes:** Integrate with existing pruning cron infrastructure.

---

## Deferred Ideas

- **Restore endpoints** — Not built this phase. Could be a follow-up BD issue.
- **Admin deleted-record manager** — Future phase.
- **deletedById tracking** — Future enhancement.
- **Event sourcing / hard-delete log** — Far future.
