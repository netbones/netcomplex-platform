---
title: NetComplex Widget Registry — Architecture Alignment
status: current
reviewed: 2026-07-28
tags: [feature, spec]
audience: developer
---

# NetComplex Widget Registry — Architecture Alignment

**Project:** NetComplex SaaS Platform (`app.netbones.co.za` / `*.netbones.co.za`)  
**Documents reviewed:** `COMPONENT_REGISTRY.md`, `NETCOMPLEX_ARCHITECTURE.md`, `WIDGET_HELP.md`  
**Masterplan reference:** `widget-registry-architecture-react-rnd-v2.md`

---

## Executive Summary

NetComplex has made genuine architectural progress. The move from a hardcoded switch statement to a registry-based `getWidgetComponent()` lookup is the right direction, and the multi-tenant data plane design is solid. However, the widget system has three separate, partially-overlapping registries (`COMPONENT_REGISTRY.md`, `WIDGET_HELP.md`'s `ALL_WIDGETS` array, and `WIDGET_RENDERER`) that don't share a common manifest shape, and none of them carry the fields needed to evolve toward a tenant-configurable app marketplace — which is the obvious commercial endpoint for a multi-tenant SaaS platform.

The gaps below are ordered by priority.

---

## Part 1 — Gap Analysis

### Gap 1 — Three Registries, No Single Source of Truth ❌ Critical

**What exists:**

| Location                                      | Shape                                                                         | Purpose                                |
| --------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `src/components/registry.ts`                  | `WidgetRegistryEntry` — id, name, description, featureFlag, premium, category | Admin UI metadata, feature flag lookup |
| `src/app/dashboard/page.tsx`                  | `DashboardWidget` — id, type, title, icon (FontAwesome string), label         | Add-widget modal                       |
| `src/components/dashboard/WidgetRenderer.tsx` | Switch statement over `widgetId`                                              | Component dispatch                     |

These three structures describe the same 18 widgets in three different shapes with no enforcement that they stay in sync. Adding a new widget means editing at least three files. A widget can exist in the switch case but not in the admin registry, or vice versa. There is no single place to go to understand what a widget is, what it needs, and who can see it.

**What the masterplan requires:** One `WidgetManifest` in one registry class, where registration in that registry is the only action needed to make a widget exist in the system.

---

### Gap 2 — No `version` on Any Widget ❌ Critical

**What exists:** Neither `WidgetRegistryEntry` nor `DashboardWidget` has a `version` field.

**Why this matters for NetComplex specifically:** NetComplex is a multi-tenant SaaS. When a widget's config schema changes (and it will), every tenant's stored layout potentially holds stale config. Without a `version` field on each widget registration and a `configVersion` stored alongside each instance's config, there is no safe migration path — you either break existing tenant layouts or you can never change a widget's config shape.

This is the highest-urgency field to add because its absence compounds silently. Every day that passes without it, more tenant layout data accumulates with no version stamp.

---

### Gap 3 — Feature Flags Are a Dual-Source Lookup ⚠️ High

**What exists:** `WidgetRenderer` checks feature access from two sources in priority order:

1. `metadata.featureFlag` in `WIDGET_REGISTRY`
2. Fallback to `WIDGET_FEATURE_MAP` in `src/lib/dashboard-config.ts`

**The problem:** The fallback exists because the registry doesn't fully describe widgets. This dual-source lookup is a maintenance trap — changing a feature flag requires checking both locations, and new developers won't know the fallback exists. It also means the registry can't be trusted as the single source of truth for access control.

**What the masterplan requires:** Feature flags (and the broader concept of permissions) live on the manifest. The fallback `WIDGET_FEATURE_MAP` should be eliminated once all widgets carry their `featureFlag` in the registry.

---

### Gap 4 — No Lazy Loading ⚠️ High

**What exists:** `WidgetRenderer` uses a switch statement with eager imports (implied by `WIDGET_HELP.md`'s registration pattern). `WIDGET_HELP.md` suggests `next/dynamic` as a performance consideration, but this is not the registered pattern — it's an afterthought.

**What the masterplan requires:** All widgets must be registered with `React.lazy()` components. This is not primarily a performance concern — it's the structural requirement that makes a local widget and a remotely hosted widget indistinguishable to `WidgetRenderer`. Without it, there is no path to a third-party widget marketplace.

For NetComplex specifically, this matters more than for a single-tenant app: a marketplace where tenants install widgets from third-party vendors (or from NetComplex's own premium catalogue) is the natural commercial evolution of this platform. That evolution is architecturally blocked without lazy loading on the manifest.

---

### Gap 5 — Tenant Context Not Wired Into the Widget System ⚠️ High

**What exists:** `NETCOMPLEX_ARCHITECTURE.md` describes a well-designed tenant data plane with `x-tenant-id` / `x-tenant-slug` headers, `withTenant()` helpers, and `tenantId`-scoped DB queries. `WIDGET_HELP.md` describes widgets that "fetch their own data" with no props.

**The problem:** These two systems don't talk to each other at the widget level. If widgets fetch their own data without being tenant-aware, they will either:

- Always query the wrong tenant (global query instead of tenant-scoped), or
- Each independently re-implement `withTenant()` lookups, with no enforcement.

**What the masterplan requires:** The `WidgetRenderer` (or a tenant-aware wrapper above it) must provide `tenantId` to every widget in a consistent, enforced way — not rely on each widget remembering to call `withTenant()` independently.

---

### Gap 6 — `icon` Is a FontAwesome String, Not a Component ⚠️ Medium

**What exists:** `DashboardWidget.icon` is `'fa-star'` — a FontAwesome CSS class string.

**What the masterplan requires:** `icon` is a `LucideIcon` component (or equivalent typed icon component). A string class name cannot be type-checked, cannot be tree-shaken, requires FontAwesome to be globally loaded, and cannot be used in contexts that need a React component (e.g. rendering in a collapsed widget summary row).

This is a lower-urgency change but should be made when any widget is modified, since it requires updating both the registry entry and any template that renders `icon`.

---

### Gap 7 — No `author` Field or External Widget Concept ⚠️ Medium

**What exists:** All widgets are implicitly `author: 'internal'`. There is no concept of a widget that comes from outside the codebase.

**What the masterplan requires:** `author` on the manifest is what distinguishes a first-party widget from a tenant-contributed or third-party marketplace widget. For NetComplex — a SaaS platform with a premium widget tier already (`premium-portfolio`, `agent-dashboard`, `community-graph-widget`) — the distinction between `'internal'`, `'netcomplex-premium'`, and `'third-party'` is commercially significant. It should exist on the manifest now so that premium billing and access control can be tied to it later.

---

### Gap 8 — No Collapsed State Pattern ⚠️ Medium

**What exists:** `WIDGET_HELP.md` mentions "Concertina/Collapse Functionality" as a feature, but the widget interface (`DashboardWidget`) has no `collapsed` field, and the component template shows no collapsed rendering branch.

**What the masterplan requires:** Every widget must handle `collapsed?: boolean`. The collapsed state is stored on `WidgetLayout`, passed through `WidgetRenderer`, and the widget renders a compact summary row when true. Without this, collapsing a widget either hides it entirely or shows it at full height — neither is correct for space management on a dense multi-widget dashboard.

---

### Gap 9 — No `loader` Field / No Remote Loading Path ⚠️ Medium

**What exists:** `COMPONENT_REGISTRY.md`'s architecture section mentions "Extensible — Add new widgets by updating registry only" and "Custom Sections — Tenant-specific components supported" but there is no `loader` field or remote module loading mechanism.

**What the masterplan requires:** A `loader?: () => Promise<{ default: Component }>` field on every manifest entry is the escape hatch for remote loading. Today it mirrors the local `import()`. Tomorrow it points to a CDN-hosted tenant widget bundle. Without it, the "Plugin System: Third-party widget support" listed under Future Enhancements in `WIDGET_HELP.md` cannot be built without a registry rewrite.

---

### Gap 10 — `react-rnd` Not Mentioned in Any Doc ℹ️ Unknown

**What exists:** All three documents describe drag-and-drop as a feature but none specify the implementation library. `WIDGET_HELP.md` mentions "Drag & Drop: Rearrange Widgets" but shows no implementation code for it.

**Action required:** Confirm whether `react-rnd` or another library is used. If `react-rnd` is in use, the full `WidgetContainer` grid-to-pixel conversion pattern, `onResizeStop` position-spread requirement, and `bounds="parent"` container rule from the masterplan all apply directly. If a different library is in use, those sections need library-specific equivalents.

---

### What Already Matches the Masterplan ✅

These patterns are already correct and should not change:

- Registry-based component lookup (`getWidgetComponent(id)`) instead of a switch statement ✅
- `ErrorBoundary` wrapping in `WidgetRenderer` ✅
- Feature flag integration on widget metadata ✅
- Category system on widget registry (`core`, `content`, `communication`, `premium`, `utility`) ✅
- Separate custom sections registry for tenant-specific content ✅
- Premium widget tier concept (`premium: boolean` on `WidgetRegistryEntry`) ✅
- Tenant-scoped data plane with `withTenant()` / `tenantId` header pattern ✅
- Single Next.js app serving both platform and tenant traffic via host-based routing ✅

---

## Part 2 — Updated Specifications

The following sections replace and extend the content in `COMPONENT_REGISTRY.md` and `WIDGET_HELP.md`. `NETCOMPLEX_ARCHITECTURE.md` requires no changes — the tenant data plane design is sound.

---

## Widget Manifest — Single Source of Truth

Replace `WidgetRegistryEntry` (in `registry.ts`) and `DashboardWidget` (in `dashboard/page.tsx`) with a single `WidgetManifest`:

```typescript
// src/components/registry/types.ts

export interface WidgetManifest {
  // Identity
  id: string; // globally unique, kebab-case e.g. 'stats'
  version: string; // semver e.g. '1.0.0' — bump on any config schema change
  name: string; // display name in header and add-widget modal
  description: string; // one sentence for admin UI (under 60 chars)
  author: WidgetAuthor; // origin of the widget

  // Display
  icon: LucideIcon; // Lucide React icon component
  category: WidgetCategory;

  // Component loading — today local, tomorrow remote/CDN
  component: React.LazyExoticComponent<any>;
  loader?: () => Promise<{ default: React.ComponentType<any> }>;

  // Access control
  featureFlag?: string; // tenant feature flag required to render this widget
  premium?: boolean; // true = requires paid plan
  permissions?: TenantRole[]; // restrict to user roles within a tenant

  // Layout constraints — in GRID UNITS (convert to px in WidgetContainer)
  defaultSize: GridSize;
  minSize?: GridSize;
  maxSize?: GridSize;
  dragHandleClassName?: string; // default: 'widget-drag-handle'
  lockAspectRatio?: boolean;

  // Schema for per-instance user config (future)
  configSchema?: Record<string, unknown>;

  // Config migrations — keyed by the version they migrate FROM
  migrations?: Record<string, (oldConfig: unknown) => unknown>;
}

export type WidgetCategory = 'core' | 'content' | 'communication' | 'premium' | 'utility';
export type WidgetAuthor = 'internal' | 'netcomplex-premium' | string; // string allows third-party
export type TenantRole = 'resident' | 'board' | 'admin' | 'agent';
export interface GridSize {
  width: number;
  height: number;
}
```

**Migration from `WidgetRegistryEntry`:**

| Old field     | New field     | Notes                                                                       |
| ------------- | ------------- | --------------------------------------------------------------------------- |
| `id`          | `id`          | No change                                                                   |
| `name`        | `name`        | No change                                                                   |
| `description` | `description` | No change                                                                   |
| `featureFlag` | `featureFlag` | No change                                                                   |
| `premium`     | `premium`     | No change                                                                   |
| `category`    | `category`    | No change                                                                   |
| _(missing)_   | `version`     | Add `'1.0.0'` to all existing entries now                                   |
| _(missing)_   | `author`      | Add `'internal'` to core widgets, `'netcomplex-premium'` to premium widgets |
| _(missing)_   | `icon`        | Replace FontAwesome string with Lucide component                            |
| _(missing)_   | `component`   | Move from switch case to manifest via `React.lazy()`                        |
| _(missing)_   | `loader`      | Mirror the `component` import path                                          |
| _(missing)_   | `defaultSize` | Move from `ALL_WIDGETS` in `dashboard/page.tsx`                             |
| _(missing)_   | `migrations`  | Leave empty `{}` initially; populate as schemas evolve                      |

---

## Registry Class

Replace the plain `WIDGET_REGISTRY` object with a class. Keep the existing helper functions as methods:

```typescript
// src/components/registry/WidgetRegistry.ts

import type { WidgetManifest, WidgetCategory, TenantRole } from './types';

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

  listByCategory(category: WidgetCategory): WidgetManifest[] {
    return this.list().filter(m => m.category === category);
  }

  listPremium(): WidgetManifest[] {
    return this.list().filter(m => m.premium === true);
  }

  // Filter by tenant feature flags and user role — used by the add-widget modal
  listForContext(enabledFeatureFlags: string[], userRole: TenantRole): WidgetManifest[] {
    return this.list().filter(m => {
      if (m.featureFlag && !enabledFeatureFlags.includes(m.featureFlag)) return false;
      if (m.permissions && !m.permissions.includes(userRole)) return false;
      return true;
    });
  }

  // Future: async resolution for remote/marketplace widgets
  async resolveAsync(id: string): Promise<WidgetManifest> {
    const local = this.resolve(id);
    if (local) return local;

    // Phase 2: fetch from NetComplex marketplace API
    // const remote = await fetchFromMarketplace(id)
    // if (remote) return remote

    throw new Error(`[Registry] Widget not found: ${id}`);
  }
}

export const registry = new WidgetRegistry();
```

**Backward-compatible helper exports** — keep these so existing call sites don't break immediately:

```typescript
// src/components/registry/index.ts — re-exports for backward compat

export const getWidgetComponent = (id: string) => registry.resolve(id)?.component;
export const getWidgetMetadata = (id: string) => registry.resolve(id);
export const hasWidget = (id: string) => registry.resolve(id) !== undefined;
export const getAllWidgets = () => registry.list();
export const getWidgetsByCategory = (cat: WidgetCategory) => registry.listByCategory(cat);
export const getPremiumWidgets = () => registry.listPremium();
```

---

## Widget Registration

All widgets are registered in one file. This is the only file that calls `registry.register()`:

```typescript
// src/components/registry/widgets.ts
import { lazy } from 'react';
import {
  BarChart2,
  Zap,
  Activity,
  Bell,
  MessageSquare,
  Calendar,
  FileText,
  BookOpen,
  Image,
  Grid,
  Star,
  Home,
  Users,
  Briefcase,
  Layers,
} from 'lucide-react';
import { registry } from './WidgetRegistry';

// ─── CORE WIDGETS ────────────────────────────────────────────

registry.register({
  id: 'stats',
  version: '1.0.0',
  name: 'Dashboard Stats',
  description: 'Key metrics and statistics at a glance',
  author: 'internal',
  category: 'core',
  icon: BarChart2,
  component: lazy(() =>
    import('../dashboard/DashboardStats').then(m => ({ default: m.DashboardStats }))
  ),
  loader: () => import('../dashboard/DashboardStats'),
  defaultSize: { width: 4, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'quick-actions',
  version: '1.0.0',
  name: 'Quick Actions',
  description: 'Common actions for fast navigation',
  author: 'internal',
  category: 'core',
  icon: Zap,
  component: lazy(() =>
    import('../dashboard/QuickActionsWidget').then(m => ({ default: m.QuickActionsWidget }))
  ),
  loader: () => import('../dashboard/QuickActionsWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'recent-activity',
  version: '1.0.0',
  name: 'Recent Activity',
  description: 'Your recent platform activity and history',
  author: 'internal',
  category: 'core',
  icon: Activity,
  component: lazy(() =>
    import('../dashboard/RecentActivityWidget').then(m => ({ default: m.RecentActivityWidget }))
  ),
  loader: () => import('../dashboard/RecentActivityWidget'),
  defaultSize: { width: 3, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});

// ─── COMMUNICATION WIDGETS ───────────────────────────────────

registry.register({
  id: 'notifications',
  version: '1.0.0',
  name: 'Notifications',
  description: 'Your notification centre',
  author: 'internal',
  category: 'communication',
  icon: Bell,
  component: lazy(() =>
    import('../dashboard/NotificationsWidget').then(m => ({ default: m.NotificationsWidget }))
  ),
  loader: () => import('../dashboard/NotificationsWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'messages',
  version: '1.0.0',
  name: 'Messages',
  description: 'Message previews and quick access',
  author: 'internal',
  category: 'communication',
  icon: MessageSquare,
  component: lazy(() =>
    import('../dashboard/MessagesWidget').then(m => ({ default: m.MessagesWidget }))
  ),
  loader: () => import('../dashboard/MessagesWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// ─── CONTENT WIDGETS ─────────────────────────────────────────

registry.register({
  id: 'events',
  version: '1.0.0',
  name: 'Events',
  description: 'Community events and calendar',
  author: 'internal',
  category: 'content',
  icon: Calendar,
  component: lazy(() =>
    import('../dashboard/EventsWidget').then(m => ({ default: m.EventsWidget }))
  ),
  loader: () => import('../dashboard/EventsWidget'),
  defaultSize: { width: 3, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'my-content',
  version: '1.0.0',
  name: 'My Content',
  description: 'Your published content and drafts',
  author: 'internal',
  category: 'content',
  icon: FileText,
  component: lazy(() =>
    import('../dashboard/UserContentWidget').then(m => ({ default: m.UserContentWidget }))
  ),
  loader: () => import('../dashboard/UserContentWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'bookshelf',
  version: '1.0.0',
  name: 'Bookshelf',
  description: 'Reading list and saved resources',
  author: 'internal',
  category: 'content',
  icon: BookOpen,
  component: lazy(() =>
    import('../dashboard/BookshelfWidget').then(m => ({ default: m.BookshelfWidget }))
  ),
  loader: () => import('../dashboard/BookshelfWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// ─── PREMIUM WIDGETS ─────────────────────────────────────────

registry.register({
  id: 'premium-portfolio',
  version: '1.0.0',
  name: 'Premium Portfolio',
  description: 'Advanced portfolio management tools',
  author: 'netcomplex-premium',
  category: 'premium',
  icon: Star,
  premium: true,
  featureFlag: 'premium-portfolio',
  component: lazy(() =>
    import('../dashboard/PremiumPortfolioWidget').then(m => ({ default: m.PremiumPortfolioWidget }))
  ),
  loader: () => import('../dashboard/PremiumPortfolioWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'agent-dashboard',
  version: '1.0.0',
  name: 'Agent Dashboard',
  description: 'Agent-specific metrics and tools',
  author: 'netcomplex-premium',
  category: 'premium',
  icon: Briefcase,
  premium: true,
  featureFlag: 'agent-dashboard',
  permissions: ['agent', 'admin'],
  component: lazy(() =>
    import('../dashboard/AgentDashboardWidget').then(m => ({ default: m.AgentDashboardWidget }))
  ),
  loader: () => import('../dashboard/AgentDashboardWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'community-graph-widget',
  version: '1.0.0',
  name: 'Community Graph',
  description: 'Visual community connection graph',
  author: 'netcomplex-premium',
  category: 'premium',
  icon: Layers,
  premium: true,
  featureFlag: 'community-graph',
  component: lazy(() =>
    import('../dashboard/CommunityGraphWidget').then(m => ({ default: m.CommunityGraphWidget }))
  ),
  loader: () => import('../dashboard/CommunityGraphWidget'),
  defaultSize: { width: 4, height: 4 },
  minSize: { width: 3, height: 3 },
  dragHandleClassName: 'widget-drag-handle',
});

// ... remaining widgets follow the same pattern
```

---

## WidgetRenderer — Updated

Remove the switch statement. Remove dual-source feature flag lookup. The renderer resolves everything from the manifest:

```tsx
// src/components/dashboard/WidgetRenderer.tsx
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { registry } from '@/components/registry/WidgetRegistry';
import { resolveConfig } from '@/lib/resolveConfig';
import type { WidgetLayout } from '@/types/dashboard';
import type { TenantRole } from '@/components/registry/types';

interface WidgetRendererProps {
  layout: WidgetLayout;
  tenantId: string; // always required — no widget renders without tenant context
  enabledFeatureFlags: string[]; // from tenant config, passed down from page
  userRole: TenantRole;
}

export function WidgetRenderer({
  layout,
  tenantId,
  enabledFeatureFlags,
  userRole,
}: WidgetRendererProps) {
  const manifest = registry.resolve(layout.widgetId);

  // Unknown widget — graceful fallback
  if (!manifest) {
    return <WidgetNotFound id={layout.widgetId} />;
  }

  // Feature flag check — from manifest only (no fallback map)
  if (manifest.featureFlag && !enabledFeatureFlags.includes(manifest.featureFlag)) {
    return null; // or <WidgetFeatureLocked /> for upsell UI
  }

  // Role check
  if (manifest.permissions && !manifest.permissions.includes(userRole)) {
    return null;
  }

  // Migrate stored config to current widget version
  const resolvedConfig = resolveConfig(
    layout.config ?? {},
    layout.configVersion ?? '1.0.0',
    manifest
  );

  const Widget = manifest.component;

  return (
    <ErrorBoundary fallback={<WidgetError id={layout.widgetId} />}>
      <Suspense fallback={<WidgetSkeleton />}>
        {/* tenantId is injected via context — widgets read it from useTenantContext() */}
        <TenantContext.Provider value={{ tenantId }}>
          <Widget collapsed={layout.collapsed ?? false} config={resolvedConfig} />
        </TenantContext.Provider>
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Tenant Context for Widgets

This is the most NetComplex-specific pattern in this document. Every widget renders inside a `TenantContext` provided by `WidgetRenderer`. Widgets read `tenantId` from this context — they never call `withTenant()` independently:

```typescript
// src/lib/tenant-context.ts

import { createContext, useContext } from 'react';

interface TenantContextValue {
  tenantId: string;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenantContext must be used inside WidgetRenderer');
  return ctx;
}
```

**Widget data fetching pattern — tenant-scoped:**

```typescript
// Inside any widget component
import { useTenantContext } from '@/lib/tenant-context';

export function EventsWidget({ collapsed }: WidgetProps) {
  const { tenantId } = useTenantContext(); // always from context, never from withTenant()

  const { data } = useSuspenseQuery({
    queryKey: ['events', tenantId], // tenantId in cache key — prevents cross-tenant cache bleed
    queryFn: () => api.events.list.query({ tenantId }),
  });

  // ...
}
```

> **Why context, not `withTenant()`?** `withTenant()` reads server-side headers and is not available in client components. Providing `tenantId` via React context from `WidgetRenderer` ensures every widget — regardless of its rendering environment — always has tenant context without needing to re-derive it.

> **Why `tenantId` in the query key?** Without it, two different tenants sharing a browser session (e.g. a board member who is also a resident of another community) would see cached data from the wrong tenant. `tenantId` in the key scopes the cache correctly.

---

## Layout Data Shape

```typescript
// src/types/dashboard.ts

export interface WidgetLayout {
  id: string; // instance ID e.g. 'stats-a3f9'
  widgetId: string; // registry ID e.g. 'stats'
  x: number; // grid units
  y: number; // grid units
  width: number; // grid units
  height: number; // grid units
  collapsed?: boolean;
  config?: Record<string, unknown>; // per-instance user config
  configVersion?: string; // widget version that wrote this config
}

// Stored per tenant-user combination
export interface TenantUserLayout {
  tenantId: string;
  userId: string;
  widgets: WidgetLayout[];
}
```

> Layout must be stored **per tenant per user** — not globally. Two residents of the same tenant community may have different dashboard arrangements. Two users in different tenants must never share layout state.

---

## Widget Component Pattern

```typescript
// src/components/dashboard/MyWidget.tsx
'use client'

import { useTenantContext } from '@/lib/tenant-context'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MyWidgetProps {
  collapsed?: boolean
  config?: Record<string, unknown>
}

export function MyWidget({ collapsed }: MyWidgetProps) {
  const { tenantId } = useTenantContext()

  const { data } = useSuspenseQuery({
    queryKey: ['my-widget', tenantId],
    queryFn: () => api.myRouter.getData.query({ tenantId }),
  })

  // Collapsed: compact summary row
  if (collapsed) {
    return (
      <div className="flex items-center gap-2 p-2">
        <MyIcon className="h-4 w-4" />
        <span className="text-sm font-medium">My Widget</span>
        <span className="ml-auto text-sm text-muted-foreground">{data.count}</span>
      </div>
    )
  }

  // Expanded: full content with overflow containment
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle>My Widget</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* scrollable content */}
        </div>
        <div className="flex-shrink-0 pt-3">
          {/* fixed footer */}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Adding a New Widget — Steps

With the new architecture, adding a widget is **two files**:

### 1. Register in `src/components/registry/widgets.ts`

```typescript
import { MyIcon } from 'lucide-react';

registry.register({
  id: 'my-widget',
  version: '1.0.0',
  name: 'My Widget',
  description: 'One sentence description under 60 chars',
  author: 'internal',
  category: 'utility',
  icon: MyIcon,
  component: lazy(() => import('../dashboard/MyWidget').then(m => ({ default: m.MyWidget }))),
  loader: () => import('../dashboard/MyWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
  // featureFlag: 'my-feature'   — add if tenant-gated
  // premium: true               — add if paid tier
  // permissions: ['admin']      — add if role-restricted
});
```

### 2. Create `src/components/dashboard/MyWidget.tsx`

Follow the Widget Component Pattern above. Use `useTenantContext()` for `tenantId`. Use `useSuspenseQuery` — the `Suspense` boundary is in `WidgetRenderer`.

**You do not need to edit:**

- `WidgetRenderer.tsx` — resolves component from manifest automatically
- `dashboard/page.tsx` — add-widget modal driven by `registry.listForContext()`
- `src/lib/dashboard-config.ts` — feature flags are now on the manifest
- `src/components/dashboard/index.ts` — no manual exports needed

---

## Folder Structure

```
src/
├── components/
│   ├── registry/
│   │   ├── types.ts            # WidgetManifest, WidgetCategory, TenantRole, GridSize
│   │   ├── WidgetRegistry.ts   # Registry class and singleton export
│   │   ├── widgets.ts          # All register() calls — only file that calls register()
│   │   └── index.ts            # Backward-compat helper exports
│   │
│   ├── custom/
│   │   └── sections/
│   │       └── registry.ts     # Custom sections registry (unchanged)
│   │
│   └── dashboard/
│       ├── WidgetRenderer.tsx  # ErrorBoundary + Suspense + TenantContext + dispatch
│       ├── WidgetContainer.tsx # <Rnd> wrapper — only file that uses react-rnd
│       ├── DashboardGrid.tsx   # Mobile/desktop switching
│       ├── MobileWidgetCard.tsx
│       ├── WidgetToolbar.tsx
│       ├── WidgetSkeleton.tsx
│       ├── WidgetError.tsx
│       ├── WidgetNotFound.tsx
│       └── [WidgetName].tsx    # Individual widget components
│
├── lib/
│   ├── tenant-context.ts       # TenantContext + useTenantContext hook
│   ├── resolveConfig.ts        # Config migration utility
│   └── dashboard-config.ts     # DEPRECATED — remove after all featureFlags on manifest
│
└── types/
    └── dashboard.ts            # WidgetLayout, TenantUserLayout
```

---

## Migration Roadmap

### Immediate (before any new widget is added)

1. Add `version: '1.0.0'` to all 18 existing entries in `registry.ts` — this is a one-line change per widget that cannot be retroactively added later without data loss risk.
2. Add `author: 'internal'` to core/content/communication/utility widgets; `author: 'netcomplex-premium'` to premium widgets.
3. Merge `WidgetRegistryEntry` and `DashboardWidget` into `WidgetManifest` in `src/components/registry/types.ts`.

### Short term (next sprint)

4. Replace switch statement in `WidgetRenderer` with manifest lookup.
5. Add `component: lazy(...)` to each manifest entry — move dispatch out of `WidgetRenderer` switch.
6. Add `TenantContext.Provider` to `WidgetRenderer` and refactor widget data fetching to use `useTenantContext()`.
7. Add `loader` field to each manifest entry (mirrors the `component` import path today).
8. Eliminate `WIDGET_FEATURE_MAP` in `dashboard-config.ts` once all entries carry `featureFlag`.

### Medium term

9. Add `defaultSize` and `minSize` to each manifest entry (pull from `ALL_WIDGETS` in `dashboard/page.tsx`).
10. Replace FontAwesome string icons with Lucide components.
11. Add `collapsed` handling to all widget components.
12. Store `configVersion` alongside `config` in `WidgetLayout` in the database.

### When the marketplace is ready

13. Implement `resolveAsync` to fetch from the NetComplex marketplace API.
14. Add `loader` to point at CDN-hosted widget bundles for third-party widgets.
15. Extend `listForContext` to include installed marketplace widgets alongside local ones.

---

## Checklist — Code Review

Use for any PR touching the widget system:

**Registry**

- [ ] Widget registered in `registry/widgets.ts` only — no other file calls `register()`
- [ ] ⏳ `id` is kebab-case and matches no existing widget ID
- [ ] ⏳ `version` is semver (starts at `'1.0.0'`)
- [ ] ⏳ `author` is set (`'internal'` or `'netcomplex-premium'`)
- [ ] ⏳ `icon` is a Lucide component, not a string class name
- [ ] ⏳ `component` uses `React.lazy()` with named export `.then()` pattern
- [ ] ⏳ `loader` mirrors the same import path
- [ ] ⏳ `featureFlag` set if widget is tenant-gated
- [ ] ⏳ `premium: true` set if widget requires paid plan

**Widget component**

- [ ] ⏳ `'use client'` at top of file
- [ ] ⏳ Named export (not default export)
- [ ] `tenantId` sourced from `useTenantContext()` — never from `withTenant()` or props
- [ ] ⏳ `tenantId` included in `queryKey` array
- [ ] ⏳ `useSuspenseQuery` used (not `useQuery`)
- [ ] ⏳ `collapsed?: boolean` prop handled
- [ ] Overflow pattern: `h-full overflow-hidden` → `flex flex-col` → `flex-1 min-h-0 overflow-y-auto`
- [ ] No `ErrorBoundary` or `Suspense` inside the component — these are in `WidgetRenderer`

**Layout data**

- [ ] Layout stored per `tenantId` + `userId` — never global
- [ ] ⏳ `configVersion` stored alongside `config`
- [ ] Grid units only in position/size fields — no raw pixel values

**Migrations**

- [ ] ⏳ Any config schema change bumps `version`
- [ ] ⏳ Breaking config change has a `migrations` entry for the previous version

---

_Prepared: April 2026_  
_Based on: COMPONENT_REGISTRY.md, NETCOMPLEX_ARCHITECTURE.md, WIDGET_HELP.md, widget-registry-architecture-react-rnd-v2.md_
