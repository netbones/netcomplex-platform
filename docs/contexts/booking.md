# Booking Context

> **Last updated:** 2026-06-01

## Purpose

Facility booking with time-slot management, status lifecycle, and tenant-configurable facilities.

## Directory

`src/entities/booking/`

## Key Models

| Model             | Description                                         |
| ----------------- | --------------------------------------------------- |
| `Booking`         | Reservation of a Facility for a time period         |
| `BookingStatus`   | `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED` |
| `Facility`        | Bookable amenity (string type)                      |
| `TenantFacility`  | Facility instance scoped to a tenant                |
| `BookingFormData` | Form payload for creating a booking                 |

## Exports

- `getTenantFacilities`, `validateFacility`, CRUD services
- `canViewAllBookings` permission wrapper
- `StatusBadge`, `FacilityBadge`, `BookingCard` UI components

## Dependencies

- **Tenant** — permissions, tenant isolation, feature gate
- **User** — booking `userId` reference

## API Surface

- REST: `/api/bookings/*`, `/api/facilities/*`

## DTOs

- `@shared/api/dto/booking.ts`

## Prisma Models

`Booking`, `Facility`

## Widget

- `src/widgets/booking/` — booking dashboard widget

## Open Issues

- None currently
