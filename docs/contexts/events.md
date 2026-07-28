---
title: Events Context
status: current
reviewed: 2026-07-28
tags: [context-map, bounded-context]
audience: developer
---

# Events Context

> **Last updated:** 2026-06-01

## Purpose

Community event management with CRUD, date filtering, scheduling, and admin controls.

## Directory

`src/entities/events/`

## Key Models

| Model                                         | Description           |
| --------------------------------------------- | --------------------- |
| Types defined in `constants.ts` / `schema.ts` | Event data structures |

## Exports

- `listEvents`, `validateEventFields`, `createEvent` services
- `canManageEvents` permission wrapper

## Dependencies

- **Tenant** — permissions, tenant isolation
- **User** — organizer reference

## API Surface

- REST: `/api/events/*`

## DTOs

- `@shared/api/dto/event.ts`

## Prisma Models

`Event`

## Open Issues

- None currently
