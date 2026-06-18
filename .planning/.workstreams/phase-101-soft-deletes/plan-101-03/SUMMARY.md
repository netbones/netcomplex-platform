# Plan 101-03 — Secondary Routes + Stats + Purge

## Goal

Complete route coverage for remaining entities, update stats aggregation queries, and create 90-day auto-purge endpoint.

## What Was Built

### Task 1 — 4 Secondary Entity Routes

| File                                       | Changes                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| `households/[id]/route.ts`                 | notDeleted(households) GET; 410 guard PATCH; DELETE soft |
| `invitations/[id]/route.ts`                | DELETE converted to soft-delete                          |
| `groups/membership-requests/[id]/route.ts` | 410 guard on POST; notDeleted                            |
| `notifications/route.ts`                   | notDeleted(notifications) GET + PATCH; 410 guard         |

### Task 2 — Stats Filtering

| File               | Changes                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `stats/route.ts`   | notDeleted(groups) + notDeleted(contents) alongside existing isActive/category filters |
| `data-fetching.ts` | no changes needed (delegates to API routes)                                            |

### Task 3 — Purge Endpoint (NEW)

`src/app/api/purge/route.ts`:

- Auth: Better Auth session + hasPermission('admin')
- 90-day cutoff: `new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)`
- Permanently deletes soft-deleted messages older than cutoff
- Returns `{ purged: { messages: N } }`
- `maxDuration = 60` for long-running cron execution

### Verification

- Typecheck: zero errors
- All 18 CONTEXT.md decisions (D-01 through D-18) implemented
