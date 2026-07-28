---
title: Directory Context
status: current
reviewed: 2026-07-28
tags: [context-map, bounded-context]
audience: developer
---

# Directory Context

> **Last updated:** 2026-06-01

## Purpose

Community directory — merges User + Seat + Profile data for resident display, property lookup, and household membership.

## Directory

`src/entities/directory/`

## Key Models

| Model                 | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `Resident`            | Derived display concept: User + Seat + Profile merged for directory UI |
| `Property`            | Stripped-down property view: `street`, `unit`, `homeImage`             |
| `Landlord`            | Property owner/manager: `name`, `contactEmail`, `contactPhone`         |
| `ViewMode`            | Directory display mode toggle                                          |
| `FilterType`          | Directory filter categories                                            |
| `ResidentFilterState` | Filter state for directory search                                      |

## Exports

- `Resident`, `Property`, `Landlord` types
- `UnifiedResidentCard` component
- `useResidentFilter` hook (features-level)

## Dependencies

- **Tenant** — property/seat data, permissions
- **User** — user identity for resident cards

## API Surface

- REST: `/api/directory/*`, `/api/residents/*`

## Prisma Models

`Property`, `Household`, `Profile` (shared with Tenant context)

## Open Issues

- [ ] Property type uses `street`/`unit` instead of `streetAddress`/`unitNumber` — conflicts with tenant entity and Prisma schema (see UBIQUITOUS_LANGUAGE.md C1)
- [ ] `Resident` is a convenience wrapper, not a DB model — this is intentional but undocumented
