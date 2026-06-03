---
phase: dashboard-defaults
plan: phase-a
type: execute
wave: 1
depends_on: []
files_modified:
  - src/widgets/dashboard/model/default-layouts.ts
  - src/widgets/dashboard/model/widgets.ts
  - src/widgets/dashboard/model/registry.ts
  - src/entities/widget/model/widget-store.ts
  - src/widgets/dashboard/ui/DashboardPage.tsx (via page-modules)
  - src/page-modules/dashboard/ui/DashboardPage.tsx
autonomous: true
requirements:
  - DASH-DEFAULT-01
  - DASH-DEFAULT-02
  - DASH-DEFAULT-03
must_haves:
  truths:
    - 'Every role has a seeded default layout that renders on first login without any user action'
    - 'Default layouts are opinionated and content-rich — not empty or minimal'
    - 'User customisation still works and overrides defaults once saved'
    - 'Admin and resident defaults are distinct and role-appropriate'
    - 'Null or empty dashboardLayout in user record triggers default injection, not a blank screen'
---

<objective>
Implement role-seeded default dashboard layouts so every user sees a useful, populated dashboard on first login.

Purpose: The current system relies entirely on user customisation to produce a working layout. Users rarely customise, so they see a near-empty screen. The fix is to define opinionated default widget layouts per role that load automatically when dashboardLayout is null or empty, while preserving the ability to customise.

Output: A default-layouts.ts module, integration into the dashboard loading path, and verified behaviour for RESIDENT and ADMIN roles at minimum.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/widgets/dashboard/model/widgets.ts
@src/widgets/dashboard/model/registry.ts
@src/widgets/dashboard/model/types.ts
@src/entities/widget/model/widget-store.ts
@src/entities/widget/model/dashboard-config.ts
@src/page-modules/dashboard/ui/DashboardPage.tsx
@src/widgets/dashboard/ui/DashboardTabs.tsx
@src/widgets/dashboard/ui/WidgetRenderer.tsx
@src/widgets/dashboard/ui/DraggableWidget.tsx
@src/shared/api/auth.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Create default-layouts.ts with role-seeded widget configurations</name>
<files>
  src/widgets/dashboard/model/default-layouts.ts
</files>
<action>
Create `src/widgets/dashboard/model/default-layouts.ts`.

This module exports a `DEFAULT_LAYOUTS` map keyed by `Role` (from the Prisma/Drizzle Role enum: RESIDENT, BOARD, ADMIN, COMMITTEE, MANAGER) and a `getDefaultLayout(role: Role): WidgetLayout[]` helper that falls back to the RESIDENT layout for any unrecognised role.

Each layout entry must match whatever shape `dashboardLayout` currently stores in the `user` model — inspect `src/entities/widget/model/widget-store.ts` and `src/widgets/dashboard/model/types.ts` first to confirm the exact type before writing. Do not invent a new shape; match the existing one.

### RESIDENT default layout

Ordered from top to bottom, left to right. Prioritise information density at the top, action surfaces in the middle, ambient/social content at the bottom.

Widgets to include (use the exact widget IDs registered in `src/widgets/dashboard/model/widgets.ts`):

1. `quick-stats` — full width, top row. Shows property count, open maintenance requests, unread messages, upcoming bookings at a glance.
2. `quick-actions` — left third, second row. Common actions: Submit Maintenance, Book Facility, View Messages, View Events.
3. `notifications` — right two-thirds, second row. Recent notifications panel.
4. `recent-activity` — full width, third row. Activity feed.
5. `events` — left half, fourth row. Upcoming community events.
6. `messages` — right half, fourth row. Recent messages/conversations.

If any of these widget IDs do not exist in the registry, use the closest available equivalent — do not create new widget registrations in this task.

### BOARD / COMMITTEE default layout

Weighted toward visibility of community health and pending actions.

1. `admin-stats` — full width, top.
2. `admin-quick-links` — left quarter, second row.
3. `admin-activity` — right three-quarters, second row.
4. `maintenance-requests` — left half, third row. Pending/open requests.
5. `events` (admin variant if available, else standard) — right half, third row.
6. `admin-surveys` or `admin-announcements` — full width, fourth row.

### ADMIN / MANAGER default layout

Operational view — maximum information density.

1. `admin-stats` — full width, top.
2. `admin-quick-links` — left quarter.
3. `admin-user` — centre, second row.
4. `admin-activity` — right quarter, second row.
5. `maintenance-requests` — left third, third row.
6. `admin-content` — centre third, third row.
7. `admin-surveys` or `admin-announcements` — right third, third row.
8. `admin-system` — full width, bottom.

Adapt column/row values to the actual grid system in use (inspect `DraggableWidget.tsx` and the existing layout shape to determine whether the grid is react-grid-layout, a custom system, or CSS-based, and use the correct coordinate/size fields).
</action>
<verify>
<automated>cd /home/ubuntupunk/Projects/soralia-village && pnpm exec tsc --noEmit --pretty 2>&1 | head -40</automated>
<manual>default-layouts.ts exports DEFAULT_LAYOUTS and getDefaultLayout. Types match existing widget layout shape exactly. No new widget IDs invented that don't exist in the registry.</manual>
</verify>
<done>default-layouts.ts exists, exports getDefaultLayout(role), and defines non-trivial layouts for RESIDENT, BOARD/COMMITTEE, and ADMIN/MANAGER roles using only widget IDs present in the registry.</done>
</task>

