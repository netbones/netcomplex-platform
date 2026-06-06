# Phase 48: Admin Chrome Parity — Research

**Researched:** 2026-06-04
**Domain:** Next.js 15 App Router layout composition (no API, no DB)
**Confidence:** HIGH

## Summary

The work is a pure Next.js App Router composition problem: a single shared client component (`SpaceChrome`) that wraps the existing `SpaceLauncher` + `<main>` + `MobileSpaceBar` triple, mounted by a new `src/app/(tenant)/admin/layout.tsx` and reused by the existing `src/app/(tenant)/dashboard/layout.tsx`. Three small model edits (`getActiveSpaceId` recognizes `/admin/*`; `SpaceDefinition` gains an explicit `href`; `MobileSpaceBar.isActive` recognizes `/admin` prefix) complete the integration.

The recommended approach is **Approach 1: Shared layout component** (extract a `SpaceChrome` client component, create `admin/layout.tsx`, update `dashboard/layout.tsx` to consume the shared component). This is the lowest-risk option: zero file moves, zero URL changes, zero impact on any of the 27 existing admin sub-pages, and trivially satisfies ADMIN-CHROME-04 because the new `<main>` is a passthrough (no padding, no max-width — pages keep their own wrappers).

**Primary recommendation:** Create `src/widgets/dashboard/ui/SpaceChrome.tsx` (extract chrome from `dashboard/layout.tsx`), create `src/app/(tenant)/admin/layout.tsx` that renders `<SpaceChrome>`, refactor `dashboard/layout.tsx` to use the same component, add `href` to `SpaceDefinition` (admin → `/admin`, others → `/dashboard/<id>`), and update `getActiveSpaceId` so `/admin` and `/admin/*` resolve to the `admin` space.

## User Constraints (from CONTEXT.md / phase goal)

> No CONTEXT.md exists yet for Phase 48. Constraints are derived from the phase description in `.planning/ROADMAP.md` (lines 849–861) and the research brief.

### Locked Decisions (from ROADMAP + brief)

- Goal: extend SpaceLauncher + MobileSpaceBar to all `/admin/*` for ADMIN users.
- Out of scope: restructuring AdminLayer internals; changing the `widgets/dashboard/model/spaces.ts` registry semantics; platform admin routes under `(platform)/admin/platform/*` (different route group, different chrome contract).
- Pure App Router layout composition — no API or DB changes.
- Must satisfy five named requirements: ADMIN-CHROME-01 through -05 (see "Phase Requirements" below).
- AdminLayer already renders its own `p-6 max-w-5xl mx-auto` (line 149 of `src/widgets/dashboard/ui/AdminLayer.tsx`); the new chrome must not double-pad or double-constrain width.
- `(tenant)/dashboard/layout.tsx` is `'use client'` (uses `useState`, `usePathname`, `authClient.useSession`, `usePageFlags`); any extracted shared component must remain client-side.

### the agent's Discretion

- Choice of approach (shared component vs route group restructure vs tenant-layout conditional).
- Where to extract the active-space derivation function for unit-testability.
- Whether to also centralize space hrefs via `SpaceDefinition.href` (recommended) or a helper function.
- Naming of the extracted chrome component (proposed: `SpaceChrome`).
- Test surface scope.

### Deferred Ideas (OUT OF SCOPE)

- (platform)/admin/platform/\* chrome — separate route group, explicit out-of-scope per ROADMAP.
- Restructuring AdminLayer's internal padding model.
- Changing the spaces model (SPACES registry, getVisibleSpaces, ADMIN_DOMAINS, SERVICES_DOMAINS, MESSAGES_DOMAINS semantics).
- i18n label additions for chrome (none required — existing labels work).
- Stale `/dashboard/admin/[domain]` route — preserved for back-compat; the active-space derivation continues to resolve `/dashboard/admin` to the admin space, but no active link or breadcrumb points there after Phase 37's normalization.

## Phase Requirements

