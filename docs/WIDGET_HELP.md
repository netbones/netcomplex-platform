# Dashboard Widget Development Guide

## Overview

The Soralia Village dashboard uses a modular widget system that allows users to customize their dashboard experience. This guide explains how to create, maintain, and extend dashboard widgets.

## Widget Architecture

### Core Components

```
src/components/dashboard/
├── WidgetRenderer.tsx      # Central dispatch system
├── DashboardStats.tsx      # Statistics widget
├── UserContentWidget.tsx   # User content management
├── StatsWidget.tsx         # Legacy stats widget
├── QuickActionsWidget.tsx  # Action buttons
├── RecentActivityWidget.tsx # Activity feed
├── EventsWidget.tsx        # Community events
├── NotificationsWidget.tsx # Notification center
├── MessagesWidget.tsx      # Message previews
└── index.ts               # Component exports
```

### Widget Registration System

#### 1. Define Widget in ALL_WIDGETS Array

```typescript
// src/app/dashboard/page.tsx
const ALL_WIDGETS: DashboardWidget[] = [
  {
    id: 'my-widget', // Unique identifier
    type: 'utility', // Category for organization
    title: 'My Widget', // Display title
    icon: 'fa-star', // FontAwesome icon class
    label: 'My Widget', // Label for add widget modal
  },
  // ... other widgets
];
```

#### 2. Create Widget Component

```typescript
// src/components/dashboard/MyWidget.tsx
'use client';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function MyWidget() {
  return (
    <ErrorBoundary>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">My Widget</h3>
        {/* Widget content */}
      </div>
    </ErrorBoundary>
  );
}
```

#### 3. Register in WidgetRenderer

```typescript
// src/components/dashboard/WidgetRenderer.tsx
import { MyWidget } from './MyWidget';

export function WidgetRenderer({ widgetId }: WidgetRendererProps): ReactNode {
  switch (widgetId) {
    case 'my-widget':
      return <MyWidget />;
    // ... other cases
  }
}
```

#### 4. Export from Index

```typescript
// src/components/dashboard/index.ts
export { MyWidget } from './MyWidget';
```

## Widget Interface

```typescript
interface DashboardWidget {
  id: string; // Unique identifier
  type: string; // Category (stats, actions, content, etc.)
  title: string; // Display title in widget header
  icon: string; // FontAwesome icon class
  label: string; // Label for add widget modal
}
```

## Best Practices

### 1. Error Boundaries

Always wrap widget content in `ErrorBoundary`:

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function MyWidget() {
  return (
    <ErrorBoundary>
      {/* Widget content */}
    </ErrorBoundary>
  );
}
```

### 2. Loading States

Handle loading states gracefully:

```typescript
const [loading, setLoading] = useState(true);

if (loading) {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}
```

### 3. Data Fetching

Use the established patterns for data fetching:

```typescript
import { getDashboardStats } from '@/lib/data-fetching';

// For cached data
const stats = await getDashboardStats();

// For real-time data
useEffect(() => {
  fetchData();
}, []);
```

### 4. Styling

Follow the established design patterns:

```typescript
// Card styling
<div className="bg-white rounded-lg shadow p-6">

// Button styling
<button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

## Widget Categories

### Core Widgets (Always Available)

- **Stats**: Dashboard statistics and metrics
- **Quick Actions**: Common user actions
- **Recent Activity**: User's recent activity feed
- **Notifications**: Notification center

### Content Widgets

- **My Content**: User's published content
- **Bookshelf**: Reading list management
- **Media Library**: File management

### Communication Widgets

- **Messages**: Message previews and quick access
- **Events**: Community event calendar

## Testing Widgets

### Unit Tests

```typescript
// __tests__/MyWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { MyWidget } from '@/components/dashboard/MyWidget';

describe('MyWidget', () => {
  it('renders correctly', () => {
    render(<MyWidget />);
    expect(screen.getByText('My Widget')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// Test widget in dashboard context
describe('Dashboard with MyWidget', () => {
  it('displays widget in dashboard', () => {
    // Render dashboard with widget
    // Test drag & drop functionality
    // Test widget interactions
  });
});
```

## Performance Considerations

### 1. Lazy Loading

For heavy widgets, consider lazy loading:

```typescript
import dynamic from 'next/dynamic';

const HeavyWidget = dynamic(() => import('./HeavyWidget'), {
  loading: () => <div>Loading...</div>
});
```

### 2. Memoization

Use React.memo for expensive widgets:

```typescript
export const MyWidget = React.memo(function MyWidget({ data }) {
  return (
    <div>
      {/* Expensive rendering */}
    </div>
  );
});
```

### 3. Data Caching

Leverage the existing caching system:

```typescript
import { unstable_cache } from 'next/cache';

const getWidgetData = unstable_cache(
  async (userId: string) => {
    // Fetch data
  },
  ['widget-data'],
  { revalidate: 300 }
);
```

## Troubleshooting

### Common Issues

#### Widget Not Appearing

1. Check if widget is registered in `ALL_WIDGETS`
2. Verify widget is exported from `index.ts`
3. Ensure `WidgetRenderer` has the correct case

#### Widget Crashing

1. Check browser console for errors
2. Verify all dependencies are imported
3. Test component in isolation

#### Styling Issues

1. Check Tailwind classes are correct
2. Verify responsive breakpoints
3. Test in different screen sizes

### Debug Mode

Enable debug logging for widget development:

```typescript
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Widget data:', data);
}
```

## Migration Guide

### From Legacy System

If migrating from the old monolithic dashboard:

1. **Extract widget logic** from the large switch statement
2. **Create individual components** for each widget type
3. **Add error boundaries** to each component
4. **Register widgets** in the new system
5. **Test thoroughly** in the dashboard context

### Breaking Changes

- Widget components now receive no props (they fetch their own data)
- All widgets must be wrapped in ErrorBoundary
- Widget IDs must be unique across the system

## Future Enhancements

### Planned Features

- **Widget Permissions**: Role-based widget visibility
- **Widget Settings**: User-customizable widget configurations
- **Widget Analytics**: Usage tracking and optimization
- **Dynamic Widgets**: Server-side widget rendering

### Extension Points

- **Plugin System**: Third-party widget support
- **Widget Marketplace**: Community-contributed widgets
- **Widget Templates**: Pre-built widget configurations

---

**Last Updated:** April 1, 2026
**Version:** 1.0
**Maintained by:** Development Team
