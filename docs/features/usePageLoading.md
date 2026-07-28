---
title: usePageLoading Hook
status: current
reviewed: 2026-07-28
tags: [feature, spec]
audience: developer
---

# usePageLoading Hook

A utility hook for handling i18n loading states and providing consistent page loading skeletons.

## Usage

```tsx
import { usePageLoading } from '@/hooks/usePageLoading';

function MyPage() {
  const { t } = useTranslation('common');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'My Page', href: '/my-page' },
    ],
    { additionalLoading: loading }
  );

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.myPage'), href: '/my-page' },
        ]}
      />
      {/* Your page content */}
    </div>
  );
}
```

## API

### usePageLoading(breadcrumbs, options)

Returns an object with `isReady` boolean and `LoadingComponent` React element.

#### Parameters

- `breadcrumbs`: Array of breadcrumb items with `label` and `href`
- `options.additionalLoading`: Optional boolean for additional loading state (e.g., API loading)
- `options.title`: Optional loading title (default: 'Loading...')
- `options.contentHeight`: Optional CSS class for loading skeleton height (default: 'h-64')
- `options.className`: Optional CSS class for container (default: 'max-w-6xl mx-auto px-4 py-8')

## Before vs After

### Before (Repetitive)

```tsx
const { t, ready } = useTranslation('common');
const [mounted, setMounted] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted || !ready || loading) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Page' }]} />
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
        <div className="h-64 bg-gray-200 rounded mb-6" />
      </div>
    </div>
  );
}
```

### After (Clean)

```tsx
const { t } = useTranslation('common');
const [loading, setLoading] = useState(true);

const { isReady, LoadingComponent } = usePageLoading(
  [
    { label: 'Home', href: '/' },
    { label: 'Page', href: '/page' },
  ],
  { additionalLoading: loading }
);

if (!isReady) {
  return LoadingComponent;
}
```

## Migration Guide

1. Remove the old pattern:
   - `const { ready } = useTranslation()`
   - `const [mounted, setMounted] = useState(false)`
   - `useEffect(() => setMounted(true), [])`
   - Manual loading check JSX

2. Add the hook:
   - Import `usePageLoading`
   - Call hook with breadcrumbs and options
   - Replace loading check with `!isReady ? LoadingComponent : null`

3. Update breadcrumbs:
   - Use `t()` for real breadcrumbs after loading check
   - Use hardcoded strings for loading breadcrumbs

## Benefits

- ✅ **DRY**: Eliminates repetitive loading patterns
- ✅ **Consistent**: Standardized loading skeletons
- ✅ **Safe**: Prevents hydration mismatches
- ✅ **Flexible**: Configurable breadcrumbs and styling
- ✅ **Type-safe**: Full TypeScript support
