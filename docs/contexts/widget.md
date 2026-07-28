# Widget Context

> **Last updated:** 2026-06-01

## Purpose

Dashboard state management — widget registry, layout persistence, default configurations, and Focus Space architecture.

## Directory

`src/entities/widget/`

## Key Models

| Model             | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `WidgetLayouts`   | Per-space widget layout configuration                     |
| `UserWidgets`     | Per-user persisted widget state (stored in settings JSON) |
| `DashboardConfig` | Dashboard-level configuration                             |

## Exports

- `WidgetRegistry` class — O(1) map lookups, manifest-driven feature flags
- `widget-store.ts` — Zustand store for widget state
- `default-layouts.ts` — Role-seeded default layouts per space
- `tab-migration-map.ts` — Legacy tab → space mapping

## Dependencies

- **Tenant** — feature gate, role-based layouts
- **All entity contexts** — widgets display data from maintenance, booking, chat, etc.

## API Surface

- REST: `/api/widgets/*`, `/api/dashboard/*`

## Prisma Models

None — state persisted via settings JSON.

## Architecture

5 Focus Spaces: `home`, `services`, `community`, `messages`, `admin`

- HomeLayer: three-zone landing page
- AdminLayer: purpose-built admin with command bar + activity stream
- MobileSpaceBar: mobile navigation

## Open Issues

- [ ] **Tab → Space migration incomplete** — `widget-store.ts` still uses `tabId` keys; `admin-config.ts` has `DashboardTab[]` type (Phase 31 will resolve)
- [ ] ⏳ Phase 38 (ServicesLayer + MessagesLayer) planned but not started