<task type="auto">
<name>Task 2: Integrate default layouts into the dashboard loading path</name>
<files>
  src/page-modules/dashboard/ui/DashboardPage.tsx
  src/entities/widget/model/widget-store.ts
</files>
<action>
Locate where the dashboard reads `dashboardLayout` from the user record and hydrates the widget grid. This is likely in `src/entities/widget/model/widget-store.ts` (Zustand store) or `src/page-modules/dashboard/ui/DashboardPage.tsx`.

The injection point: wherever the layout is read from the user session/API response, add a fallback:

```typescript
import { getDefaultLayout } from '@/widgets/dashboard/model/default-layouts';

// Where layout is resolved:
const resolvedLayout = user.dashboardLayout ?? getDefaultLayout(user.role);
```

Rules:

- `null` dashboardLayout → inject default for role
- `undefined` dashboardLayout → inject default for role
- Empty array `[]` dashboardLayout → inject default for role (empty array means "user cleared their layout", treat same as null)
- Non-empty dashboardLayout → use as-is (user has customised)

Do NOT modify the save/persist path. When a user reorders or adds widgets, their layout still saves to `dashboardLayout` on the user record as before. The default only applies at read time when the stored value is absent or empty.

If the layout loading happens inside a Zustand store initialisation, add the fallback there in the hydration step. If it happens in the page component, add it in the data-fetching/useEffect layer before passing layout to the widget renderer.

Do not touch `DraggableWidget.tsx`, `WidgetRenderer.tsx`, or any widget component files — only the loading/hydration layer.
</action>
<verify>
<automated>cd /home/ubuntupunk/Projects/soralia-village && pnpm exec tsc --noEmit --pretty 2>&1 | head -40</automated>
<manual>

- Sign in as a RESIDENT user with null dashboardLayout → dashboard renders with the seeded default layout (quick-stats, quick-actions, notifications, activity, events, messages).
- Sign in as an ADMIN user with null dashboardLayout → dashboard renders with the admin default layout.
- A user who has previously customised their layout → their custom layout still loads, default is not injected.
- Saving a layout change still persists correctly.
  </manual>
  </verify>
  <done>Dashboard reads getDefaultLayout(role) when dashboardLayout is null/undefined/empty. Existing customised layouts are unaffected. TypeScript compiles clean.</done>
  </task>

<task type="auto">
<name>Task 3: Add a "Reset to default layout" action</name>
<files>
  src/widgets/dashboard/ui/DashboardTabs.tsx
  src/app/api/users/[id]/route.ts (or wherever user dashboardLayout is persisted)
</files>
<action>
Add a "Reset layout" affordance so users can return to the role default after customising.

1. In the dashboard UI (likely in `DashboardTabs.tsx` or a dashboard toolbar component), add a small "Reset layout" button/link. It should be visually secondary — not prominent — to avoid accidental use. Place it near the existing widget customisation controls (add widget button or similar).

2. On click, the action should:
   - Set `dashboardLayout` to `null` (or `[]`) in the Zustand store so the UI immediately re-renders with the default.
   - Persist `null` to the user record via the existing user update API route (PATCH `/api/users/[id]` with `{ dashboardLayout: null }`).

3. Add a simple confirmation — either a `window.confirm` or a brief inline "Are you sure? This will reset your layout." — before executing, to prevent accidental resets.

Do not build a modal for this. Keep it minimal.
</action>
<verify>
<automated>cd /home/ubuntupunk/Projects/soralia-village && pnpm exec tsc --noEmit --pretty 2>&1 | head -40</automated>
<manual>Reset layout button appears in dashboard UI. Clicking it (and confirming) immediately re-renders the role default. After page refresh, default layout still shows (null was persisted).</manual>
</verify>
<done>Reset layout button exists in dashboard toolbar. Clears dashboardLayout to null in store and API. Dashboard re-renders with role default immediately.</done>
</task>

</tasks>

<verification>
- New RESIDENT user (null dashboardLayout) sees a populated dashboard with at minimum 5 widgets on first load
- New ADMIN user sees an operations-weighted default layout
- User with existing custom layout is unaffected
- Reset layout clears to default correctly
- `pnpm exec tsc --noEmit` passes with zero errors
- `pnpm run lint` passes
</verification>

<success_criteria>

- No user ever sees a blank or near-empty dashboard due to a missing layout
- Role-appropriate content is foregrounded by default
- Customisation capability is fully preserved
- Zero TypeScript errors introduced
  </success_criteria>

<output>
After completion, create `.planning/phases/dashboard-defaults/phase-a-SUMMARY.md` summarising:
- Which widget IDs were used for each role default
- Where the injection point was found and how it was implemented
- Any widget IDs that were absent from the registry and what substitutions were made
</output>
