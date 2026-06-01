# Maintenance Context

> **Last updated:** 2026-06-01

## Purpose

Maintenance request lifecycle management with 7-status workflow, ticket numbering, team assignment, and service provider tracking.

## Directory

`src/entities/maintenance/`

## Key Models

| Model                 | Description                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `MaintenanceRequest`  | Core request entity with 7-status lifecycle                                                          |
| `MaintenanceStatus`   | `SUBMITTED` → `ACKNOWLEDGED` → `IN_PROGRESS` → `AWAITING_PARTS`/`SCHEDULED` → `COMPLETED` → `CLOSED` |
| `MaintenancePriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT`                                                                    |
| `MaintenanceTeam`     | `INTERNAL`, `EXTERNAL`, `CONTRACTOR`                                                                 |
| `ServiceProvider`     | External service provider: `name`, `specialties[]`, `contactInfo`                                    |
| `MaintenanceCategory` | `PLUMBING`, `ELECTRICAL`, `HVAC`, `GENERAL`, `STRUCTURAL`, `PEST_CONTROL`, `OTHER`                   |
| `TicketAssignment`    | Assignment data within a request                                                                     |

## Exports

- Full type system for maintenance domain
- DB query layer (CRUD, assignment, history)
- `canViewAllRequests`, `canManageRequests` permission wrappers

## Dependencies

- **Tenant** — permissions, tenant isolation
- **User** — `createdBy`, `assignedTo` references
- **Directory** — Property reference for request location

## API Surface

- REST: `/api/maintenance/*`, `/api/maintenance-requests/*`

## DTOs

- `@shared/api/dto/maintenance.ts`

## Prisma Models

`MaintenanceRequest`, `MaintenanceCategory`

## Widget

- `src/widgets/maintenance/` — maintenance dashboard widget

## Current Phase

Phase 40 (3/4 plans complete). Plan 40-04 adds user tracking + HomeLayer integration + seed data.

## Open Issues

- [ ] "Ticket" vs "MaintenanceRequest" dual vocabulary — intentional, documented in UBIQUITOUS_LANGUAGE.md C7
