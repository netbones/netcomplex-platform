# Component Registry System

## Overview

The component registry provides a centralized system for managing dashboard widgets and custom tenant sections. It replaces hardcoded switch statements with dynamic registry lookups, making the system more maintainable and extensible.

---

## Widget Registry

### Location

`src/components/registry.ts`

### Structure

```typescript
export interface WidgetRegistryEntry {
  id: string; // Unique widget identifier
  name: string; // Display name for admin UI
  description?: string; // Description for admin UI
  featureFlag?: string; // Feature flag required to render
  premium?: boolean; // Whether this is a premium/paid widget
  category?: 'core' | 'content' | 'communication' | 'premium' | 'utility';
}
```

### Registered Widgets

| Widget ID              | Name              | Category      |
| ---------------------- | ----------------- | ------------- |
| stats                  | Dashboard Stats   | core          |
| quick-actions          | Quick Actions     | core          |
| recent-activity        | Recent Activity   | core          |
| notifications          | Notifications     | communication |
| messages               | Messages          | communication |
| events                 | Events            | content       |
| my-content             | My Content        | content       |
| bookshelf              | Bookshelf         | content       |
| media                  | Media             | content       |
| my-album               | My Album          | content       |
| sidebar-widgets        | Sidebar Widgets   | utility       |
| premium-portfolio      | Premium Portfolio | premium       |
| households             | Households        | core          |
| agent-dashboard        | Agent Dashboard   | premium       |
| solo-seat              | Solo Seat         | core          |
| my-services            | My Services       | content       |
| service-inquiries      | Service Inquiries | content       |
| community-graph-widget | Community Graph   | premium       |

### Usage

```typescript
import {
  getWidgetComponent,
  getWidgetMetadata,
  hasWidget,
  getAllWidgets,
  getWidgetsByCategory,
  getPremiumWidgets,
} from '@/components/registry';

// Get component for rendering
const Component = getWidgetComponent('stats');

// Check if widget exists
if (hasWidget('stats')) {
  // ...
}

// Get all widgets for admin UI
const allWidgets = getAllWidgets();

// Get widgets by category
const contentWidgets = getWidgetsByCategory('content');

// Get premium widgets
const premium = getPremiumWidgets();
```

---

## WidgetRenderer

### Location

`src/components/dashboard/WidgetRenderer.tsx`

The `WidgetRenderer` component dynamically renders widgets based on their ID. It checks:

1. **Feature access** — Whether the tenant has access to the widget's feature flag
2. **Registry lookup** — Fetches component from registry
3. **Error boundary** — Wraps widget in error boundary for graceful failures

### Usage

```typescript
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';

// Render a widget by ID
<WidgetRenderer widgetId="stats" />
```

### Feature Flag Integration

WidgetRenderer checks feature flags from two sources (in priority order):

1. **Registry metadata** — `metadata.featureFlag` in `WIDGET_REGISTRY`
2. **Dashboard config** — Fallback to `WIDGET_FEATURE_MAP` in `src/lib/dashboard-config.ts`

---

## Custom Sections Registry

### Location

`src/components/custom/sections/registry.ts`

Allows tenants to define custom content sections that can be rendered dynamically.

### Structure

```typescript
export interface CustomSectionMeta {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'content' | 'call-to-action' | 'footer' | 'custom';
  defaultProps?: Record<string, unknown>;
}
```

### Adding Custom Sections

```typescript
// In src/components/custom/sections/registry.ts
import { MyCustomSection } from './sections/MyCustomSection';

export const CUSTOM_SECTIONS: Record<string, CustomSectionEntry> = {
  'my-custom-section': {
    component: MyCustomSection,
    metadata: {
      id: 'my-custom-section',
      name: 'My Custom Section',
      description: 'Custom section for tenant-specific content',
      category: 'custom',
    },
  },
};
```

### Usage

```typescript
import {
  getCustomSection,
  getCustomSectionMeta,
  hasCustomSection,
  getAllCustomSections,
  getCustomSectionsByCategory,
} from '@/components/custom/sections/registry';

// Get section component
const Section = getCustomSection('my-custom-section');

// Check if exists
if (hasCustomSection('my-custom-section')) {
  // ...
}

// Get sections by category
const heroSections = getCustomSectionsByCategory('hero');
```

---

## Architecture

```
src/components/
├── registry.ts                    # Widget registry (18 widgets)
├── custom/
│   └── sections/
│       └── registry.ts            # Custom sections registry
└── dashboard/
    └── WidgetRenderer.tsx        # Dynamic widget renderer

src/lib/
├── dashboard-config.ts           # Legacy widget feature map (fallback)
└── features/
    └── registry.ts               # Feature flag system
```

---

## Benefits

1. **Centralized** — All widget mappings in one place
2. **Extensible** — Add new widgets by updating registry only
3. **Admin-friendly** — Metadata enables admin UI for widget management
4. **Feature flags** — Built-in integration with tenant feature system
5. **Custom sections** — Tenant-specific components supported
6. **Error handling** — Built-in error boundaries for graceful failures

---

## Migration from Switch Statement

**Before** (hardcoded):

```typescript
switch (widgetId) {
  case 'stats': return <DashboardStats />;
  case 'quick-actions': return <QuickActionsWidget />;
  // ... 15+ more cases
  default: return <ErrorBoundary>...</ErrorBoundary>;
}
```

**After** (registry-based):

```typescript
const WidgetComponent = getWidgetComponent(widgetId);
if (!WidgetComponent) return <UnknownWidget />;
return <ErrorBoundary><WidgetComponent /></ErrorBoundary>;
```

---

_Last Updated: 2026-04-07_
