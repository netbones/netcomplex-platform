---
title: Dashboard Phase B: Focus Space Architecture
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Dashboard Phase B: Focus Space Architecture

**Status:** Discussion  
**Depends on:** Phase A (default layouts) complete  
**Type:** GSD — major architectural change  
**Scope:** Resident dashboard, Admin dashboard, routing, widget registry, navigation

---

## Why Phase A Is Not Enough

Phase A solves the blank screen problem. It does not solve the orientation problem.

A user logging in at 9am to deal with a water leak does not benefit from seeing a grid of equal-weight widgets — even a well-populated one. The dashboard needs to understand _intent_ and _context_, not just fill space.

The deeper problem with the current tab model:

- **Tabs treat all domains as equal.** Maintenance, Events, and Competitions share the same navigation weight. They are not equal in frequency, urgency, or importance.
- **10 admin tabs exceeds cognitive load.** The Navigation Governance doc sets the standard: complexity belongs inside workflows, not in navigation chrome.
- **Admin and resident dashboards are architecturally separate** when they should be the same surface with role-sensitive layers. This creates maintenance debt and inconsistent UX.
- **Widgets without context become noise.** A widget for "recent surveys" and a widget for "open maintenance requests" sitting side by side sends no signal about what matters most right now.

---

## The Focus Space Model

A Focus Space is a full-screen, domain-scoped working environment. Users navigate _into_ a space intentionally, work there, and return to the Home layer when done.

This is distinct from tabs in one important way: **spaces are destinations, not filters.** A tab bar says "here are categories of content." A space says "you are now in the Maintenance workspace."

### Layer 1 — The Home Layer

The surface a user sees on login. It is read-oriented and role-aware.

It has three zones:

**Urgency Zone (top)**

- Urgent announcements (priority: urgent only)
- Overdue maintenance requests (if resident: mine; if admin: all)
- Unread message count
- Nothing else. If there is nothing urgent, this zone collapses.

**Today Zone (middle)**

- Bookings happening today
- Events happening today or tomorrow
- Pending actions requiring the user's response (survey invitations, group membership requests, etc.)

**Activity Zone (bottom)**

- Recent activity feed
- Community announcements (non-urgent)
- Latest news/content
- My content

The Home layer contains **no forms, no tables, no management UI**. It is a newspaper, not a control panel. Every item in it is either informational or a link that takes you into the relevant Focus Space for action.

### Layer 2 — Focus Spaces

Each space is a full-context working environment. The user navigates to it from the Home layer or from a global space launcher.

| Space           | Resident entry                              | Admin/Board entry                         |
| --------------- | ------------------------------------------- | ----------------------------------------- |
| **My Home**     | My property, household, profile             | —                                         |
| **Maintenance** | Submit request, track my requests           | All requests, assign, schedule, analytics |
| **Community**   | Events, news, groups, surveys, competitions | + Moderate, manage, publish               |
| **Messages**    | Conversations, inbox                        | + Broadcast, announcements                |
| **Services**    | Browse and enquire                          | + Manage listings, moderation             |
| **Admin**       | —                                           | Users, system, settings, analytics        |

Key architectural principle: **the admin view of a space is the resident view plus a management layer.** There is no separate "admin dashboard" — there is a dashboard that shows more surfaces to roles with higher permissions.

This eliminates the current parallel-track architecture where resident tabs and admin tabs are maintained independently.

### Layer 3 — Widget Customisation (preserved)

Within each space, the widget grid remains. Users can still customise their layout inside a space. Phase A default layouts continue to work — they become the defaults _per space_ rather than defaults for the whole dashboard.

The difference: widgets are now contextually grouped. The maintenance space only shows maintenance-relevant widgets. The community space shows events, surveys, competitions, and content widgets. This prevents the current situation where a user can accidentally place an admin analytics widget next to a personal messages widget.

---

## Navigation Mechanics

### The Space Launcher

A persistent element — sidebar on desktop, bottom bar on mobile — that shows the available spaces for the user's role. Think of it as the macOS dock or Proton's left rail.

It does not replace the global header. The header remains as defined in Navigation Governance. The launcher is internal to the authenticated experience only.

Desktop: left sidebar, icon + label, collapsible to icon-only.  
Mobile: bottom navigation bar, 4–5 items visible, overflow in "more".

### Routing

Current: `/dashboard` with tab state managed in client.  
Phase B: `/dashboard` (home layer) + `/dashboard/[space]` per focus space.

```
/dashboard                    → Home layer
/dashboard/maintenance        → Maintenance space
/dashboard/community          → Community space
/dashboard/messages           → Messages space
/dashboard/services           → Services space
/dashboard/admin              → Admin space (role-gated)
/dashboard/admin/users        → Users sub-space
/dashboard/admin/system       → System sub-space
```

This makes spaces deep-linkable, shareable, and bookmarkable. It also makes the back button work correctly — currently navigating between tabs does not create browser history entries in most implementations.

### The Admin Space

Rather than 10 admin tabs, the Admin space has a **sub-launcher**: a grid of management domains the admin can enter. This is where the Proton icon-grid metaphor is most useful — not at the top level, but within the Admin space.

```
Admin Space sub-launcher:
┌─────────────┬─────────────┬─────────────┐
│    Users    │  Maintenance│   Content   │
├─────────────┼─────────────┼─────────────┤
│   Events    │  Competitions│  Resources  │
├─────────────┼─────────────┼─────────────┤
│   Surveys   │ Announcements│   System    │
└─────────────┴─────────────┴─────────────┘
```

