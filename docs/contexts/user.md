---
title: User / Identity Context
status: current
reviewed: 2026-07-28
tags: [context-map, bounded-context]
audience: developer
---

# User / Identity Context

> **Last updated:** 2026-06-01

## Purpose

Authentication identities, user profiles, invitations, and seat assignments.

## Directory

`src/entities/user/`, `src/server/routers/identity.ts`

## Key Models

| Model              | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `AdminUser`        | Full user record for admin views                                    |
| `Invitation`       | User invitation with `residentType`                                 |
| `SeatInfo`         | Union: `{ type: 'standard', seatId }` or `{ type: 'solo', seatId }` |
| `AdminUserProfile` | Extended user profile for admin                                     |
| `AdminSuspension`  | Suspension data with reason + dates                                 |

## Exports

- `AdminUser`, `Invitation`, `SeatInfo`, `PropertyInfo` types

## Dependencies

- **Tenant** — permissions, role resolution, seat types
- **Directory** — Property info for user display (via `PropertyInfo`)

## API Surface

- tRPC: `identity` router (12 procedures)
- REST: `/api/users/*`, `/api/auth/*`

## Prisma Models

`User`, `Invitation`

## Open Issues

- [ ] `PropertyInfo` uses `propertyId` instead of `id` — inconsistent with Property shape (see UBIQUITOUS_LANGUAGE.md C1)
- [x] ✅ `residentType` overlap resolved — `residencyType` used consistently across models
- [ ] `src/entities/identity/` is deprecated but not removed — logic moved to `src/server/routers/identity.ts`
- [x] ✅ User suspension frontend implemented (`SuspendUserModal`, `UsersListSection`)
