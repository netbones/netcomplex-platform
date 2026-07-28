# Future-Proofing the Widget Registry for App Registry Evolution

### React-RND Edition — SA Startup Connect

**Audience:** Frontend developers working on the Next.js dashboard using `react-rnd`  
**Goal:** Document the current architecture and design the widget registry so it can evolve into a full app registry without a rewrite

---

## Why This Matters

A drag-and-drop dashboard built with ad-hoc component imports will hit a wall the moment the business wants third-party integrations, independently deployed widgets, or a plugin marketplace. The patterns in this document cost almost nothing to adopt now and save a full architectural rewrite later.

The core principle: **treat every widget as a registered entity, not just an imported component.** This one shift is what makes the difference.

> **react-rnd and grid units:** The SA Startup Connect dashboard uses a grid-unit system (`1 unit = 120px`) for layout storage. `react-rnd` operates in pixels, so a conversion layer translates between them at render time. All manifest size constraints are declared in **grid units** and converted to pixels by `WidgetContainer`. This is the supported pattern — do not store raw pixel values in layout state.

---

## Table of Contents

1. [The Widget Manifest](#1-the-widget-manifest)
2. [The Registry Class](#2-the-registry-class)
3. [Lazy Loading and the Loader Pattern](#3-lazy-loading-and-the-loader-pattern)
4. [The Widget Renderer](#4-the-widget-renderer)
5. [The WidgetContainer and DashboardGrid](#5-the-widgetcontainer-and-dashboardgrid)
6. [Mobile Strategy — The Switching Pattern](#6-mobile-strategy--the-switching-pattern)
7. [Edit Mode and WidgetToolbar](#7-edit-mode-and-widgettoolbar)
8. [Collapsed State](#8-collapsed-state)
9. [Overflow and Scroll Containment](#9-overflow-and-scroll-containment)
10. [Layout as Pure Data](#10-layout-as-pure-data)
11. [Config Versioning and Migrations](#11-config-versioning-and-migrations)
12. [Folder Structure](#12-folder-structure)
13. [The Migration Path to an App Registry](#13-the-migration-path-to-an-app-registry)
14. [Rules and Checklist](#14-rules-and-checklist)

---

## 1. The Widget Manifest

Every widget must be described by a manifest — a plain object that captures its identity, capabilities, display metadata, and layout constraints. The manifest is the contract between a widget and the registry.

**Do not do this:**

```ts
// ❌ BAD — widget is just an import, has no identity
import AnalyticsWidget from './widgets/Analytics';
const widgets = { analytics: AnalyticsWidget };
```

**Do this instead:**

```ts
// ✅ GOOD — widget has a full manifest
// registry/types.ts

import type { LucideIcon } from 'lucide-react';

export interface WidgetManifest {
  // Identity
  id: string; // globally unique, kebab-case e.g. "analytics-overview"
  version: string; // semver e.g. "1.0.0"
  name: string; // display name shown in widget header and add-widget modal
  description: string; // one sentence, shown in add-widget modal (keep under 50 chars)
  author: string; // "internal" or future: a vendor name
  category: WidgetCategory; // used for grouping in the add-widget modal

  // Display metadata
  icon: LucideIcon; // Lucide React icon — shown in add-widget modal and collapsed state

  // Component loading — today local, tomorrow remote
  component: React.LazyExoticComponent<any>;
  loader?: () => Promise<{ default: React.ComponentType<any> }>;

  // Capabilities — mirrors what app registries require
  permissions?: UserRole[]; // restrict to user roles: 'startup' | 'investor' | 'admin'
  configSchema?: Record<string, unknown>; // JSON Schema for per-instance widget settings

  // Layout constraints — declared in GRID UNITS (1 unit = 120px)
  // WidgetContainer converts to pixels before passing to react-rnd
  defaultSize: GridSize; // e.g. { width: 2, height: 2 }
  minSize?: GridSize; // minimum resizable size
  maxSize?: GridSize; // optional maximum resizable size

  // react-rnd behaviour flags
  lockAspectRatio?: boolean; // maps to react-rnd lockAspectRatio prop
  dragHandleClassName?: string; // CSS class that initiates drag — default: 'widget-drag-handle'

  // Config migrations (see Section 11)
  migrations?: Record<string, (oldConfig: unknown) => unknown>;
}

export type WidgetCategory = 'overview' | 'communication' | 'actions' | 'analytics' | 'content';
export type UserRole = 'startup' | 'investor' | 'admin';
export interface GridSize {
  width: number;
  height: number;
}
```

The `loader` field is the escape hatch. Today it resolves to a local dynamic import. Later, it resolves to a remote Module Federation URL. Nothing else in the codebase changes.

> **Why declare `icon` and `category` on the manifest?** These are UI metadata used by the add-widget modal and collapsed state. Keeping them on the manifest means the modal can be driven entirely from `registry.list()` — it never needs to know about individual widget files.

> **Why grid units on the manifest?** Grid units are resolution-independent. A `{ width: 2, height: 2 }` widget renders correctly at any screen size because the grid cell size can adapt. Raw pixel constraints would break across viewport widths. `WidgetContainer` handles the `gridUnit * gridSize` conversion before passing to `<Rnd>`.

---

## 2. The Registry Class

Use a class, not a plain object or a static map. A class gives you a well-defined API that can be extended (async resolution, remote fetching, caching) without changing call sites.

**Do not do this:**

```ts
// ❌ BAD — plain object, no extension point
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'profile-summary': { ... },
  'messages': { ... },
}
```

**Do this instead:**

```ts
// ✅ GOOD — registry class with async extension point
// registry/WidgetRegistry.ts

class WidgetRegistry {
  private manifests = new Map<string, WidgetManifest>();

  register(manifest: WidgetManifest): void {
    if (this.manifests.has(manifest.id)) {
      console.warn(`[Registry] Overwriting widget: ${manifest.id}`);
    }
    this.manifests.set(manifest.id, manifest);
  }

  resolve(id: string): WidgetManifest | undefined {
    return this.manifests.get(id);
  }

  list(): WidgetManifest[] {
    return [...this.manifests.values()];
  }

  // Filter by user role — used by the add-widget modal
  listForRole(role: UserRole): WidgetManifest[] {
    return this.list().filter(m => !m.permissions || m.permissions.includes(role));
  }

  // Future-ready: today falls back to local, later hits an API
  async resolveAsync(id: string): Promise<WidgetManifest> {
    const local = this.resolve(id);
    if (local) return local;

    // Phase 2: uncomment to fetch from app registry API
    // const remote = await fetchFromAppRegistry(id)
    // if (remote) return remote

    throw new Error(`[Registry] Widget not found: ${id}`);
  }
}

export const registry = new WidgetRegistry();
```

Keep this a singleton exported from one location. Every other file imports from `registry/WidgetRegistry`, never from widget files directly.

> **Migrating from `WIDGET_REGISTRY`:** Replace `WIDGET_REGISTRY[id]` with `registry.resolve(id)` and `Object.values(WIDGET_REGISTRY)` with `registry.list()` or `registry.listForRole(role)`. This is a mechanical find-and-replace — no widget components change.

---

## 3. Lazy Loading and the Loader Pattern

All widgets must be lazy-loaded from day one. This is mandatory, not optional. It aligns local widgets with the pattern remote widgets will require, and eliminates the need for a `switch` statement in `WidgetRenderer`.

**Do not do this:**

```ts
// ❌ BAD — eager imports, switch-case dispatch, two files to update per widget
import { ProfileSummaryWidget } from './widgets/ProfileSummaryWidget'
import { ConnectionsWidget } from './widgets/ConnectionsWidget'

export function WidgetRenderer({ widgetId }) {
  switch (widgetId) {
    case 'profile-summary': return <ProfileSummaryWidget />
    case 'connections': return <ConnectionsWidget />
    // Adding a widget = editing this file AND widgets/index.ts
  }
}
```

**Do this instead:**

```ts
// ✅ GOOD — all registrations in one file, WidgetRenderer needs no changes
// registry/widgets.ts

import { lazy } from 'react';
import { User, MessageSquare, TrendingUp, Activity, Zap, Star } from 'lucide-react';
import { registry } from './WidgetRegistry';

registry.register({
  id: 'profile-summary',
  version: '1.0.0',
  name: 'Profile Summary',
  description: 'Quick view of your profile completion and key metrics',
  author: 'internal',
  category: 'overview',
  icon: User,
  permissions: undefined, // available to all roles
  component: lazy(() =>
    import('../widgets/ProfileSummaryWidget').then(m => ({ default: m.ProfileSummaryWidget }))
  ),
  loader: () => import('../widgets/ProfileSummaryWidget'),
  defaultSize: { width: 2, height: 1 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'messages',
  version: '1.0.0',
  name: 'Messages',
  description: 'Unread messages and recent conversations',
  author: 'internal',
  category: 'communication',
  icon: MessageSquare,
  component: lazy(() =>
    import('../widgets/MessagesWidget').then(m => ({ default: m.MessagesWidget }))
  ),
  loader: () => import('../widgets/MessagesWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'deal-flow',
  version: '1.0.0',
  name: 'Deal Flow',
  description: 'Investor deal pipeline and status',
  author: 'internal',
  category: 'overview',
  icon: TrendingUp,
  permissions: ['investor'], // investor only
  component: lazy(() =>
    import('../widgets/DealFlowWidget').then(m => ({ default: m.DealFlowWidget }))
  ),
  loader: () => import('../widgets/DealFlowWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});
```

> **Named exports and `React.lazy`:** `React.lazy` requires a default export. If your widget uses a named export (e.g. `export function ProfileSummaryWidget`), use the `.then(m => ({ default: m.ProfileSummaryWidget }))` pattern shown above. Alternatively, add `export default` to each widget file.

When a remote widget is introduced in Phase 2, its registration looks like this — the rest of the system is unchanged:

```ts
// Phase 2 example — remote widget loaded via Module Federation
registry.register({
  id: 'external-crm-widget',
  version: '2.1.0',
  name: 'CRM Pipeline',
  author: 'acme-corp',
  category: 'overview',
  icon: Star,
  permissions: ['investor'],
  component: lazy(() => loadRemoteModule('https://cdn.acme.com/widget.js', 'CRMWidget')),
  loader: () => loadRemoteModule('https://cdn.acme.com/widget.js', 'CRMWidget'),
  defaultSize: { width: 3, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});
```

---

## 4. The Widget Renderer

Never render a widget component directly in layout code. All widgets must go through a single `WidgetRenderer`. This is the most important architectural rule in this document.

The renderer is the single choke point for every cross-cutting concern: error isolation, suspense boundaries, permission enforcement, and future sandboxing. It is **not** responsible for the `<Rnd>` wrapper — that lives in `WidgetContainer`. The renderer only concerns itself with the widget's inner content.

```tsx
// components/dashboard/WidgetRenderer.tsx
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { registry } from '@/registry/WidgetRegistry';
import { resolveConfig } from '@/utils/resolveConfig';
import { WidgetSkeleton } from './WidgetSkeleton';
import { WidgetError } from './WidgetError';
import { WidgetPermissionGate } from './WidgetPermissionGate';
import type { WidgetLayout } from '@/types/dashboard';

interface WidgetRendererProps {
  layout: WidgetLayout;
  userRole: UserRole;
}

export function WidgetRenderer({ layout, userRole }: WidgetRendererProps) {
  const manifest = registry.resolve(layout.widgetId);

  if (!manifest) {
    return <WidgetNotFound id={layout.widgetId} />;
  }

  // Migrate stored config to current widget version before rendering
  const resolvedConfig = resolveConfig(
    layout.config ?? {},
    layout.configVersion ?? '1.0.0',
    manifest
  );

  const Widget = manifest.component;

  return (
    <ErrorBoundary fallback={<WidgetError id={layout.widgetId} />}>
      <Suspense fallback={<WidgetSkeleton />}>
        <WidgetPermissionGate permissions={manifest.permissions} userRole={userRole}>
          <Widget collapsed={layout.collapsed ?? false} config={resolvedConfig} />
        </WidgetPermissionGate>
      </Suspense>
    </ErrorBoundary>
  );
}
```

**`WidgetPermissionGate`** enforces permissions at render time — not just at add-widget time. This ensures a widget doesn't render if a user's role changes after the layout was saved:

```tsx
// components/dashboard/WidgetPermissionGate.tsx

interface Props {
  permissions?: UserRole[];
  userRole: UserRole;
  children: React.ReactNode;
}

export function WidgetPermissionGate({ permissions, userRole, children }: Props) {
  if (permissions && !permissions.includes(userRole)) {
    return null; // or <WidgetAccessDenied /> for a visible placeholder
  }
  return <>{children}</>;
}
```

**What gets added to `WidgetRenderer` in future phases — and nowhere else:**

| Phase   | Addition                                                        |
| ------- | --------------------------------------------------------------- |
| Now     | ErrorBoundary, Suspense, WidgetPermissionGate, config migration |
| Phase 2 | Telemetry / analytics per widget render                         |
| Phase 3 | Iframe sandboxing for untrusted third-party widgets             |
| Phase 4 | Rate limiting and quota enforcement per app                     |

---

## 5. The WidgetContainer and DashboardGrid

`WidgetContainer` is the only file that imports or uses `<Rnd>`. It is responsible for converting grid units to pixels and wiring all react-rnd props from the manifest. Widget components inside it have no knowledge of react-rnd.

### Grid Unit to Pixel Conversion

```ts
const GRID_SIZE = 120; // px per grid unit — defined once, used everywhere

function toPixels(units: number) {
  return units * GRID_SIZE;
}
```

### WidgetContainer

```tsx
// components/dashboard/WidgetContainer.tsx
'use client'

import { Rnd } from 'react-rnd'
import { registry } from '@/registry/WidgetRegistry'
import { WidgetRenderer } from './WidgetRenderer'
import type { WidgetLayout } from '@/types/dashboard'

const GRID_SIZE = 120

interface WidgetContainerProps {
  layout: WidgetLayout
  isEditing: boolean
  userRole: UserRole
  onUpdate: (id: string, patch: Partial<WidgetLayout>) => void
}

export function WidgetContainer({ layout, isEditing, userRole, onUpdate }: WidgetContainerProps) {
  const manifest = registry.resolve(layout.widgetId)
  if (!manifest) return null

  // Convert grid units to pixels for react-rnd
  const pixelX      = layout.x * GRID_SIZE
  const pixelY      = layout.y * GRID_SIZE
  const pixelWidth  = layout.width * GRID_SIZE
  const pixelHeight = layout.height * GRID_SIZE
  const minWidth    = (manifest.minSize?.width  ?? 1) * GRID_SIZE
  const minHeight   = (manifest.minSize?.height ?? 1) * GRID_SIZE
  const maxWidth    = manifest.maxSize ? manifest.maxSize.width  * GRID_SIZE : undefined
  const maxHeight   = manifest.maxSize ? manifest.maxSize.height * GRID_SIZE : undefined

  return (
    <Rnd
      size={{ width: pixelWidth, height: pixelHeight }}
      position={{ x: pixelX, y: pixelY }}

      // Constraints from manifest — never hardcoded here
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      lockAspectRatio={manifest.lockAspectRatio ?? false}

      // Edit mode gating
      disableDragging={!isEditing}
      enableResizing={isEditing}

      // Drag confined to canvas
      bounds="parent"

      // Only the handle element initiates drag
      dragHandleClassName={manifest.dragHandleClassName ?? 'widget-drag-handle'}

      // Persist position on drag end — convert pixels back to grid units
      onDragStop={(_e, data) => {
        onUpdate(layout.id, {
          x: Math.round(data.x / GRID_SIZE),
          y: Math.round(data.y / GRID_SIZE),
        })
      }}

      // Persist size and position on resize end
      // IMPORTANT: use ref.offsetWidth/offsetHeight (numbers), NOT ref.style.width (string)
      // IMPORTANT: always spread `position` — left/top-edge resizes move the origin point
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        onUpdate(layout.id, {
          width:  Math.round(ref.offsetWidth  / GRID_SIZE),
          height: Math.round(ref.offsetHeight / GRID_SIZE),
          x:      Math.round(position.x / GRID_SIZE),
          y:      Math.round(position.y / GRID_SIZE),
        })
      }}

      style={{ boxSizing: 'border-box' }}
    >
      {/* Drag handle — must match dragHandleClassName */}
      <div className="widget-drag-handle flex items-center justify-between p-3 border-b bg-muted/50 cursor-grab active:cursor-grabbing">
        <h3 className="font-semibold text-sm truncate">{manifest.name}</h3>
        {isEditing && <WidgetEditControls layoutId={layout.id} onRemove={...} onCollapse={...} />}
      </div>

      {/* Widget content — fully decoupled from Rnd */}
      <div style={{ width: '100%', height: 'calc(100% - 44px)', overflow: 'hidden' }}>
        <WidgetRenderer layout={layout} userRole={userRole} />
      </div>
    </Rnd>
  )
}
```

### Critical react-rnd Behaviours

**`onResizeStop` gives strings from `ref.style`** — always use `ref.offsetWidth` / `ref.offsetHeight` (numbers). `ref.style.width` returns `"400px"` which causes silent `NaN` bugs when converting back to grid units.

**`onResizeStop` also delivers the new `position`** — a resize from the top or left edge moves the origin point. Always spread `position` into your state update or widgets will visually jump back.

**`bounds="parent"` requires `position: relative` on the container** — `DashboardGrid`'s desktop container must have `position: relative` (or use `relative` Tailwind class).

**`disableDragging` vs `enableResizing`** — both must be gated on `isEditing`. When `isEditing` is false, widgets should be fully static.

**`dragHandleClassName` takes a class name without a leading dot** — pass `"widget-drag-handle"` not `".widget-drag-handle"`.

**`scale` prop for zoomed canvases** — if you add zoom/pan to the dashboard in future, pass the current scale value to `<Rnd scale={zoom} />` or resize/drag deltas will be miscalculated.

---

## 6. Mobile Strategy — The Switching Pattern

`react-rnd` relies on absolute pixel positioning, which breaks on mobile. The dashboard uses a **switching strategy**: on mobile, widgets render as a static vertical stack with no drag or resize. On desktop, they use the full `<Rnd>`-powered canvas.

### The `useIsMobile` Hook

```ts
// hooks/useIsMobile.ts

export function useIsMobile(breakpoint = 768) {
  // Start with `true` to prevent flash of desktop grid on mobile during SSR hydration
  const [isMobile, setIsMobile] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  // Return true (mobile) until mounted to avoid SSR mismatch
  if (!mounted) return true;
  return isMobile;
}
```

> **Why start with `true`?** During SSR, `window` does not exist. Starting with `true` (mobile) means the server and first client render agree. Once the component mounts, the real value is set. Starting with `false` causes a hydration mismatch flash of the full desktop grid on mobile.

### DashboardGrid

```tsx
// components/dashboard/DashboardGrid.tsx
'use client';

export function DashboardGrid({ isEditing, userRole }: Props) {
  const { layout } = useDashboardStore();
  const isMobile = useIsMobile();

  const pixelWidth = MAX_COLS * GRID_SIZE;
  const pixelHeight = MAX_ROWS * GRID_SIZE;

  if (isMobile) {
    // Static vertical stack — no Rnd, no absolute positioning
    return (
      <div className="w-full px-4 py-4 space-y-4">
        {layout.map(widget => (
          <MobileWidgetCard
            key={widget.id}
            layout={widget}
            isEditing={isEditing}
            userRole={userRole}
          />
        ))}
      </div>
    );
  }

  // Desktop: absolute canvas with react-rnd
  return (
    <div className="relative" style={{ width: pixelWidth, height: pixelHeight }}>
      {layout.map(widget => (
        <WidgetContainer
          key={widget.id}
          layout={widget}
          isEditing={isEditing}
          userRole={userRole}
          onUpdate={updateWidget}
        />
      ))}
    </div>
  );
}
```

### MobileWidgetCard

Mobile renders widgets inside a plain `Card` — no `<Rnd>`, no absolute positioning. The widget content is identical because it comes from the same `WidgetRenderer`:

```tsx
// components/dashboard/MobileWidgetCard.tsx

export function MobileWidgetCard({ layout, isEditing, userRole }: Props) {
  const manifest = registry.resolve(layout.widgetId)
  if (!manifest) return null

  return (
    <Card className="h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <h3 className="font-semibold text-sm truncate">{manifest.name}</h3>
        {isEditing && <WidgetEditControls layoutId={layout.id} ... />}
      </div>
      <WidgetRenderer layout={layout} userRole={userRole} />
    </Card>
  )
}
```

Both `WidgetContainer` (desktop) and `MobileWidgetCard` (mobile) delegate rendering to `WidgetRenderer` — widgets never know which surface they're on.

---

## 7. Edit Mode and WidgetToolbar

The dashboard has two modes: **view mode** (static, content-focused) and **edit mode** (drag, resize, add, remove). The `isEditing` boolean gates all interactive behaviour.

```tsx
// components/dashboard/Dashboard.tsx

export function Dashboard({ userRole }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <WidgetToolbar
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(e => !e)}
        userRole={userRole}
      />
      <DashboardGrid isEditing={isEditing} userRole={userRole} />
    </div>
  );
}
```

### WidgetToolbar

`WidgetToolbar` provides the top-level controls. It is not a widget — it sits outside the grid and always renders:

```tsx
// components/dashboard/WidgetToolbar.tsx

export function WidgetToolbar({ isEditing, onToggleEdit, userRole }: Props) {
  const { addWidget, resetLayout } = useDashboardStore();
  const availableWidgets = registry.listForRole(userRole);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      <Button variant={isEditing ? 'default' : 'outline'} onClick={onToggleEdit}>
        {isEditing ? 'Done' : 'Edit Dashboard'}
      </Button>

      {isEditing && (
        <>
          {/* Add Widget dialog — driven entirely from registry.listForRole() */}
          <AddWidgetDialog widgets={availableWidgets} onAdd={addWidget} />
          <Button variant="ghost" onClick={resetLayout}>
            Reset Layout
          </Button>
          <p className="text-xs text-muted-foreground ml-2">
            Drag widgets to rearrange • Drag corners to resize
          </p>
        </>
      )}
    </div>
  );
}
```

### What `isEditing` controls

| Behaviour                 | View mode                | Edit mode                 |
| ------------------------- | ------------------------ | ------------------------- |
| `<Rnd>` dragging          | `disableDragging={true}` | `disableDragging={false}` |
| `<Rnd>` resizing          | `enableResizing={false}` | `enableResizing={true}`   |
| Collapse/remove buttons   | Hidden                   | Visible                   |
| Add widget / reset layout | Hidden                   | Visible                   |
| Instructions text         | Hidden                   | Visible                   |

---

## 8. Collapsed State

Widgets support a **collapsed** state — a compact single-row summary shown when the user minimises a widget. Both desktop and mobile surfaces pass `collapsed` to the widget component.

### On `WidgetLayout`

```ts
interface WidgetLayout {
  // ...
  collapsed?: boolean; // true = compact summary row; false or undefined = full content
}
```

### Widget component pattern

Every widget component must handle `collapsed`:

```tsx
interface MyWidgetProps {
  collapsed?: boolean
  config?: Record<string, unknown>
}

export function MyWidget({ collapsed }: MyWidgetProps) {
  const { data } = useSuspenseQuery({ ... })

  // Collapsed: compact single-row summary with key metric
  if (collapsed) {
    return (
      <div className="flex items-center gap-2 p-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">My Widget</span>
        <Badge variant="secondary" className="ml-auto">{data.keyMetric}</Badge>
      </div>
    )
  }

  // Expanded: full content
  return (
    <Card className="h-full overflow-hidden">
      {/* ... full widget content ... */}
    </Card>
  )
}
```

The collapse toggle lives in the widget header controls (inside `WidgetContainer` and `MobileWidgetCard`) and calls `toggleWidgetCollapse(layout.id)` on the Zustand store.

---

## 9. Overflow and Scroll Containment

All widgets must handle overflow correctly so content doesn't spill out when the widget is resized small. This pattern is **required** on every widget.

```tsx
<Card className="h-full overflow-hidden">
  {' '}
  {/* Outer: clip overflow */}
  <CardHeader className="pb-3 flex-shrink-0">
    {' '}
    {/* Header: fixed height */}
    <CardTitle>Widget Title</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col h-full overflow-hidden">
    {/* Scrollable content area — min-h-0 is critical */}
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{/* Content */}</div>
    {/* Optional fixed-height footer */}
    <div className="flex-shrink-0 pt-3">{/* Action buttons */}</div>
  </CardContent>
</Card>
```

### Why `min-h-0` is required

In a flex column container, the default `min-height: auto` prevents flex children from shrinking below their natural content size. Without `min-h-0`, `overflow-y-auto` has nothing to constrain — the div expands to fit its content instead of scrolling. `min-h-0` overrides this and allows proper shrinking.

### Key CSS classes

| Class                                  | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `h-full overflow-hidden`               | Card clips any overflow                                            |
| `flex-shrink-0`                        | Header and footer maintain fixed height                            |
| `flex flex-col h-full overflow-hidden` | CardContent is a flex column that clips overflow                   |
| `flex-1 min-h-0`                       | **Critical**: allows flex children to shrink and enables scrolling |
| `overflow-y-auto overscroll-contain`   | Smooth scrolling with contained bounce effect                      |

---

## 10. Layout as Pure Data

Dashboard layout stored in the Zustand store (and eventually the database) must never reference component imports, file paths, or module names. It stores only the registry ID plus grid-unit position values.

```ts
// types/dashboard.ts

export interface DashboardLayout {
  userId: string;
  widgets: WidgetLayout[];
}

export interface WidgetLayout {
  id: string; // instance ID — unique per placed widget e.g. "profile-summary-a3f9"
  widgetId: string; // registry ID — e.g. "profile-summary"
  x: number; // grid units from left of canvas
  y: number; // grid units from top of canvas
  width: number; // grid units
  height: number; // grid units
  collapsed?: boolean; // collapse state
  config?: Record<string, unknown>; // per-instance user config (future)
  configVersion?: string; // semver of widget version that wrote config (future)
}
```

**Generating instance IDs:**

```ts
const instanceId = `${widgetId}-${crypto.randomUUID().slice(0, 8)}`;
```

**Initialising a new widget instance from the manifest:**

```ts
function createInstance(widgetId: string, dropPosition: { x: number; y: number }): WidgetLayout {
  const manifest = registry.resolve(widgetId);
  if (!manifest) throw new Error(`Unknown widget: ${widgetId}`);

  return {
    id: `${widgetId}-${crypto.randomUUID().slice(0, 8)}`,
    widgetId,
    x: dropPosition.x,
    y: dropPosition.y,
    width: manifest.defaultSize.width,
    height: manifest.defaultSize.height,
    collapsed: false,
    config: {},
    configVersion: manifest.version,
  };
}
```

### State management

Layout is currently managed by **Zustand with `persist` middleware** (localStorage). This is fast and works well for single-device use. If cross-device sync is needed in future, the store's `onResizeStop` / `onDragStop` callbacks should also write to a backend API — the layout data shape is already backend-ready.

---

## 11. Config Versioning and Migrations

Widgets evolve. Their config schemas will change. Without migrations, a user's saved config can break silently when a new widget version ships.

Add `version` to every manifest entry **now** — even before per-instance config is stored. This ensures the field exists in the data from day one, making future migrations possible.

```ts
registry.register({
  id: 'analytics-overview',
  version: '2.0.0', // bump this on any breaking config change
  // ...
  migrations: {
    // When stored configVersion is '1.0.0', transform it to the v2.0.0 shape
    '1.0.0': (oldConfig: unknown) => {
      const c = oldConfig as Record<string, unknown>;
      return {
        ...c,
        dateRange: c.range ?? '30d', // field renamed from 'range' to 'dateRange'
        showComparisons: false, // new field, default value
      };
    },
  },
});
```

Apply migrations in `WidgetRenderer` via a utility before passing config to the widget:

```ts
// utils/resolveConfig.ts

export function resolveConfig(
  storedConfig: Record<string, unknown>,
  storedVersion: string,
  manifest: WidgetManifest
): Record<string, unknown> {
  let config = storedConfig;
  const migrations = manifest.migrations ?? {};

  // Apply each migration whose source version matches what was stored
  for (const [fromVersion, migrate] of Object.entries(migrations)) {
    if (storedVersion === fromVersion) {
      config = migrate(config) as Record<string, unknown>;
    }
  }

  return config;
}
```

This pattern is identical to what production app registries (Shopify, Salesforce) use for extension config upgrades. The Zustand store's `version` field handles whole-store schema migrations — `configVersion` on `WidgetLayout` handles per-widget config migrations independently.

---

## 12. Folder Structure

```
src/
├── registry/
│   ├── types.ts              # WidgetManifest, WidgetCategory, UserRole, GridSize
│   ├── WidgetRegistry.ts     # Registry class and singleton export
│   └── widgets.ts            # All register() calls — the only file that calls register()
│
├── hooks/
│   └── useIsMobile.ts        # SSR-safe mobile detection hook
│
├── store/
│   └── dashboardStore.ts     # Zustand store with layout persistence
│
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx             # isEditing state, top-level layout
│       ├── DashboardGrid.tsx         # Switches between desktop canvas and mobile stack
│       ├── WidgetContainer.tsx       # <Rnd> wrapper — the only file that uses <Rnd>
│       ├── MobileWidgetCard.tsx      # Static card for mobile
│       ├── WidgetRenderer.tsx        # ErrorBoundary + Suspense + WidgetPermissionGate
│       ├── WidgetToolbar.tsx         # Edit mode controls and add-widget dialog
│       ├── WidgetPermissionGate.tsx  # Role enforcement at render time
│       ├── WidgetSkeleton.tsx        # Loading state placeholder
│       ├── WidgetError.tsx           # Per-widget error fallback
│       └── WidgetNotFound.tsx        # Unknown widgetId fallback
│
├── widgets/                  # Widget component implementations
│   ├── ProfileSummaryWidget.tsx
│   ├── ConnectionsWidget.tsx
│   ├── MessagesWidget.tsx
│   ├── FundingTrackerWidget.tsx
│   ├── MatchSuggestionsWidget.tsx
│   ├── ActivityFeedWidget.tsx
│   ├── QuickActionsWidget.tsx
│   └── AnalyticsWidget.tsx
│
├── utils/
│   └── resolveConfig.ts      # Config migration utility
│
└── types/
    └── dashboard.ts          # DashboardLayout, WidgetLayout, GridSize
```

**The three boundary rules that must never be broken:**

- `registry/widgets.ts` is the **only** file that calls `registry.register()`.
- `components/dashboard/WidgetContainer.tsx` is the **only** file that imports or uses `<Rnd>`.
- Widget files in `widgets/` never import from each other and have no knowledge of react-rnd, the grid system, or layout state.

---

## 13. The Migration Path to an App Registry

These phases can be done independently and in order. No phase requires changes to `DashboardGrid`, `MobileWidgetCard`, or any widget component.

**Phase 1 — Current target state (implement now)**

- `WidgetManifest` interface with `icon`, `category`, `version`, grid constraints, `loader`
- `WidgetRegistry` class with `resolveAsync` and `listForRole`
- All widgets registered via `registry/widgets.ts` using `React.lazy()`
- `WidgetRenderer` wraps all widgets in `ErrorBoundary` + `Suspense` + `WidgetPermissionGate`
- `WidgetContainer` sources all `<Rnd>` constraints from manifest; converts grid units to pixels
- Layout stored with `widgetId` strings and `configVersion` field

**Phase 2 — Remote widget loading**

- Implement `loadRemoteModule` using Webpack Module Federation or a CDN-based loader
- Update `resolveAsync` to fall back to a remote registry API if local resolve fails
- Remote widgets register using the same `WidgetManifest` shape — including `icon`, `category`, `version`

**Phase 3 — App install flow**

- Build a UI to browse, preview, and install apps (extends `AddWidgetDialog`)
- On install: write `{ widgetId, source, version }` to the user's installed apps table in the DB
- `resolveAsync` reads installed apps and hydrates manifests on demand
- `listForRole` filters installed apps by user role alongside local widgets

**Phase 4 — Sandboxing**

- For untrusted third-party widgets, swap `<WidgetRenderer />` inside `<Rnd>` for `<IframeWidget />`
- The `<Rnd>` wrapper, position, constraints, and mobile/desktop switching are untouched — only the inner rendering changes
- `WidgetPermissionGate` is already in place — extend it to enforce sandbox-level rules

---

## 14. Rules and Checklist

Use this list in code review for any PR that touches the dashboard or widget system.

**Registry**

- [ ] ⏳ Every widget has a unique `id` in kebab-case
- [ ] Every widget has a `version` in semver format — even if migrations aren't written yet
- [ ] ⏳ Every widget has an `icon` (Lucide component) and `category`
- [ ] All registrations are in `registry/widgets.ts` — nowhere else
- [ ] ⏳ No file imports a widget component directly (except `registry/widgets.ts`)

**Loading**

- [ ] All widgets use `React.lazy()` — no eager imports in `WidgetRenderer`
- [ ] ⏳ All widgets declare a `loader` function alongside `component`
- [ ] ⏳ Named exports use `.then(m => ({ default: m.WidgetName }))` with `React.lazy`

**`WidgetRenderer`**

- [ ] ⏳ All widget renders go through `<WidgetRenderer layout={...} userRole={...} />`
- [ ] ⏳ No widget component is rendered directly in layout or page code
- [ ] ⏳ `WidgetRenderer` wraps every widget in `ErrorBoundary` and `Suspense`
- [ ] ⏳ `WidgetPermissionGate` is applied inside `WidgetRenderer` (not just at add-widget time)
- [ ] ⏳ `resolveConfig` is called in `WidgetRenderer` before passing config to the widget

**`WidgetContainer` / react-rnd**

- [ ] `<Rnd>` is only used in `WidgetContainer` — never in widget components or pages
- [ ] ⏳ `minWidth`, `minHeight`, `maxWidth`, `maxHeight` are converted from manifest grid units, not hardcoded
- [ ] ⏳ `onResizeStop` uses `ref.offsetWidth` / `ref.offsetHeight`, **not** `ref.style.width` / `ref.style.height`
- [ ] ⏳ `onResizeStop` spreads the `position` argument into the state update (handles top/left-edge resize)
- [ ] ⏳ `disableDragging` and `enableResizing` are both gated on `isEditing`
- [ ] ⏳ Canvas container (`DashboardGrid` desktop) has `position: relative`
- [ ] ⏳ `dragHandleClassName` is set without a leading dot

**Widget components**

- [ ] ⏳ `'use client'` directive at the top of every widget file
- [ ] Widget handles `collapsed` prop — compact summary when `collapsed === true`
- [ ] Overflow/concertina CSS pattern applied: `h-full overflow-hidden` → `flex-1 min-h-0 overflow-y-auto`
- [ ] ⏳ Data fetching uses `useSuspenseQuery` (not `useQuery`) to work with the Suspense boundary

**Mobile**

- [ ] `useIsMobile` used via `DashboardGrid` — never call it in widget components
- [ ] ⏳ Widget renders identically in `WidgetContainer` (desktop) and `MobileWidgetCard` (mobile)
- [ ] ⏳ Test at 320px, 768px, and 1024px breakpoints

**Layout data**

- [ ] Layout uses grid units (`x`, `y`, `width`, `height`) — never raw pixel values
- [ ] ⏳ Layout contains `widgetId` strings, not component references
- [ ] ⏳ Each placed widget has a unique `id` (instance ID)
- [ ] ⏳ `collapsed` is stored on `WidgetLayout`
- [ ] ⏳ `configVersion` is stored alongside `config`

**Migrations**

- [ ] ⏳ Any config schema change bumps the widget `version`
- [ ] ⏳ Any breaking config change includes a `migrations` entry for the previous version

---

## Quick Reference

| Concept          | File                                       | Rule                                                    |
| ---------------- | ------------------------------------------ | ------------------------------------------------------- |
| Widget shape     | `registry/types.ts`                        | Single source of truth for `WidgetManifest`             |
| Registration     | `registry/widgets.ts`                      | Only place `register()` is called                       |
| Resolution       | `registry/WidgetRegistry.ts`               | Use `resolveAsync` for production calls                 |
| Mobile detection | `hooks/useIsMobile.ts`                     | Always start with `true` for SSR safety                 |
| Layout switching | `components/dashboard/DashboardGrid.tsx`   | Switches Rnd canvas ↔ mobile stack                      |
| RND wrapper      | `components/dashboard/WidgetContainer.tsx` | Only place `<Rnd>` is used                              |
| Widget content   | `components/dashboard/WidgetRenderer.tsx`  | All widgets go through here                             |
| Edit controls    | `components/dashboard/WidgetToolbar.tsx`   | Add/remove/reset; driven by `registry.listForRole()`    |
| Layout state     | `store/dashboardStore.ts`                  | Zustand + persist; grid units only                      |
| Layout types     | `types/dashboard.ts`                       | `WidgetLayout` with `widgetId`, grid units, `collapsed` |
| Config upgrade   | `utils/resolveConfig.ts`                   | Called in `WidgetRenderer` before widget renders        |

---

## react-rnd Props Mapped to Manifest Fields

| Manifest field        | react-rnd prop          | Conversion                        |
| --------------------- | ----------------------- | --------------------------------- |
| `defaultSize.width`   | `size.width` (initial)  | `× GRID_SIZE`                     |
| `defaultSize.height`  | `size.height` (initial) | `× GRID_SIZE`                     |
| `minSize.width`       | `minWidth`              | `× GRID_SIZE`                     |
| `minSize.height`      | `minHeight`             | `× GRID_SIZE`                     |
| `maxSize.width`       | `maxWidth`              | `× GRID_SIZE` (if defined)        |
| `maxSize.height`      | `maxHeight`             | `× GRID_SIZE` (if defined)        |
| `lockAspectRatio`     | `lockAspectRatio`       | Direct — `true` or a ratio number |
| _(edit mode gate)_    | `disableDragging`       | `!isEditing`                      |
| _(edit mode gate)_    | `enableResizing`        | `isEditing`                       |
| `dragHandleClassName` | `dragHandleClassName`   | Direct — no leading dot           |

---

_Last updated: April 2026_  
_Version: 2.0_  
_Owner: SA Startup Connect Frontend Platform Team_