Each icon is a deep link to `/dashboard/admin/[domain]`. The admin overview widgets (stats, activity, quick links) appear above the sub-launcher on the Admin space home.

---

## What Changes vs. What Stays

### Stays the same

- Widget component files (all of `src/widgets/`)
- Widget registry (`widgets.ts`, `registry.ts`)
- Phase A default layouts (promoted to per-space defaults)
- All API routes
- Navigation Governance rules (header, footer, burger)
- `DraggableWidget`, `WidgetRenderer`, `WidgetCard`

### Changes

- `DashboardTabs.tsx` → replaced by `SpaceLauncher` + `SpaceLayout` components
- `DashboardPage.tsx` → splits into `HomeLayer` + `[space]/page.tsx` per space
- Routing: `/dashboard` becomes a proper nested route group
- `widget-store.ts` → layout stored per-space, not globally: `{ maintenance: LayoutItem[], community: LayoutItem[], ... }`
- `dashboard-config.ts` → widgets gain a `spaces: SpaceId[]` field declaring which spaces they belong to
- `AddWidgetModal` → filters widget picker by current space

### New files

- `src/widgets/dashboard/ui/SpaceLauncher.tsx`
- `src/widgets/dashboard/ui/HomeLayer.tsx`
- `src/widgets/dashboard/ui/SpaceLayout.tsx`
- `src/widgets/dashboard/model/spaces.ts` (space definitions, permissions, default widgets)
- `src/app/(tenant)/dashboard/[space]/page.tsx`

---

## Data Model Implications

`user.dashboardLayout` is currently a flat JSON blob. Phase B requires it to become a map of space → layout:

```typescript
// Current
dashboardLayout: LayoutItem[] | null

// Phase B
dashboardLayout: {
  [spaceId: string]: LayoutItem[]
} | null
```

Migration: On first load after deploy, if `dashboardLayout` is a flat array (legacy format), the system migrates it to `{ home: <legacy array> }`. This is a non-destructive client-side migration — the shape is stored back on next save.

No database schema change required. The `Json?` column type in Prisma accommodates this.

---

## Open Questions Before Planning

These need decisions before a GSD phase plan can be written:

1. **Mobile bottom bar slots**: With spaces for Maintenance, Community, Messages, Services, and Admin — that is 5 items plus Home. On mobile this is one over the comfortable limit. Do we merge Services into Community, or accept 6 with a "More" overflow?

2. **Space permissions and tenant module gating**: If a tenant has disabled Competitions, the Community space should not show the Competitions widget. Should space availability itself be module-gated (i.e., if all widgets in a space are disabled, hide the space from the launcher)? Or always show spaces and show empty states inside?

3. **Resident "My Home" space**: This maps to property/household/profile data. It is currently spread across the directory, profile pages, and dashboard. Should Phase B consolidate these into a single resident home space, or leave profile pages as-is and only surface summary widgets?

4. **Announcement integration**: Phase 11 just built Announcements as a standalone admin section. In the Focus Space model, announcements belong in the Messages or Community space. Does Phase B absorb the announcements admin UI into the Community space management layer, or leave it as a standalone admin route and just surface a widget in the relevant space?

5. **Transition strategy**: Do we build Phase B alongside the existing tab dashboard and switch with a feature flag, or do we replace in-place? The feature flag approach is safer but doubles maintenance burden during the transition period.

---

## Suggested Phase B Work Breakdown

If approved, this should be structured as a GSD multi-phase block:

**B1 — Space definitions and routing scaffold**  
Define `spaces.ts`, create the route group, build `SpaceLauncher` (no content yet — just navigation). No widget changes. Verifiable by navigating between space URLs.

**B2 — HomeLayer**  
Build the Urgency / Today / Activity three-zone home screen. Wire to existing API routes. No widget grid on the home layer — this is feed/card UI only.

**B3 — Space layouts and widget migration**  
Migrate `widget-store` to per-space layout. Assign widgets to spaces in registry. Per-space defaults using Phase A's default-layouts logic. Verify all existing widgets appear in appropriate spaces.

**B4 — SpaceLayout and DashboardTabs replacement**  
Replace `DashboardTabs` with `SpaceLayout`. Wire `AddWidgetModal` to filter by space. Retire tab navigation.

**B5 — Admin sub-launcher**  
Build the admin icon-grid sub-launcher within the Admin space. Retire admin tab bar.

**B6 — Mobile**  
Bottom nav bar. Space launcher collapsed state. Test all spaces on mobile viewport.

---

## Relationship to Navigation Governance

Phase B is consistent with Navigation Governance. Specifically:

- Focus Spaces are _internal dashboard architecture_ — they do not affect the public header, More dropdown, footer, or burger menu.
- The Space Launcher only appears when authenticated, inside `/dashboard`. It is workspace navigation, not community navigation.
- The Admin space launcher is role-gated and never leaks into public UX.
- The principle "operational functionality should surface through dashboards, widgets, feeds" is fulfilled more completely by the Home Layer model than by the current tab grid.

One addition to Governance will be needed: a section on **Workspace Navigation** (the Space Launcher) as a fifth navigation layer, alongside the existing four (Public, Community, Workspace, Administrative). The Space Launcher is the navigation chrome for the workspace layer.

---

## Decision Required

To proceed to Phase B planning:

- [ ] ⏳ Confirm mobile slot decision (question 1 above)
- [ ] ⏳ Confirm space/module gating approach (question 2)
- [ ] ⏳ Confirm transition strategy — feature flag or in-place (question 5)
- [ ] ⏳ Confirm Phase A is complete and stable before B1 begins
