# Admin Context

> **Last updated:** 2026-06-01

## Purpose

Purpose-built admin layer with command bar, activity stream, and domain navigation.

## Directory

`src/entities/admin/`

## Key Models

| Model         | Description                       |
| ------------- | --------------------------------- |
| `AdminTab`    | Admin navigation tab definition   |
| `AdminWidget` | Admin dashboard widget definition |

## Exports

- `AdminLayer`, `AdminCommandBar`, `AdminActivityStream` UI components
- **Re-exports** `Tenant` and `TierLevel` from tenant entity

## Dependencies

- **Tenant** — re-exports types, uses permissions
- **All entity contexts** — admin layer aggregates admin actions across all domains

## API Surface

- REST: `/api/admin/*`

## Prisma Models

None

## Open Issues

- [ ] Re-exports `Tenant` and `TierLevel` from tenant — should import directly from tenant entity instead (see CONTEXT_MAP.md boundary issue)