| ID              | Description                                                                       | Research Support                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------- |
| ADMIN-CHROME-01 | SpaceLauncher visible on all `/admin/*` for ADMIN                                 | New `(tenant)/admin/layout.tsx` mounts `<SpaceChrome>` → renders `<SpaceLauncher>` on `hidden md:flex` (md+ breakpoint).                                                                                                                                                                                                                                                                                                  |
| ADMIN-CHROME-02 | MobileSpaceBar visible on mobile breakpoint for `/admin/*`                        | Same `<SpaceChrome>` renders `<MobileSpaceBar>` on `md:hidden` (mobile only).                                                                                                                                                                                                                                                                                                                                             |
| ADMIN-CHROME-03 | active-space derivation works from `/admin/*` pathnames (admin stays highlighted) | `getActiveSpaceId` extended: `pathname === '/admin'                                                                                                                                                                                                                                                                                                                                                                       |     | pathname.startsWith('/admin/')`→`'admin'`. Same change in `MobileSpaceBar.isActive` for the bottom bar's active state. |
| ADMIN-CHROME-04 | no duplicate chrome when nested admin pages already render their own wrappers     | The new `<main>` is a passthrough: `flex-1 min-w-0` only, no padding/max-width (mirroring existing `dashboard/layout.tsx`'s `<main>`). All 27 admin sub-pages already constrain their own width via `max-w-{2xl,3xl,4xl,5xl,6xl,7xl} mx-auto px-{4,6,sm:6} py-{6,8}` — none will double-constrain. AdminLayer at `/admin` uses its own `p-6 max-w-5xl mx-auto` and renders inside the passthrough `<main>` — no conflict. |
| ADMIN-CHROME-05 | no breakage of existing `/dashboard/*` chrome                                     | `dashboard/layout.tsx` is refactored to consume the same `<SpaceChrome>` component; behavior is byte-equivalent. Active-space derivation stays compatible with `/dashboard/<slug>` paths.                                                                                                                                                                                                                                 |

## Architectural Responsibility Map

| Capability                                     | Primary Tier                    | Secondary Tier                     | Rationale                                                                                                                                |
| ---------------------------------------------- | ------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Mounting SpaceLauncher (desktop sidebar)       | App Router layout (server)      | Client component shell             | Sidebar must live across all routes; the layout file picks the chrome; the visible component is client.                                  |
| Mounting MobileSpaceBar (mobile bottom bar)    | App Router layout (server)      | Client component shell             | Same — fixed-positioned bottom bar, must persist across navigations.                                                                     |
| Active-space derivation from `usePathname`     | Client component                | Model utility                      | Pathname is a client-only hook; the derivation function is pure and should live in the model for testability.                            |
| Visible-spaces filtering (role + flags)        | Client component                | Model utility (`getVisibleSpaces`) | Existing pattern; no change.                                                                                                             |
| `useState(collapsed)` for sidebar              | Client component                | —                                  | Local UI state, must live in the chrome component.                                                                                       |
| Per-page width constraints (`max-w-*`)         | Page-level (per admin sub-page) | —                                  | Each page already owns its wrapper; the layout stays width-neutral.                                                                      |
| `Breadcrumbs` per admin sub-page               | Page-level (per admin sub-page) | —                                  | Each admin sub-page already renders its own `<Breadcrumbs>`. The new chrome does not add breadcrumbs — no duplication.                   |
| AdminLayer landing (command bar + domain grid) | Page-level (`admin/page.tsx`)   | —                                  | Renders inside the new `<main>`. Its `p-6 max-w-5xl mx-auto` becomes "the page width" — exactly as it was inside the dashboard `<main>`. |
| Tenant-level concerns (i18n provider, Toaster) | `(tenant)/layout.tsx`           | —                                  | Unchanged. The new admin layout sits inside `(tenant)/layout.tsx` as a child.                                                            |

## Approaches Considered

### Approach 1 — Shared layout component (RECOMMENDED)

**What:** Extract the chrome from `(tenant)/dashboard/layout.tsx` into a new `SpaceChrome` client component in `src/widgets/dashboard/ui/SpaceChrome.tsx`. Create `src/app/(tenant)/admin/layout.tsx` that renders `<SpaceChrome>{children}</SpaceChrome>`. Refactor `dashboard/layout.tsx` to render the same component.

**File moves required:** None. All new files; one file refactored.

**File edits required:**

| File                                          | Change                                                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/widgets/dashboard/ui/SpaceChrome.tsx`    | **NEW** — client component holding `useState(collapsed)`, `usePathname`, `usePageFlags`, `useSession`; renders SpaceLauncher + `<main>` + MobileSpaceBar.                                                |
| `src/app/(tenant)/admin/layout.tsx`           | **NEW** — 6-line client layout: `return <SpaceChrome>{children}</SpaceChrome>;`                                                                                                                          |
| `src/app/(tenant)/dashboard/layout.tsx`       | **EDIT** — delete the local `getActiveSpaceId`, the inline flex/main markup, the SpaceLauncher/MobileSpaceBar imports. Render `<SpaceChrome>{children}</SpaceChrome>`. Body shrinks from 67 → ~10 lines. |
| `src/widgets/dashboard/model/spaces.ts`       | **EDIT** — add `href: string` to `SpaceDefinition`; populate admin → `/admin`, others → `/dashboard/<id>`. Add a `getActiveSpaceId(pathname)` export (moved from layout).                                |
| `src/widgets/dashboard/ui/SpaceLauncher.tsx`  | **EDIT** — replace inline `const href = space.id === 'home' ? '/dashboard' : \`/dashboard/${space.id}\``with`space.href` (line 36).                                                                      |
| `src/widgets/dashboard/ui/MobileSpaceBar.tsx` | **EDIT** — replace inline `isActive` (line 51-56) and `href` ternary (line 72) with helpers that read from `space.href` and recognize `/admin` prefix.                                                   |

**Runtime cost (client/server boundary):** No change. `SpaceChrome` is a client component (same boundary as today's `dashboard/layout.tsx`). It is mounted by an `'use client'` layout, so no extra RSC serialization occurs.

**Re-render cost:** The chrome re-renders on every pathname change (because `usePathname` is a hook). This is identical to today's behavior in `dashboard/layout.tsx`. The `useState(collapsed)` state is preserved across admin sub-route navigations because the layout (and therefore `SpaceChrome`) is not unmounted. This is actually a small UX win vs. today where admin users re-enter a layout with fresh state on every admin page.

**Risk to existing `/dashboard/*` chrome:** Near zero. The new `SpaceChrome` is the same code moved verbatim (plus the admin-route regex and href source). Manual visual diff recommended: desktop sidebar collapse toggle, mobile bar active state, role-based space filtering, no-FOUC of `usePageFlags` initial empty array.

**Ability to satisfy ADMIN-CHROME-04 (no duplicate chrome):** Excellent. The new `<main>` is a passthrough (only `flex-1 min-w-0` + safe-area padding for mobile bottom bar), identical to today's `dashboard/layout.tsx`. AdminLayer's `p-6 max-w-5xl mx-auto` and every admin sub-page's `max-w-* mx-auto` continue to be the only width constraint.

**Effort estimate:** ~1 hour for a single plan. The largest single file is `SpaceChrome.tsx` (≤80 lines, well under the 200-line cap from AGENTS.md).

### Approach 2 — Route group restructure (`(tenant)/(chrome)/admin/...` + `dashboard/...`)

**What:** Create a new shared route group `(tenant)/(chrome)/`. Move all 27 admin sub-routes and all 8 dashboard sub-routes (including `[space]`) into it. Add `(tenant)/(chrome)/layout.tsx` that renders the chrome.

**File moves required:**

| From                                                 | To                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `src/app/(tenant)/admin/page.tsx`                    | `src/app/(tenant)/(chrome)/admin/page.tsx`                    |
| `src/app/(tenant)/admin/**/page.tsx` (26 files)      | `src/app/(tenant)/(chrome)/admin/**/page.tsx`                 |
| `src/app/(tenant)/dashboard/page.tsx`                | `src/app/(tenant)/(chrome)/dashboard/page.tsx`                |
| `src/app/(tenant)/dashboard/[space]/page.tsx`        | `src/app/(tenant)/(chrome)/dashboard/[space]/page.tsx`        |
| `src/app/(tenant)/dashboard/admin/[domain]/page.tsx` | `src/app/(tenant)/(chrome)/dashboard/admin/[domain]/page.tsx` |
| `src/app/(tenant)/dashboard/messages/...`            | `src/app/(tenant)/(chrome)/dashboard/messages/...`            |
| `src/app/(tenant)/dashboard/services/...`            | `src/app/(tenant)/(chrome)/dashboard/services/...`            |
| `src/app/(tenant)/dashboard/layout.tsx`              | `src/app/(tenant)/(chrome)/dashboard/layout.tsx`              |
| **NEW**                                              | `src/app/(tenant)/(chrome)/layout.tsx`                        |

**URL impact:** Zero. Route groups do not appear in URLs.

**Runtime cost (client/server boundary):** No change. The new `(chrome)/layout.tsx` would be `'use client'` (same chrome), with the same boundary surface.

**Re-render cost:** Same. Possibly better: a single layout instance for all chrome-bearing routes (vs. two layout instances under Approach 1). However, this benefit is theoretical — the existing `<main>` boundary stays the same.

**Risk to existing `/dashboard/*` chrome:** **Medium.** 8 dashboard sub-route file moves, 27 admin sub-route file moves, 1 new layout, 2 layout moves. Each move is a `git mv` to preserve history, but the _imports_ inside each page (e.g., `@widgets/admin/ui/...`) are not affected because the move is purely positional. The big risk is **the legacy `dashboard/admin/[domain]/page.tsx` route**: Phase 37 intentionally left it in place (and `SpaceLauncher` href still points to `/dashboard/admin` per line 36). If a future change moves the SpaceLauncher's admin href to `/admin`, the legacy route would need to keep working OR be deleted in the same plan.

**Risk to ADMIN-CHROME-04:** Same as Approach 1 — both share the same passthrough `<main>`.

**Other risks:**

- Cognitive overhead: introduces a `(chrome)` concept that explains itself only via comments. AGENTS.md does not currently mention this pattern; future readers will need to learn it.
- The `(platform)/` route group is already a precedent for grouping routes; nesting `(tenant)/(chrome)` adds a second axis of grouping that has no peer.
- A new `dashboard/layout.tsx` at `(tenant)/(chrome)/dashboard/layout.tsx` is essentially a pass-through that just renders `{children}` — the chrome has moved up to `(chrome)/layout.tsx`. This is conceptually correct but loses the local "this directory gets chrome" signal.

**Verdict:** Cleanest in concept, but **mechanically riskier** and **offers no observable benefit** over Approach 1 given the project's current structure (admin and dashboard are already siblings under `(tenant)`, and the chrome is the same single component either way). Reject.

### Approach 3 — Conditional render in `(tenant)/layout.tsx`

**What:** Modify `src/app/(tenant)/layout.tsx` to detect `/admin/*` or `/dashboard/*` via `usePathname()` and conditionally wrap children in the chrome.

**File moves required:** None.

**File edits required:**

| File                                    | Change                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| `src/app/(tenant)/layout.tsx`           | Convert to a much larger client component; add pathname-based switch. |
| `src/app/(tenant)/dashboard/layout.tsx` | **DELETE** (or empty) — moved to tenant.                              |

**Runtime cost (client/server boundary):** Regression. Today, `(tenant)/layout.tsx` is a thin client wrapper (16 lines) that only provides `I18nextProvider` and `<Toaster>`. If it also hosts the chrome, the entire tenant surface (every `(tenant)/*` page) becomes chrome-aware. Non-chrome pages (e.g., future public-ish pages under `(tenant)/`) would have to opt out by rendering `<NoChrome>{children}</NoChrome>` or by detecting pathnames to bypass.

**Re-render cost:** Worse. The pathname switch fires on every navigation, including routes that don't change. The `useState(collapsed)` lives at the tenant root, so it persists across all `(tenant)/*` routes — likely fine, but harder to reason about.

**Risk to existing `/dashboard/*` chrome:** **Medium.** Any page that previously skipped the dashboard layout (none today, but possible) would now render with chrome.

**Risk to ADMIN-CHROME-04:** Worse. Mixing concerns at the tenant root means a single typo in the pathname regex affects all routes. Audit per page becomes harder.

**Other risks:**

- Couples tenant-level concerns (i18n, toaster) to chrome concerns (sidebar, bottom bar). They have different change cadences and different testability profiles.
- Loses the per-route-group layout ownership model that Next.js encourages.
- AGENTS.md says "Server components by default, 'use client' only when needed"; promoting tenant layout to client + chrome-host is a step in the wrong direction.

**Verdict:** Reject. Anti-pattern that bloats the smallest layout in the project.

### Approach 4 — Discovered during research: parallel routes / slots

**What:** Use Next.js 15 parallel routes (e.g., `@sidebar` slot) to inject the chrome without restructuring.

**Why rejected:** Parallel routes are designed for **simultaneous** route segments (e.g., a modal overlay with a `@modal` slot that does not unmount the main page). They are not designed for "share chrome across many routes" — that is the literal job of a regular layout file. Using a parallel route for the sidebar would require defining `@sidebar` in every layout in the tree and would complicate the URL semantics. AGENTS.md and the existing codebase do not use parallel routes anywhere; introducing one is a larger paradigm shift than the problem warrants. The Next.js docs explicitly recommend layouts (or route groups containing a layout) for shared chrome.

### Approach 5 — Discovered during research: hybrid (route group with sub-group)

**What:** Create `src/app/(tenant)/admin/(chrome)/...` — a sub-group within the admin tree — and place a layout at `admin/(chrome)/layout.tsx` while moving the existing admin pages into the sub-group.

**Verdict:** Equivalent to Approach 2 but with fewer file moves (only 27 admin moves; dashboard stays put). The hybrid is mechanically easier than full Approach 2 but still carries the "introduce a new grouping concept" cost. Compared to Approach 1, it offers one advantage: the `admin/layout.tsx` is colocated with the admin pages, and the `admin/(chrome)/` sub-group signals "this is where chrome mounts." On balance, this is a stylistic preference, not a structural win. Approach 1's `admin/layout.tsx` is more discoverable (it's the first file you see in the admin directory) and avoids the second grouping axis.

## Standard Stack

### Core (no new packages)

| Library        | Version           | Purpose                                                    | Why Standard                                                                           |
| -------------- | ----------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `next`         | 15.x (App Router) | Layout composition via `layout.tsx`                        | Project baseline; route groups + layouts are the canonical way to share chrome.        |
| `react`        | 19.x              | Client component shell for the chrome                      | Required for `useState`, `usePathname`, `useSession`, `usePageFlags` — already in use. |
| `usehooks-ts`  | (project dep)     | `useLocalStorage` and other utility hooks (already in use) | Project standard per AGENTS.md.                                                        |
| `lucide-react` | (project dep)     | Icons for SpaceLauncher/MobileSpaceBar                     | Already used.                                                                          |

### Supporting (no new packages)

| Library                             | Purpose                                                        | When to Use                           |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `vitest` + `@testing-library/react` | Unit-test `getActiveSpaceId` and the new `SpaceChrome` wrapper | Test surface for the new pure helper. |
| `@shared/ui` (ErrorBoundary)        | Wrap the chrome                                                | Mirrors existing pattern.             |

### Alternatives Considered (libraries / patterns)

| Instead of                                                        | Could Use                                             | Tradeoff                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App Router layout composition                                     | React Context + manual `useEffect` mount in each page | Worse — every page would need to opt in; no layout ownership.                                                                                                                                                                                                                                                  |
| Per-page manual `<SpaceChrome>` wrapper                           | —                                                     | Would require 27 page edits instead of 1 layout file. Approach 1 is the layout-composition version of this.                                                                                                                                                                                                    |
| `next/navigation` `useSelectedLayoutSegment` for active detection | `usePathname` regex (current approach)                | `useSelectedLayoutSegment` returns the active segment only for the segment matching the layout. `(tenant)/admin/layout.tsx` would return `'admin'`-ish or `['admin', 'users']` etc. — workable but the `usePathname` regex is more transparent and already proven in production. **Keep `usePathname` regex.** |

**Installation:** None. Zero new packages.

## Architecture Patterns

### System Architecture Diagram

```
              ┌────────────────────────────────────────────┐
              │  (tenant)/layout.tsx                       │  (client, 16 lines)
              │  ├─ I18nextProvider                        │
              │  ├─ Toaster                                │
              │  └─ Suspense → {children}                  │
              └──────────────┬─────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
  (tenant)/dashboard/                     (tenant)/admin/
  layout.tsx (new, 10 lines)               layout.tsx (NEW, 6 lines)
        │                                         │
        │  renders <SpaceChrome>                  │  renders <SpaceChrome>
        │                                         │
        └──────────────────┬──────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  SpaceChrome (NEW)      │  (client, ≤80 lines)
              │  ├─ useState(collapsed) │
              │  ├─ usePathname         │
              │  ├─ useSession          │
              │  ├─ usePageFlags        │
              │  ├─ getActiveSpaceId()  │  ← extended: /admin → 'admin'
              │  │                      │
              │  ├─ <div flex bg-gray-50>│
              │  │   ├─ <SpaceLauncher> │  (md+)
              │  │   └─ <main passthrough>
              │  │       └─ {children}  │  ← pages, AdminLayer
              │  └─ <MobileSpaceBar>    │  (mobile)
              └─────────────────────────┘
                           │
        ┌──────────────────┴───────────────────────┐
        │                                          │
        ▼                                          ▼
  /dashboard/**                          /admin/** (27 pages + AdminLayer)
  (existing — behavior                   (each page owns its max-w-*
   unchanged)                             wrapper; AdminLayer owns p-6
                                          max-w-5xl mx-auto)
```

The data flow: `(tenant)/layout.tsx` → per-space layout → `<SpaceChrome>` reads URL + session + flags, computes visible spaces + active space, renders sidebar + main + mobile bar → children (the page) render inside the passthrough `<main>`.

### Recommended Project Structure (post-Phase 48)

```
src/
├── app/
│   └── (tenant)/
│       ├── admin/
│       │   ├── layout.tsx              # NEW — 6 lines, renders <SpaceChrome>
│       │   ├── page.tsx                # renders <AdminLayer />
│       │   └── ... (27 sub-pages, unchanged)
│       └── dashboard/
│           ├── layout.tsx              # EDIT — now 10 lines, renders <SpaceChrome>
│           └── ... (8 sub-routes, unchanged)
└── widgets/
    └── dashboard/
        ├── model/
        │   ├── spaces.ts               # EDIT — add `href` to SpaceDefinition,
        │   │                           #       add getActiveSpaceId() export
        │   └── active-space.test.ts    # NEW — vitest for the derivation
        └── ui/
            ├── SpaceChrome.tsx         # NEW — extracted chrome component
            ├── SpaceLauncher.tsx       # EDIT — uses space.href
            └── MobileSpaceBar.tsx      # EDIT — uses space.href + admin prefix
```

### Pattern 1: Extract client layout chrome to a component

**What:** When a layout's body is a client component using hooks, and the same chrome is needed in a sibling layout, extract the JSX into a shared client component that takes `children`. Each layout file shrinks to a one-liner.

**When to use:** Any time two sibling route segments need the same chrome (sidebar, top bar, breadcrumbs, error boundary, etc.). Next.js layouts are file-based; the only way to share a layout's body across siblings is either (a) a common parent layout (route group restructure) or (b) a shared component (Approach 1).

**Example:**

```tsx
// src/widgets/dashboard/ui/SpaceChrome.tsx (NEW)
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@shared/api/auth-client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { ErrorBoundary } from '@shared/ui';
import { SpaceLauncher } from './SpaceLauncher';
import { MobileSpaceBar } from './MobileSpaceBar';
import { getVisibleSpaces, getActiveSpaceId } from '../model/spaces';

interface SpaceChromeProps {
  children: React.ReactNode;
}

export function SpaceChrome({ children }: SpaceChromeProps) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();

  const role = session?.user?.role || 'RESIDENT';
  const activeSpaceId = getActiveSpaceId(pathname);
  const visibleSpaces = flags ? getVisibleSpaces(role, flags) : [];

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50">
        <SpaceLauncher
          spaces={visibleSpaces}
          activeSpaceId={activeSpaceId}
          collapsed={collapsed}
          onNavigate={() => {}}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
        />
        <main
          className="flex-1 min-w-0 md:pb-0"
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </main>
      </div>
      <MobileSpaceBar />
    </ErrorBoundary>
  );
}
```

```tsx
// src/app/(tenant)/admin/layout.tsx (NEW)
'use client';
import { SpaceChrome } from '@widgets/dashboard/ui/SpaceChrome';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
```

```tsx
// src/app/(tenant)/dashboard/layout.tsx (EDIT — shrinks from 67 to ~10 lines)
'use client';
import { SpaceChrome } from '@widgets/dashboard/ui/SpaceChrome';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
```

### Pattern 2: Co-locate the route with the href in the model

**What:** Move the URL construction out of the rendering component and into the data model. `SpaceDefinition` gains an `href: string` field. Both `SpaceLauncher` and `MobileSpaceBar` consume `space.href` instead of constructing it inline.

**When to use:** Any time a component hardcodes a URL that depends on data, especially when the URL is going to be non-uniform across the data set (one space → `/admin`, four spaces → `/dashboard/<id>`).

**Example:**

```ts
// src/widgets/dashboard/model/spaces.ts (EDIT)
export interface SpaceDefinition {
  id: SpaceId;
  href: string;                       // NEW — canonical URL for this space
  labelKey: string;
  icon: LucideIcon;
  isCore: boolean;
  requiredFlag?: keyof PlatformPageFlags;
  minimumRole?: string;
  widgetIds: string[];
}

export const SPACES: Record<SpaceId, SpaceDefinition> = {
  home:      { id: 'home',      href: '/dashboard',            ... },
  services:  { id: 'services',  href: '/dashboard/services',  ... },
  community: { id: 'community', href: '/dashboard/community', ... },
  messages:  { id: 'messages',  href: '/dashboard/messages',  ... },
  admin:     { id: 'admin',     href: '/admin',                ... },
};
```

```tsx
// src/widgets/dashboard/ui/SpaceLauncher.tsx (EDIT — line 36 becomes:)
const href = space.href;
```

### Pattern 3: `getActiveSpaceId` extension

**What:** Add an early-return branch for `/admin` prefix before the existing `/dashboard/<slug>` regex.

**When to use:** Any time a route migrates from one prefix to another (here: `/dashboard/admin` → `/admin` per Phase 37). The active-space derivation must recognize the new prefix and the old one for back-compat.

**Example:**

```ts
// src/widgets/dashboard/model/spaces.ts (or a new file: active-space.ts)
export function getActiveSpaceId(pathname: string): SpaceId | 'home' {
  if (!pathname) return 'home';

  // /admin and /admin/... → admin space (Phase 48)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'admin';
  }

  // /dashboard/<slug> → matched space
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const slug = match[1];
    if (resolveSpace(slug)) {
      return slug;
    }
  }
  return 'home';
}
```

### Anti-Patterns to Avoid

- **Don't create a parallel route slot for the sidebar.** Parallel routes are for simultaneous routes, not shared chrome. The docs and the AGENTS.md code style do not use parallel routes.
- **Don't add width constraints to the new `<main>`.** The existing `<main>` is a passthrough and pages own their width. Adding any padding/max-width here will create duplicate chrome on every admin sub-page.
- **Don't add a `<Breadcrumbs>` to `SpaceChrome`.** Each admin sub-page already renders its own `<Breadcrumbs>`. A layout-level breadcrumb would either duplicate (visible double-breadcrumb) or override (different from page-level). Per-page breadcrumbs remain correct.
- **Don't switch the layout to a server component.** The current `dashboard/layout.tsx` is `'use client'` because of `useState`, `usePathname`, `authClient.useSession`, `usePageFlags`. The new `admin/layout.tsx` must follow the same pattern.
- **Don't add the `admin` space's href to `/dashboard/admin`.** Phase 37 already normalized all admin links to `/admin`. The old `dashboard/admin/[domain]` route is preserved for back-compat but is no longer the canonical entry. New code should point to `/admin`.
- **Don't move the legacy `dashboard/admin/[domain]/page.tsx` route.** It is preserved intentionally (per Phase 37 SUMMARY decision). Moving or deleting it is out of scope.

## Don't Hand-Roll

| Problem                            | Don't Build                                                                               | Use Instead                                                                                                 | Why                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Pathname → space mapping           | Custom `useEffect` watching `usePathname` per page                                        | `getActiveSpaceId(pathname)` in the model                                                                   | Centralizes the regex; unit-testable; one source of truth.                         |
| Per-space URL construction         | Inline ternary in each component (`space.id === 'admin' ? '/admin' : '/dashboard/${id}'`) | `SpaceDefinition.href`                                                                                      | One canonical place to change when routes move.                                    |
| Sidebar collapse persistence       | Custom `useLocalStorage` wrapper                                                          | `useState` (matches existing pattern — collapse does not persist across reloads today; not in scope to add) | Match existing behavior; do not silently expand scope.                             |
| Active detection in mobile bar     | `usePathname().includes('admin')` or `startsWith('/admin')` repeated in three components  | `getActiveSpaceId` (or a sibling helper `isPathInSpace(pathname, spaceId)`)                                 | Symmetric with desktop; same model powers both bars.                               |
| Shared layout between two siblings | Route group restructure (Approach 2) just to share a layout                               | Shared client component (Approach 1)                                                                        | Lower mechanical risk; no file moves; no concept of "(chrome) sub-group" to teach. |

**Key insight:** The "share chrome across two sibling route groups" problem is a one-utility-file problem (extract a component), not a restructuring problem. Restructuring the route tree to use a shared parent layout only makes sense when the two route groups have no other shared parent — but here, `(tenant)/admin` and `(tenant)/dashboard` are already siblings under `(tenant)/`, and `(tenant)/layout.tsx` deliberately stays chrome-free. The next-most-natural sharing point is a client component that both layouts wrap their children in.

## Active-Space Derivation

**Current state** (`src/app/(tenant)/dashboard/layout.tsx:57-66`):

```ts
function getActiveSpaceId(pathname: string): string {
  if (!pathname) return 'home';
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const slug = match[1];
    if (resolveSpace(slug)) {
      return slug;
    }
  }
  return 'home';
}
```

This regex `/^\/dashboard\/([^/]+)/` matches `/dashboard/admin`, `/dashboard/services`, etc. It returns the slug when the slug resolves to a known space, otherwise `'home'`.

**Required change** (Phase 48, ADMIN-CHROME-03): `/admin` and `/admin/...` must resolve to `'admin'`.

**Proposed new function** (moved to `src/widgets/dashboard/model/spaces.ts` as an export):

```ts
/**
 * Derive the active space ID from the current pathname.
 * Recognises both legacy /dashboard/<slug> and the canonical /admin prefix.
 * Returns 'home' for unknown / empty paths.
 */
export function getActiveSpaceId(pathname: string): SpaceId | 'home' {
  if (!pathname) return 'home';

  // /admin and /admin/... → admin space (Phase 37/48 canonical admin route)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'admin';
  }

  // /dashboard/<slug> → matched space
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const slug = match[1];
    if (resolveSpace(slug)) {
      return slug;
    }
  }
  return 'home';
}
```

**Return type tightening:** The current return type is `string` (loose); the new return type is `SpaceId | 'home'` (precise). All current call sites already treat the return value as one of those 5 IDs, so the tightening is non-breaking.

**Edge case preservation:** `/dashboard/admin` and `/dashboard/admin/users` continue to return `'admin'`. This preserves the legacy `(tenant)/dashboard/admin/[domain]/page.tsx` route for back-compat and for any cached external links.

**MobileSpaceBar.isActive update** (`src/widgets/dashboard/ui/MobileSpaceBar.tsx:51-56`):

```ts
// Current
const isActive = (spaceId: SpaceId): boolean => {
  if (spaceId === 'home') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === `/dashboard/${spaceId}` || pathname.startsWith(`/dashboard/${spaceId}/`);
};

// Proposed — read the base path from the model
const isActive = (spaceId: SpaceId): boolean => {
  const base = SPACES[spaceId].href; // e.g. '/admin' for admin
  return pathname === base || pathname.startsWith(base + '/');
};
```

The `home` case currently uses `/dashboard` as the canonical entry; this matches `SPACES.home.href = '/dashboard'`, so the special case is no longer needed. Net: 6 lines → 2 lines, no behavior change for dashboard, correct behavior for admin.

**SpaceLauncher.tsx:36 update** (replace inline ternary with `space.href`):

```ts
// Current
const href = space.id === 'home' ? '/dashboard' : `/dashboard/${space.id}`;

// Proposed
const href = space.href;
```

**SpaceLauncher isActive** (line 35):

```ts
const isActive = space.id === activeSpaceId; // unchanged
```

The `activeSpaceId` is already the canonical ID. No change needed.

## Duplicate-Chrome Risk (ADMIN-CHROME-04) — Per-Page Inventory

The new `<main>` in `SpaceChrome` is a passthrough: `flex-1 min-w-0` + `paddingBottom` for the mobile bottom bar. **No padding, no max-width.** All 27 admin sub-pages own their own wrappers; AdminLayer owns its own wrapper. The risk is "what if a sub-page is already wrapped in something that conflicts with the layout's `<main>`?"

| Page                                  | Outer wrapper                                | Inner wrapper                                 | Conflicting? | Verdict                                                                                                                                                   |
| ------------------------------------- | -------------------------------------------- | --------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/page.tsx` (root)               | (none — renders `<AdminLayer />` directly)   | AdminLayer: `p-6 max-w-5xl mx-auto space-y-6` | No           | ✅ AdminLayer is the only width constraint. Renders inside `<main>` (passthrough) — same as it did inside the dashboard `<main>`.                         |
| `admin/announcements/page.tsx`        | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/categories/page.tsx`           | (no outer div)                               | `max-w-4xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/competitions/page.tsx`         | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/competitions/[id]/page.tsx`    | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/competitions/new/page.tsx`     | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/content/page.tsx`              | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/content/[id]/page.tsx`         | (no outer div)                               | `max-w-4xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/content/new/page.tsx`          | (no outer div)                               | `max-w-4xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/events/page.tsx`               | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/events/[id]/page.tsx`          | `min-h-screen bg-gray-50` (around the inner) | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅ Both flex parent (in layout) and inner use `bg-gray-50`; visually identical. Inner `min-h-screen` is fine — it fills the flex parent's `min-h-screen`. |
| `admin/events/new/page.tsx`           | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/external-surveys/page.tsx`     | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/groups/page.tsx`               | (no outer div)                               | `max-w-7xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/groups/[id]/page.tsx`          | (no outer div)                               | `max-w-2xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/groups/new/page.tsx`           | (no outer div)                               | `max-w-2xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/households/page.tsx`           | (no outer div)                               | `max-w-7xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/requests/page.tsx`             | (no outer div)                               | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` | No           | ✅                                                                                                                                                        |
| `admin/requests/analytics/page.tsx`   | `min-h-screen bg-gray-50` (around the inner) | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` | No           | ✅ Same pattern as events/[id].                                                                                                                           |
| `admin/resources/page.tsx`            | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/resources/[id]/page.tsx`       | (no outer div)                               | `max-w-4xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/resources/new/page.tsx`        | (no outer div)                               | `max-w-4xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/surveys/page.tsx`              | (no outer div)                               | `max-w-6xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/surveys/[id]/page.tsx`         | (no outer div)                               | `max-w-4xl mx-auto px-4 py-8`                 | No           | ✅                                                                                                                                                        |
| `admin/surveys/new/page.tsx`          | mixed: some `max-w-6xl`, some `max-w-2xl`    | —                                             | No           | ✅ Inner page own width; no layout conflict.                                                                                                              |
| `admin/surveys/[id]/edit/page.tsx`    | `min-h-screen bg-gray-50`                    | `max-w-5xl mx-auto px-4 py-6`                 | No           | ⚠️ **See edge case below** — full-screen editor.                                                                                                          |
| `admin/surveys/[id]/preview/page.tsx` | `min-h-screen bg-gray-50`                    | `max-w-3xl mx-auto px-4 py-6`                 | No           | ⚠️ **See edge case below** — full-screen preview.                                                                                                         |
| `admin/users/page.tsx`                | `min-h-screen bg-gray-50`                    | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` | No           | ✅                                                                                                                                                        |

**Summary:** 27/27 admin sub-pages are already chrome-friendly. They each own their width and don't need editing. The new layout's `<main>` is intentionally width-neutral, mirroring the existing `dashboard/layout.tsx`. **Zero risk of double-padding or double-max-width.**

**Subtle observation:** Five admin sub-pages have an outer `<div className="min-h-screen bg-gray-50">` wrapper. When wrapped in the layout's `<main>`, the structure becomes:

```html
<div class="flex min-h-screen bg-gray-50">       <!-- layout's flex parent -->
  <nav class="hidden md:flex ...">               <!-- SpaceLauncher (md+) -->
  <main class="flex-1 min-w-0 ...">              <!-- layout's <main> -->
    <div class="min-h-screen bg-gray-50">        <!-- page's outer div -->
      <div class="max-w-Xxl mx-auto px-4 py-8">  <!-- page's inner div -->
        ... page content ...
      </div>
    </div>
  </main>
</div>
```

This is visually identical to the current dashboard layout for sub-pages that already have these wrappers (e.g., `/dashboard/admin/[domain]/page.tsx` at line 36-86 has the same `min-h-screen bg-gray-50` + `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` pattern — see `src/app/(tenant)/dashboard/admin/[domain]/page.tsx:36-37`). The pattern is proven in production today.

## Edge Cases

### Edge Case 1: `/admin/surveys/[id]/preview` (full-screen survey preview)

**Current behavior:** The page has its own outer `<div className="min-h-screen bg-gray-50">` and renders the survey as if the user is taking it. The "Back to editor" link points to `/admin/surveys/[id]/edit`.

**After Phase 48:** The page is wrapped in `<main>`. The SpaceLauncher sidebar appears on the left (desktop) and the MobileSpaceBar appears at the bottom (mobile). This may feel "non-preview" for a preview page that is meant to look like a respondent's view.

**Recommendation:** **Keep the chrome.** The preview page is part of the admin experience; the admin user expects the sidebar as a way to navigate away. Removing chrome on preview would require a per-page opt-out (e.g., a route group), which adds complexity for marginal benefit. The "Back to editor" link is visible at the top of the page (line 97-103) and is the primary exit, so the sidebar is supplementary, not blocking.

If a stakeholder later requests a "true respondent-style preview" (no sidebar), the implementation would be:

- Move `surveys/[id]/preview` into its own sub-group `surveys/(respondent)/preview` and add an empty layout there
- Or, use a `preview` query param to conditionally hide the chrome via a layout-level prop
- Neither is in scope for Phase 48.

### Edge Case 2: `/admin/surveys/[id]/edit` (TipTap / SurveyEditor full-screen)

**Current behavior:** Same `min-h-screen bg-gray-50` outer wrapper as preview. Hosts a `<SurveyEditor />` component that may render its own toolbars/modals.

**After Phase 48:** Same as preview — the page is wrapped in `<main>`. The SpaceLauncher's `w-16` (collapsed) sidebar is on the left; the SurveyEditor's left-anchored toolbars may overlap with the sidebar.

**Recommendation:** **Keep the chrome, but visually verify.** SurveyEditor toolbars (TipTap) are typically top-anchored (sticky headers), not left-anchored. The left-anchored `SpaceLauncher` at `w-16` (collapsed) is at the viewport edge; tip-tap toolbars would be inside the `<main>` content area, starting at the right edge of the sidebar. The 16px gap is enough for a normal editor toolbar but not enough for a sidebar widget. **Action item for the plan:** Manually verify in the plan that SurveyEditor does not render outside the `<main>`'s left edge. If it does, the editor page should add `pl-16` to its inner div OR Phase 48 should plan a follow-up to wrap the editor in its own no-chrome layout.

This is the **only edge case that warrants manual visual verification** during plan execution.

### Edge Case 3: `/admin/users` (full-screen users list)

**Current behavior:** `min-h-screen bg-gray-50` + `max-w-7xl` wrapper. The `UsersListSection` renders an interactive table with bulk action controls (suspend, role change).

**After Phase 48:** Same chrome as other pages. The `UsersListSection` should be unaffected by the sidebar (table is inside `<main>`).

**Recommendation:** **Keep the chrome, no action needed.** This is the same pattern as the existing `/dashboard/admin/users` route — already proven to work with the dashboard chrome.

### Edge Case 4: Auth gate / non-admin user visits `/admin/*`

**Current behavior:** Each admin sub-page presumably has its own auth check (or `(tenant)/layout.tsx` has one). Non-admin users would be redirected or shown a 403.

**After Phase 48:** The new chrome mounts before the page's auth check. A non-admin user briefly sees SpaceLauncher (without the admin space entry) + MobileSpaceBar (without admin slot) + the page's loading state or 403. The `usePageFlags` and `getVisibleSpaces` already filter out the admin space for non-admin roles (see `getVisibleSpaces` at `spaces.ts:170-173`), so the chrome itself is correct.

**Recommendation:** **No action.** Behavior is correct: non-admin users see a chrome that doesn't include "Admin", and the page either renders (legacy access via stale links) or 403s.

### Edge Case 5: Sign-out during an admin page

**Current behavior:** The session changes; `authClient.useSession()` re-renders; the chrome re-renders with the new role; admin-only spaces disappear.

**After Phase 48:** Same behavior. The new chrome responds to session changes identically.

**Recommendation:** **No action.** Out-of-scope; existing behavior preserved.

### Edge Case 6: Deep links with query strings (e.g., `/admin/surveys?status=published`)

**Current behavior:** `usePathname()` returns the pathname only (no query string). The active-space derivation is unaffected.

**After Phase 48:** Same. No change.

**Recommendation:** **No action.**

### Edge Case 7: Platform admin routes (`/admin/platform/...`)

**Scope check:** The ROADMAP explicitly says `(platform)/admin/platform/*` is out of scope. The `(platform)` route group is a separate group from `(tenant)`, with its own `layout.tsx` at `src/app/(platform)/layout.tsx`. The new `(tenant)/admin/layout.tsx` only affects URLs under `/<tenant>/admin/*`, never `/admin/platform/*`.

**Recommendation:** **No action.** The two route groups are independent. Any platform-admin chrome is the responsibility of `(platform)/layout.tsx`.

## Test Surface

> Per `.planning/config.json` (`workflow.nyquist_validation: false`), no formal Nyquist validation test map is required. The following is a recommended manual + unit test surface.

### Unit tests (vitest)

**`src/widgets/dashboard/model/active-space.test.ts`** (NEW) — covers the extended `getActiveSpaceId`:

| Input                                 | Expected      | Reason                                                                                      |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------ |
| `''`                                  | `'home'`      | Empty path → home.                                                                          |
| `'/dashboard'`                        | `'home'`      | Dashboard home.                                                                             |
| `'/dashboard/'`                       | `'home'`      | Trailing slash tolerated.                                                                   |
| `'/dashboard/services'`               | `'services'`  | Existing match.                                                                             |
| `'/dashboard/community'`              | `'community'` | Existing match.                                                                             |
| `'/dashboard/messages'`               | `'messages'`  | Existing match.                                                                             |
| `'/dashboard/messages/announcements'` | `'messages'`  | Sub-path resolution.                                                                        |
| `'/dashboard/admin'`                  | `'admin'`     | Legacy admin URL (back-compat preserved).                                                   |
| `'/dashboard/admin/users'`            | `'admin'`     | Legacy admin sub-path.                                                                      |
| `'/admin'`                            | `'admin'`     | **NEW** — canonical admin entry.                                                            |
| `'/admin/'`                           | `'admin'`     | **NEW** — trailing slash.                                                                   |
| `'/admin/users'`                      | `'admin'`     | **NEW** — admin sub-page.                                                                   |
| `'/admin/surveys/abc-123/preview'`    | `'admin'`     | **NEW** — nested admin sub-page.                                                            |
| `'/dashboard/unknown-slug'`           | `'home'`      | Unknown slug → home.                                                                        |
| `'/something/else'`                   | `'home'`      | Non-dashboard, non-admin → home.                                                            |
| `'/adminusers'`                       | `'home'`      | Edge: `/admin` prefix not followed by `/` or end — not matched. (Use `pathname === '/admin' |     | pathname.startsWith('/admin/')` to require delimiter.) |

**`src/widgets/dashboard/model/spaces.test.ts`** (NEW) — covers the `SpaceDefinition.href` registry:

| Space       | Expected `href`          |
| ----------- | ------------------------ |
| `home`      | `'/dashboard'`           |
| `services`  | `'/dashboard/services'`  |
| `community` | `'/dashboard/community'` |
| `messages`  | `'/dashboard/messages'`  |
| `admin`     | `'/admin'`               |

This is a one-shot assertion; it catches any future space being added without an `href`.

### Manual verification (smoke)

**Desktop viewport (≥md, default 1280×800):**

1. Visit `/admin` as ADMIN. **Expected:** SpaceLauncher visible on the left (5 spaces with "Admin" highlighted in indigo). AdminLayer renders inside `<main>`. AdminLayer's `p-6 max-w-5xl mx-auto` produces a centered content block.
2. Visit `/admin/users`. **Expected:** SpaceLauncher still visible. "Admin" still highlighted. Page content (`max-w-7xl`) renders inside `<main>`. **Critical:** verify no double-padding (no extra `px-4` from the layout's `<main>` — there should be none).
3. Visit `/admin/surveys`. Same as above. "Admin" highlighted.
4. Click a SpaceLauncher item (e.g., "Home"). **Expected:** navigates to `/dashboard`, "Home" highlighted, "Admin" unhighlighted.
5. Click "Admin" in SpaceLauncher. **Expected:** navigates to `/admin`, "Admin" highlighted.
6. Collapse the sidebar. **Expected:** sidebar shrinks to 16px wide, content area expands. Navigate to `/admin/users`. **Expected:** sidebar still collapsed (state persists across admin sub-route navigation).
7. Visit `/dashboard/services`. **Expected:** chrome works as before, "Services" highlighted.
8. Visit `/admin/surveys/abc/preview` (or any existing survey). **Expected:** preview renders with chrome. Verify the page's `min-h-screen bg-gray-50` outer div does not double up with the layout's `bg-gray-50` (should be visually identical).
9. Visit `/admin/surveys/abc/edit` (or any existing survey). **Expected:** SurveyEditor renders. **Verify the editor's left edge does not collide with the collapsed sidebar at 16px.** If collision, document the issue and plan a follow-up.

**Mobile viewport (<md, default 375×667):**

1. Visit `/admin`. **Expected:** MobileSpaceBar visible at the bottom (5 slots, "Admin" highlighted in indigo). AdminLayer renders above the bar with safe-area-aware bottom padding.
2. Visit `/admin/users`. Same. Verify no horizontal scrollbar.
3. Tap a MobileSpaceBar slot (e.g., "Home"). **Expected:** navigates to `/dashboard`, "Home" highlighted.
4. Verify `env(safe-area-inset-bottom)` clears the iPhone home indicator (only testable on real iOS; CI cannot verify).

**Non-admin user (RESIDENT role):**

1. As RESIDENT, visit `/admin/users` (via direct URL — e.g., a stale bookmark). **Expected:** SpaceLauncher visible but with only 4 spaces (no "Admin"). MobileSpaceBar with 4 slots. Page itself 403s or redirects (per page-level auth check, out of Phase 48 scope).
2. As RESIDENT, the SpaceLauncher link to "Admin" does not appear. Verify no broken link.

**Cross-chrome:**

1. Visit `/dashboard` then click the "Admin" nav item. **Expected:** navigates to `/admin`, not `/dashboard/admin`. (This depends on `SpaceDefinition.admin.href` being `'/admin'` — verify the link target.)
2. From `/admin`, click "Home" in the sidebar. **Expected:** navigates to `/dashboard`, not `/`. (Verify `SpaceDefinition.home.href` is `'/dashboard'`.)

### Integration / E2E tests

The project uses **vitest** (per `package.json` and `vitest.config.ts`). No Playwright/Cypress is configured. **No E2E additions recommended** for Phase 48 — the unit tests cover the derivation logic, and the manual smoke list is comprehensive for a layout-only change.

If the team later adds Playwright, the natural candidates are:

- Navigate `/admin → /admin/users → /admin/surveys → /admin`, verify chrome is stable, sidebar collapse persists.
- Mobile: resize to 375px, verify MobileSpaceBar appears, slots are clickable, active state follows.

## Environment Availability

Step 2.6: SKIPPED. The phase is purely code/config changes — no external dependencies, no new CLIs, no new services. The only runtime concern is the existing local dev server (`pnpm dev`) and the build pipeline (`pnpm build`), both of which are already in use.

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (it is absent, default-enabled). Including this section.

### Applicable ASVS Categories

| ASVS Category               | Applies | Standard Control                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication           | No      | Auth is enforced per-page and at the `(tenant)/layout.tsx` level (unchanged). The new admin layout does not introduce a new auth check — the role gating is already inside `getVisibleSpaces`.                                                                                                                                                                                                                   |
| V3 Session Management       | No      | `authClient.useSession()` continues to be the source of truth, called inside the new `SpaceChrome` component. Same client, same lifecycle.                                                                                                                                                                                                                                                                       |
| V4 Access Control           | No      | Admin-only spaces are already filtered by `getVisibleSpaces` (admin/board only) and `SpaceDefinition.minimumRole`. Non-admin users do not see the admin space entry in the sidebar. **However:** the admin space link is `space.href = '/admin'` — a non-admin user with a stale link or a manually typed URL would still reach `/admin/*` and be subject to per-page auth. **No change from current behavior.** |
| V5 Input Validation         | No      | No new user inputs.                                                                                                                                                                                                                                                                                                                                                                                              |
| V6 Cryptography             | No      | No crypto.                                                                                                                                                                                                                                                                                                                                                                                                       |
| V7 Error Handling & Logging | No      | The new chrome wraps in `<ErrorBoundary>` (mirroring the existing pattern).                                                                                                                                                                                                                                                                                                                                      |
| V8 Data Protection          | No      | No new data flows.                                                                                                                                                                                                                                                                                                                                                                                               |
| V9 Communication            | No      | No new HTTP endpoints.                                                                                                                                                                                                                                                                                                                                                                                           |
| V10 Malicious Code          | No      | No new dependencies.                                                                                                                                                                                                                                                                                                                                                                                             |
| V11 Business Logic          | No      | Active-space derivation is a pure function with a regex. No business logic added.                                                                                                                                                                                                                                                                                                                                |
| V12 Files and Resources     | No      | No new file handlers.                                                                                                                                                                                                                                                                                                                                                                                            |
| V13 API and Web Service     | No      | No new APIs.                                                                                                                                                                                                                                                                                                                                                                                                     |
| V14 Configuration           | No      | No new config.                                                                                                                                                                                                                                                                                                                                                                                                   |

### Known Threat Patterns for This Stack

| Pattern                                        | STRIDE                  | Standard Mitigation                                                                                                                                                                                         |
| ---------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stale admin link → non-admin user → admin page | Elevation of Privilege  | Per-page auth check (existing; unchanged). The new chrome does not change who can reach `/admin/*`.                                                                                                         |
| `usePathname` injection (via URL manipulation) | Tampering               | The derivation function is pure; no side effects. It only returns an ID, which is then matched against the SPACES registry. A malicious pathname cannot affect state.                                       |
| Sidebar link to `/admin` for non-admin user    | Repudiation / Elevation | `getVisibleSpaces` filters by role. The link is **not rendered** for non-admin users, so a click is impossible from the chrome. A user typing `/admin` directly is subject to per-page auth (out of scope). |

**No new ASVS concerns introduced.** The new layout is a strict subset of the existing dashboard layout's security posture.

## Sources

### Primary (HIGH confidence)

- `.planning/ROADMAP.md` (lines 849–861) — Phase 48 goal, requirements, out-of-scope.
- `.planning/phases/30-dashboard-phase-b/30-01-SUMMARY.md` — origin of SpaceLauncher.
- `.planning/phases/34-admin-layer/34-01-SUMMARY.md` — origin of AdminLayer, including `p-6 max-w-5xl mx-auto` (line 149 of `src/widgets/dashboard/ui/AdminLayer.tsx`).
- `.planning/phases/37-admin-route-consolidation/37-01-SUMMARY.md` — canonical `/admin/*` route, normalization of links.
- `.planning/phases/38-space-layers/38-04-SUMMARY.md` — most recent space routing changes.
- `src/app/(tenant)/dashboard/layout.tsx` (67 lines) — the current chrome host, source for the extraction.
- `src/app/(tenant)/layout.tsx` (16 lines) — minimal tenant layout; verified thin.
- `src/app/(tenant)/admin/page.tsx` (6 lines) — renders AdminLayer; no chrome today.
- `src/widgets/dashboard/ui/SpaceLauncher.tsx` (85 lines) — desktop sidebar; line 36 has the hardcoded `href` ternary.
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx` (98 lines) — mobile bar; lines 51-56 have the inline `isActive` logic.
- `src/widgets/dashboard/ui/AdminLayer.tsx` (196 lines) — admin landing; line 149 has the inner `p-6 max-w-5xl mx-auto space-y-6` wrapper.
- `src/widgets/dashboard/model/spaces.ts` (358 lines) — SpaceDefinition, SPACES, getVisibleSpaces, resolveSpace, ADMIN_DOMAINS, SERVICES_DOMAINS, MESSAGES_DOMAINS.
- `src/shared/lib/navigation.ts` (lines 50-83) — `dashboard-admin` href is `/admin` (line 69), confirming Phase 37's normalization.
- `vitest.config.ts` — `src/widgets/**/*.{ts,tsx}` is included for coverage; no existing tests for the spaces model.
- AGENTS.md — RSC vs client component policy, file organization rules, max 200 lines per component, max 200 lines.
- `.planning/config.json` — `workflow.nyquist_validation: false` (skip formal test map).

### Secondary (MEDIUM confidence)

- `find src/app/(tenant)/admin -name "page.tsx"` — 27 admin sub-pages enumerated for the duplicate-chrome inventory.
- `grep -c "max-w-..."` — 26/27 pages have an explicit width wrapper; the 27th (root `admin/page.tsx`) delegates to AdminLayer's wrapper.
- `find . -name "*.test.ts*"` (excluding node_modules) — 5 existing test files in `src/test/`. None cover the spaces model or active-space derivation.

### Tertiary (LOW confidence)

- None — every claim in this research was verified by direct file read, grep, or bash enumeration.

## Open Questions / Blockers

1. **Should the legacy `(tenant)/dashboard/admin/[domain]/page.tsx` route be deleted as part of Phase 48, or preserved?**
   - What we know: The route still exists. After Phase 37, all admin links point to `/admin/*`. After Phase 48, the SpaceLauncher admin entry will also point to `/admin` (via `SpaceDefinition.admin.href`).
   - What's unclear: Whether deleting the legacy route is in scope. The ROADMAP says "Out of scope: Restructuring AdminLayer internals; changing the spaces model; platform admin routes." It does not explicitly forbid deleting the legacy route.
   - **Recommendation for planner:** Keep the legacy route intact for Phase 48. It is a safety net for any external/cached links. Plan a future housekeeping task (or include in Phase 48 plan-01 as a stretch goal) to delete it once the next deploy confirms zero traffic.

2. **Should the new `<main>` add a left padding to clear the collapsed sidebar on the survey editor page?**
   - What we know: SurveyEditor may render toolbars. Sidebar at 16px (collapsed) is at the viewport edge.
   - What's unclear: Whether toolbars extend into the sidebar's 16px region. TipTap default toolbars are top-anchored; this is a low-risk assumption.
   - **Recommendation for planner:** Defer. Plan a 5-minute manual verification on the survey editor during plan execution. If collision is visible, add a follow-up task: either (a) add `lg:pl-16` to the editor page's inner div, or (b) plan a sub-group layout for the editor in a follow-up phase.

3. **Should `getActiveSpaceId` be exported from `spaces.ts` or from a new `active-space.ts` file?**
   - What we know: `spaces.ts` is 358 lines and contains the SPACES registry, visibility logic, and domain constants. Adding 8 more lines keeps it under 366 — well under any reasonable cap.
   - What's unclear: Whether the team prefers one file or two for testability.
   - **Recommendation for planner:** Keep it in `spaces.ts` (single source of truth, fewer imports, easier for the unit test to mock). The new `active-space.test.ts` is a co-located test.

4. **Should `SpaceDefinition.href` be a required field or optional?**
   - What we know: All 5 SPACES entries need it. No future space can ship without an href.
   - What's unclear: Backward-compat for any third-party code that constructs `SpaceDefinition` objects.
   - **Recommendation for planner:** Make it **required**. The 5 SPACES entries are the only producers of `SpaceDefinition`; no external code constructs them. A required field catches missing values at compile time. AGENTS.md says "Use strict TypeScript, no `any`" — required fields support that.

5. **Should the new `SpaceChrome` be a layout itself (e.g., `src/widgets/dashboard/ui/SpaceChrome.tsx`) or a regular component?**
   - What we know: It is consumed by route layouts. It does not need to be a Next.js layout — Next.js layouts are file-based (`layout.tsx`), not importable.
   - What's unclear: Naming convention. `SpaceChrome` is one option; `DashboardShell`, `SpaceFrame`, `TenantChrome`, `SpaceShell` are alternatives.
   - **Recommendation for planner:** Use **`SpaceChrome`**. It mirrors the file-naming convention of other dashboard widgets (e.g., `SpaceLauncher`, `MobileSpaceBar`, `AdminLayer`, `HomeLayer`). The "Chrome" suffix aligns with browser-chrome semantics (UI frame around content) and is unambiguous.

6. **No blockers identified.** The phase is unblocked and ready for planning.

## State of the Art

| Old Approach                                            | Current Approach                                             | When Changed          | Impact                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------- |
| `/admin/:path*` → `/dashboard/admin/:path*` redirect    | Direct `/admin/*` routes                                     | Phase 37 (2026-05-29) | Removed the redirect, normalized all links to `/admin`.                                  |
| `AdminDashboard` with widget tabs                       | `AdminLayer` (command bar + domain grid + activity stream)   | Phase 34 (2026-05-28) | Single landing page, no tab navigation.                                                  |
| `/dashboard/admin` URL                                  | `/admin` URL (canonical)                                     | Phase 37              | SpaceLauncher still points to old URL (line 36); **Phase 48 fixes this**.                |
| Inline `getActiveSpaceId` in layout                     | `getActiveSpaceId` exported from `spaces.ts` (move + extend) | Phase 48 (proposed)   | Centralizes the regex; enables unit testing.                                             |
| Inline `href` ternary in SpaceLauncher + MobileSpaceBar | `SpaceDefinition.href`                                       | Phase 48 (proposed)   | Single source of truth; admin space points to `/admin`.                                  |
| Per-route-group layout composition                      | Shared `SpaceChrome` component                               | Phase 48 (proposed)   | Single component consumed by both `dashboard/layout.tsx` and the new `admin/layout.tsx`. |

**Deprecated/outdated:**

- The `async redirects()` block in `next.config.mjs` (Phase 37 removed this).
- The legacy `src/app/(tenant)/dashboard/admin/[domain]/page.tsx` route (still present for back-compat, no longer the canonical entry).
- The 6-tab `ADMIN_TABS` model and `DraggableWidget`/`AddWidgetModal`/`AdminWidgetRenderer` (removed in Phase 34, fully superseded by `AdminLayer`).

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new libraries; verified by direct file read.
- Architecture: HIGH — Next.js layout composition is the canonical mechanism; verified against the existing `dashboard/layout.tsx` and `(tenant)/layout.tsx` files.
- Active-space derivation: HIGH — exact regex change is testable; back-compat is preserved; the new branch is straightforward.
- Duplicate-chrome risk: HIGH — every admin sub-page was read or grep'd for its wrapper; all 27/27 are width-constrained inside the page, none conflict with a passthrough `<main>`.
- Edge cases: MEDIUM — the survey editor's potential toolbar collision is the only unverified item. Manual visual verification recommended.
- Test surface: HIGH — vitest is configured; the new tests fit the existing pattern (see `src/entities/tenant/api/flags/platform-flags.test.ts` as a sibling example).

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (30 days — stable; no fast-moving dependencies)

---

## RESEARCH COMPLETE

**Phase:** 48 — Admin Chrome Parity
**Confidence:** HIGH
**Recommended approach:** Approach 1 (Shared layout component)
**Files to create:** 3 (`SpaceChrome.tsx`, `admin/layout.tsx`, `active-space.test.ts` + `spaces.test.ts` for the href)
**Files to edit:** 4 (`dashboard/layout.tsx`, `spaces.ts`, `SpaceLauncher.tsx`, `MobileSpaceBar.tsx`)
**Risks:** Zero file moves; zero URL changes; zero impact on existing admin sub-pages. Only verified risk: survey editor toolbar may need 16px clearance from the collapsed sidebar (manual verification only).
**Open questions:** 5 (none blocking — see "Open Questions" section).
**Ready for planning.**
