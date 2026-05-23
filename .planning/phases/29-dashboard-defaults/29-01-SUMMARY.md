---
phase: 29-dashboard-defaults
plan: 01
subsystem: dashboard
tags: [widgets, registry, defaults, layout, config]
dependency_graph:
  requires: [widget-store, dashboard-config, widget-registry]
  provides: [default-layouts, widget-registrations, config-entries]
  affects: [widgets.ts, dashboard-config.ts, default-layouts.ts]
tech_stack:
  added: [lucide-react/Wrench, lucide-react/ClipboardList, lucide-react/Users]
  patterns: [Map-based widget registry, role-keyed default layouts, JSON-serialized layout storage]
key_files:
  created:
    - src/widgets/dashboard/model/default-layouts.ts
  modified:
    - src/widgets/dashboard/model/widgets.ts
    - src/entities/widget/model/dashboard-config.ts
decisions:
  - "'manager' is not a valid WidgetManifest permissions role — mapped to ['admin', 'board'] for maintenance-list and maintenance-analytics"
  - 'MaintenanceList is a named export (not default) — lazy() uses .then(m => ({ default: m.MaintenanceList }))'
  - 'All 6 admin core widgets use direct named exports, not AdminWidgetRenderer wrapper'
  - 'announcements-stream was also missing from dashboard-config.ts — added with page.news feature key'
  - 'BOARD overview expanded from 3 to 5 widgets to meet minimum 4 requirement'
  - 'COMMITTEE and MANAGER roles alias to BOARD and ADMIN defaults respectively'
metrics:
  duration: ~15min
  completed: 2026-05-22
---

# Phase 29 Plan 01: Widget Registration & Default Layouts Summary

Role-seeded default dashboard layouts with 9 newly registered widgets and complete config coverage.

## Confirmed Discovery Answers

**Q1 — Layout item shape:**

- `WidgetLayout` = `{ x: number; y: number; width: number; height: number; isCollapsed: boolean; lastHeight?: number }`
- `WidgetLayouts` = `{ [tabId: string]: { [widgetId: string]: WidgetLayout } }`
- `UserWidgets` = `{ [tabId: string]: string[] }`

**Q2 — Tab identity storage:**

- `dashboardLayout` is `string | null` where the string is `JSON.stringify({ layouts: WidgetLayouts, userWidgets: UserWidgets })`
- Both maps are keyed by tabId

**Q3 — Tab identifiers (from DashboardPage.tsx DEFAULT_TABS):**

- `overview`, `maintenance`, `bookings`, `services`, `content`, `premium`

**Q4 — dashboardLayout storage on user:**

- `string | null` — confirmed from widget-store.ts line 194+
- Hydrated via `hydrateFromDatabase()`, persisted via `saveToDatabase()`

## Admin Widget Export Analysis

All 6 admin core widgets use **direct named exports** (not via AdminWidgetRenderer):

- `AdminStatsWidget` from `admin/ui/AdminStatsWidget`
- `AdminActivityWidget` from `admin/ui/AdminActivityWidget`
- `AdminQuickLinksWidget` from `admin/ui/AdminQuickLinksWidget`
- `AdminContentWidget` from `admin/ui/AdminContentWidget`
- `AdminUserWidget` from `admin/ui/AdminUserWidget`
- `AdminSystemWidget` from `admin/ui/AdminSystemWidget`

AdminWidgetRenderer.tsx is a convenience wrapper that renders widgets by ID — not a component aggregator.

## Widget Registration Summary

| Section     | Widget ID             | Permissions  | Icon          |
| ----------- | --------------------- | ------------ | ------------- |
| Maintenance | maintenance-requests  | (none)       | Wrench        |
| Maintenance | maintenance-list      | admin, board | ClipboardList |
| Maintenance | maintenance-analytics | admin, board | BarChart2     |
| Admin Core  | admin-stats           | admin        | BarChart2     |
| Admin Core  | admin-activity        | admin        | Activity      |
| Admin Core  | admin-quick-links     | admin        | Zap           |
| Admin Core  | admin-content         | admin        | FileText      |
| Admin Core  | admin-user            | admin        | Users         |
| Admin Core  | admin-system          | admin        | Settings      |

Total registered widgets: 37 (28 existing + 9 new)

## Config Coverage

- WIDGET_FEATURE_MAP: 10 entries added (9 new + announcements-stream)
- ALL_WIDGETS: 10 DashboardWidget entries added (9 new + announcements-stream)
- Feature keys: maintenance → `page.maintenance`, admin → `page.dashboard`, announcements → `page.news`

## Registry Separation Confirmed

1. **Widget registry** (`widgets.ts` + `registry.ts`) — Modified ✓
2. **Feature/tier registry** (`entities/tenant/api/features/registry.ts`) — NOT modified ✓
3. **Tenant custom sections registry** (`entities/tenant/lib/registry.ts`) — NOT modified ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed "manager" role in permissions**

- **Found during:** Task 1
- **Issue:** `permissions: ['admin', 'board', 'manager']` caused TS2322 — "manager" is not a valid role in WidgetManifest
- **Fix:** Changed to `['admin', 'board']` — manager users typically have admin role
- **Files modified:** widgets.ts
- **Commit:** 7142fe0

**2. [Rule 2 - Missing functionality] Added announcements-stream to dashboard-config.ts**

- **Found during:** Task 2
- **Issue:** Widget registered in widgets.ts but missing from both WIDGET_FEATURE_MAP and ALL_WIDGETS
- **Fix:** Added `announcements-stream: 'page.news'` to WIDGET_FEATURE_MAP and DashboardWidget entry
- **Files modified:** dashboard-config.ts
- **Commit:** 8214b4c

**3. [Rule 2 - Missing functionality] Expanded BOARD overview to 5 widgets**

- **Found during:** Task 3
- **Issue:** Plan specified BOARD overview with only 3 widgets, but plan requirements state "at least 4 widgets on the overview tab"
- **Fix:** Added `notifications` and `recent-activity` to BOARD overview
- **Files modified:** default-layouts.ts
- **Commit:** 34bff41
