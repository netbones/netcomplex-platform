# Plan 101-02 — Route-level Soft-Delete Enforcement (Primary Entities)

## Goal

Convert all DELETE/GET/LIST/PATCH handlers for primary domain entities to soft-delete pattern.

## What Was Built

### Task 1 — 8 Primary Entity Routes

| File                          | Changes                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `content/[id]/route.ts`       | imported notDeleted+apiGone; GET notDeleted(contents); PATCH 410 guard; DELETE soft                             |
| `announcements/[id]/route.ts` | same 3 patterns                                                                                                 |
| `events/[id]/route.ts`        | same 3 patterns                                                                                                 |
| `resources/[id]/route.ts`     | same 3 patterns                                                                                                 |
| `competitions/[id]/route.ts`  | same 3 patterns                                                                                                 |
| `groups/[id]/route.ts`        | **bug fix**: DELETE was hard-deleting → now soft; GET notDeleted(groups+groupMembers) on joins; PATCH 410 guard |
| `groups/route.ts`             | GET list: added notDeleted(groups) alongside isActive filter                                                    |

### Task 2 — 5 Secondary Routes

| File                                        | Changes                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `messages/route.ts`                         | isDeleted→deletedAt: notDeleted() for GET, isNotNull() for pruning cron |
| `community-services/listings/[id]/route.ts` | all 3 patterns + 410 guard                                              |
| `maintenance/teams/[id]/route.ts`           | **removed conditional branching**: always soft-delete via deletedAt     |
| `maintenance/categories/[id]/route.ts`      | same: removed conditional, always soft-delete                           |
| `maintenance/providers/[id]/route.ts`       | same: removed conditional, always soft-delete                           |

### Verification

- Typecheck: zero errors
- `grep 'isDeleted' src/app/api/messages/`: zero matches
- `grep 'db.delete'` in all converted files: zero matches
- Maintenance entities: `isActive` untouched (preserved for lifecycle)
