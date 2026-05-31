---
phase: 39-competition-entries
plan: 02
type: execute
subsystem: competition-entries
tags: [trpc, api, drizzle, notifications]
requires: [39-01]
provides: [competition tRPC router with 9 procedures]
affects: [src/server/routers/competitions.ts, src/server/routers/index.ts, src/shared/api/db.ts]
tech-stack:
  added: [competitionRouter with 9 procedures]
  patterns: [tRPC router with OpenAPI metadata, Zod I/O schemas, tenant isolation via ctx.tenantId]
key-files:
  created:
    - src/server/routers/competitions.ts
  modified:
    - src/server/routers/index.ts
    - src/shared/api/db.ts
decisions:
  - inArray from drizzle-orm used directly (not dynamic import) for performance
  - Winner notifications create records via db.insert(notifications) using existing Notification model
  - Fisher-Yates shuffle for fair RAFFLE winner selection
metrics:
  duration: ~20 min
  completed_date: 2026-05-31
---

# Phase 39 Plan 02: tRPC Competition Router — Summary

Created the competition tRPC router with 9 procedures covering public listing, detail view, joining RAFFLE competitions, submitting PHOTO entries, admin participant listing, entry updates, winner marking, random winner drawing, and public winner listing. All procedures use Zod DTOs, tenant isolation, and OpenAPI metadata.

## Procedures

1. **listPublicCompetitions** (public) — Active competitions with participant counts and recent avatars
2. **getCompetitionDetail** (public) — Single competition with participant info
3. **joinCompetition** (protected) — Join RAFFLE competition with validation (maxParticipants, duplicate check, date range)
4. **submitPhotoEntry** (protected) — Submit PHOTO entry with URL and description
5. **listParticipants** (admin) — All participants with user data
6. **updateEntry** (admin) — Update score/status/prize
7. **markWinner** (admin) — Mark entry as WINNER with notification creation
8. **drawWinners** (admin) — Fisher-Yates shuffle random draw with notifications
9. **listWinners** (public) — Winners with rank (WINNER/RUNNER_UP)

## Deviations from Plan

No deviations — plan executed as written.

## Self-Check: PASSED

- [x] competition.ts created with 9 tRPC procedures
- [x] Router registered in appRouter as `trpc.competitions.*`
- [x] competitionEntries imported/exported in shared db.ts
- [x] TypeScript compiles without new errors
- [x] All procedures use Zod I/O schemas with OpenAPI metadata
- [x] Tenant isolation via ctx.tenantId
- [x] Winner notifications via db.insert(notifications)
