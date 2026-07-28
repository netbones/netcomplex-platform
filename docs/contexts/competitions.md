---
title: Competitions Context
status: current
reviewed: 2026-07-28
tags: [context-map, bounded-context]
audience: developer
---

# Competitions Context

> **Last updated:** 2026-06-01

## Purpose

Community competitions with entries. Three competition types: raffle, photo, score-based.

## Directory

No dedicated entity directory. Logic lives in `src/server/routers/competitions.ts` + `src/app/(tenant)/competition/`

## Key Models

| Model              | Description                                |
| ------------------ | ------------------------------------------ |
| `Competition`      | Competition definition with type and rules |
| `CompetitionEntry` | Individual entry into a competition        |
| `CompetitionType`  | `RAFFLE`, `PHOTO`, `SCORE`                 |

## Exports

- tRPC: 9 procedures (list, create, enter, draw, etc.)

## Dependencies

- **Tenant** — permissions, tenant isolation
- **User** — participant/creator references

## API Surface

- tRPC: `competitions` router (9 procedures)
- Public UI: `/competition` (cards grid), `/competition/[id]` (detail)
- Admin UI: expandable rows, per-type actions

## DTOs

- `@shared/api/dto/competition.ts`

## Prisma Models

`Competition`, `CompetitionEntry`

## Open Issues

- [ ] No dedicated entity directory — logic is spread across tRPC router, features, and app pages. Should be consolidated into `src/entities/competitions/` for consistency with FSD architecture.
- [ ] ⏳ Missing widget registration in admin dashboard (GAP-11)
