---
title: useApiToast Hook
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# useApiToast Hook

Unified API error handling with toast notifications, auto-retry, and error logging.

## Installation

The hook is located at `src/hooks/useApiToast.ts` and is ready to use.

## API

```typescript
const { mutate, fetch, background, cancel } = useApiToast({ component: 'MyComponent' });
```

### Options

| Option      | Type     | Default              | Description                |
| ----------- | -------- | -------------------- | -------------------------- |
| `component` | string   | `'UnknownComponent'` | Component name for logging |
| `onError`   | function | -                    | Global error callback      |

### Methods

#### `mutate(promise, options)`

For POST/PATCH/DELETE operations - shows loading, success, and error toasts.

```typescript
const { mutate } = useApiToast({ component: 'UserForm' });

await mutate(createUser(data), {
  loading: 'Creating user...',
  success: 'User created!',
  error: 'Failed to create user',
  onSuccess: () => router.push('/users'),
  retry: true, // Default: true - show retry button
  retryCount: 3, // Default: 3 - max retries
  silent: false, // Default: false - show toasts
  critical: false, // Log extra context
  duration: 5000, // Custom toast duration
});
```

#### `fetch(promise, options)`

For GET operations - shows error toast only, no loading/success.

```typescript
const { fetch } = useApiToast({ component: 'UserProfile' });

await fetch(getUser(id), {
  error: 'Failed to load profile',
  onSuccess: setUser,
  retry: true,
  retryCount: 3,
  silent: false,
});
```

#### `background(promise, options)`

For background operations - no toasts, logs errors only.

```typescript
const { background } = useApiToast({ component: 'SyncWorker' });

await background(syncData(), {
  silent: true, // No toast
  critical: true, // Extra logging for audit
});
```

#### `cancel()`

Dismiss current toast.

```typescript
const { cancel } = useApiToast();
// ...
cancel();
```

## Options Interface

```typescript
interface ExecuteOptions<T> {
  // Toast messages
  loading?: string; // Loading message (mutate only)
  success?: string; // Success message (mutate only)
  error?: string; // Error message (all)

  // Callbacks
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;

  // Behavior
  retry?: boolean; // Show retry button (default: true)
  retryCount?: number; // Max retries (default: 3)
  silent?: boolean; // No toasts, log only (default: false)
  critical?: boolean; // Log extra context (default: false)

  // Toast options
  duration?: number;
}
```

## Error Logging

All errors are logged:

- **Dev mode**: Console.error with component name
- **All modes**: Via `logError()` to server (Pino logger)

Logging payload includes:

- `component` - Component name
- `operation` - mutate/fetch/background
- `attempt` - Retry attempt number
- `error` - Error message

## Standalone Utility

For one-off usage without hook:

```typescript
import { toastPromise } from '@/hooks/useApiToast';

await toastPromise(fetch('/api/data'), {
  loading: 'Loading...',
  success: 'Loaded!',
  error: 'Failed to load',
  component: 'MyComponent',
  operation: 'fetch-data',
});
```

## Migration from console.error

**Before:**

```typescript
try {
  const res = await fetch('/api/data');
  setData(res.json());
} catch (error) {
  console.error('Failed to fetch data:', error);
  toast.error('Failed to fetch data');
}
```

**After:**

```typescript
const { fetch } = useApiToast({ component: 'MyComponent' });

await fetch(fetch('/api/data'), {
  error: 'Failed to fetch data',
  onSuccess: setData,
});
```

Or with full flow for mutations:

```typescript
const { mutate } = useApiToast({ component: 'CreateForm' });

await mutate(createUser(data), {
  loading: 'Creating user...',
  success: 'User created!',
  error: 'Failed to create user',
  onSuccess: () => router.push('/users'),
});
```

---

_Last Updated: 2026-04-07_
