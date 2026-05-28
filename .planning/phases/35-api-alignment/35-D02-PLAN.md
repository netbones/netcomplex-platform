---
phase: 35-api-alignment
plan: D02
type: execute
wave: 3
depends_on: ['35-A01']
files_modified:
  - src/shared/api/rate-limit.ts
  - src/shared/api/feature-gate.ts
  - src/app/api/auth/signup/route.ts
  - src/app/api/auth/[...all]/route.ts
  - src/app/api/invitations/route.ts
  - src/app/api/messages/route.ts
  - src/app/api/notifications/route.ts
  - src/app/api/upload/route.ts
  - src/app/api/bookings/route.ts
  - src/entities/tenant/api/features/registry.ts
autonomous: true
requirements:
  - API-GOV-02
  - API-GOV-03

must_haves:
  truths:
    - 'High-traffic endpoints (auth, invitations, messages) have rate limiting protection'
    - 'Feature-gated endpoints return FEATURE_DISABLED when the module is not enabled'
    - 'Rate limit exceeded returns RATE_LIMITED error with canonical envelope'
  artifacts:
    - path: 'src/shared/api/rate-limit.ts'
      provides: 'In-memory rate limiting helper'
    - path: 'src/shared/api/feature-gate.ts'
      provides: 'Feature gate guard for API routes'
  key_links:
    - from: 'src/shared/api/rate-limit.ts'
      to: 'src/app/api/auth/*'
      via: 'Auth routes are rate-limited'
    - from: 'src/shared/api/feature-gate.ts'
      to: 'src/entities/tenant/api/features/registry.ts'
      via: 'Feature gates check against the module registry'
---

<objective>
Implement rate limiting and feature gate enforcement for API routes.

Purpose: API.md §22 requires rate limiting on external APIs (auth, onboarding, invitations, uploads, messaging, notifications). API.md §18 requires feature-gated APIs to return FEATURE_DISABLED errors.

Currently there is no rate limiting and no feature gate enforcement at the API layer.

Output: Rate limiting helper for high-traffic endpoints, feature gate guard for module-gated routes.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@src/entities/tenant/api/features/registry.ts
@src/entities/tenant/api/features/index.ts
@src/app/api/auth/signup/route.ts
@src/app/api/auth/[...all]/route.ts
@src/app/api/invitations/route.ts
@src/app/api/messages/route.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Create rate limiting helper and apply to high-traffic routes</name>
<files>src/shared/api/rate-limit.ts, src/app/api/auth/signup/route.ts, src/app/api/auth/[...all]/route.ts, src/app/api/invitations/route.ts, src/app/api/messages/route.ts, src/app/api/notifications/route.ts, src/app/api/upload/route.ts</files>
<action>
**Create `src/shared/api/rate-limit.ts`:**

Use an in-memory Map-based rate limiter (suitable for single-instance, will need Redis for multi-instance in production):

```typescript
import { apiError, ERROR_CODES } from './api-response';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 10 }, // 10 req/min for auth
  signup: { windowMs: 3600_000, maxRequests: 3 }, // 3 req/hour for signup
  invitations: { windowMs: 60_000, maxRequests: 5 }, // 5 req/min for invitations
  messages: { windowMs: 60_000, maxRequests: 30 }, // 30 req/min for messages
  notifications: { windowMs: 60_000, maxRequests: 60 }, // 60 req/min for notifications
  upload: { windowMs: 60_000, maxRequests: 10 }, // 10 req/min for uploads
};

/**
 * Rate limit a request by a key (typically IP or user ID).
 * Returns a NextResponse with RATE_LIMITED error if exceeded, null otherwise.
 */
export function rateLimitByKey(
  key: string,
  config: RateLimitConfig
): ReturnType<typeof apiError> | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return apiError(ERROR_CODES.RATE_LIMITED, 'Too many requests. Please try again later.', 429);
  }

  return null;
}

/**
 * Rate limit by IP address from the request headers.
 */
export function rateLimitByIP(
  request: Request,
  config: RateLimitConfig
): ReturnType<typeof apiError> | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return rateLimitByKey(`ip:${ip}`, config);
}

/**
 * Rate limit by authenticated user ID.
 */
export function rateLimitByUser(
  userId: string,
  config: RateLimitConfig
): ReturnType<typeof apiError> | null {
  return rateLimitByKey(`user:${userId}`, config);
}
```

**Apply rate limiting to high-traffic routes:**

Add the rate limit check at the top of each route handler (before auth/logic):

1. **`src/app/api/auth/signup/route.ts`** POST:

```typescript
import { rateLimitByIP } from '@shared/api/rate-limit';
// At top of POST handler:
const rateLimit = rateLimitByIP(request, { windowMs: 3600_000, maxRequests: 3 });
if (rateLimit) return rateLimit;
```

2. **`src/app/api/auth/[...all]/route.ts`**:
   Better Auth handler — add a wrapper or apply in middleware context. Create a wrapper:

```typescript
import { rateLimitByIP } from '@shared/api/rate-limit';
// Wrap the Better Auth handler:
const handler = (req: Request) => {
  if (req.method === 'POST') {
    const rateLimit = rateLimitByIP(req, { windowMs: 60_000, maxRequests: 10 });
    if (rateLimit) return rateLimit;
  }
  // ... existing handler logic
};
```

3. **`src/app/api/invitations/route.ts`** POST:

```typescript
const rateLimit = rateLimitByIP(request, { windowMs: 60_000, maxRequests: 5 });
if (rateLimit) return rateLimit;
```

4. **`src/app/api/messages/route.ts`** POST:

```typescript
const rateLimit = await getSessionAndRole(request);
if (rateLimitByUser?.(rateLimit?.userId, { windowMs: 60_000, maxRequests: 30 })) // apply
```

5. **`src/app/api/notifications/route.ts`** (patch/read notifications — lighter limit):

```typescript
// Apply lighter rate limiting
```

6. **`src/app/api/upload/route.ts`**:

```typescript
const rateLimit = rateLimitByIP(request, { windowMs: 60_000, maxRequests: 10 });
if (rateLimit) return rateLimit;
```

For each route, add the rate limit check immediately after function entry, before any DB queries. Keep the existing logic intact.
</action>
<verify>
<automated>test -f src/shared/api/rate-limit.ts && grep -q "rateLimitByIP\|rateLimitByUser" src/shared/api/rate-limit.ts && npx tsc --noEmit 2>&1 | head -10</automated>
<manual>Test by making rapid requests to /api/auth/signup — should get 429 after limit</manual>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Rate limiting helper created. Auth, invitations, messages, notifications, and upload routes have rate limiting.</done>
</task>

<task type="auto">
<name>Task 2: Create feature gate guard and apply to module-gated routes</name>
<files>src/shared/api/feature-gate.ts, src/app/api/bookings/route.ts, src/entities/tenant/api/features/registry.ts</files>
<action>
**Create `src/shared/api/feature-gate.ts`:**

```typescript
import { apiError, ERROR_CODES } from './api-response';
import { getCurrentTenant } from '@entities/tenant/api/base';
import { isModuleEnabled } from '@entities/tenant/api/features';

/**
 * Assert that a module is enabled for the current tenant.
 * Returns a NextResponse with FEATURE_DISABLED error if the module is not enabled.
 * Returns null if the module is enabled.
 */
export async function assertModuleEnabled(
  moduleKey: string
): Promise<ReturnType<typeof apiError> | null> {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return apiError(ERROR_CODES.TENANT_REQUIRED, 'Tenant context required', 400);
    }

    const enabled = isModuleEnabled(tenant, moduleKey);
    if (!enabled) {
      return apiError(
        ERROR_CODES.FEATURE_DISABLED,
        `This feature is not available for your community`,
        403
      );
    }

    return null;
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, 'Failed to check feature availability', 500);
  }
}
```

**Apply to booking routes** (the canonical example of a module-gated feature):

In `src/app/api/bookings/route.ts`:

```typescript
import { assertModuleEnabled } from '@shared/api/feature-gate';

// At the top of GET handler:
const featureCheck = await assertModuleEnabled('bookings');
if (featureCheck) return featureCheck;

// At the top of POST handler:
const featureCheck = await assertModuleEnabled('bookings');
if (featureCheck) return featureCheck;
```

**Update `src/app/api/community-services/listings/route.ts`** similarly:

```typescript
const featureCheck = await assertModuleEnabled('community_services');
if (featureCheck) return featureCheck;
```

**Check `isModuleEnabled` in the feature registry** at `src/entities/tenant/api/features/registry.ts` or wherever module enabling is checked. If it doesn't exist yet, create a simple helper:

```typescript
export function isModuleEnabled(tenant: Tenant, moduleKey: string): boolean {
  if (tenant.modules?.[moduleKey]?.enabled === false) return false;
  return true; // default to enabled unless explicitly disabled
}
```

Do NOT apply feature gates to routes that are always available (auth, dashboard, etc.). Only module-gated features (bookings, community services, premium, agents).
</action>
<verify>
<automated>test -f src/shared/api/feature-gate.ts && grep -q "assertModuleEnabled" src/shared/api/feature-gate.ts && npx tsc --noEmit 2>&1 | head -10</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Feature gate guard created. Module-gated routes check assertModuleEnabled() before processing.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. Rate limited routes return `{ success: false, error: { code: 'RATE_LIMITED', message: '...' } }` after hitting limits
3. Feature-gated routes return `{ success: false, error: { code: 'FEATURE_DISABLED', message: '...' } }` when module is disabled
4. All existing functionality continues to work for non-limited, non-gated requests
</verification>

<success_criteria>

- Rate limiting helper created and applied to 6 route categories
- Feature gate guard created and applied to module-gated routes
- All responses use canonical error envelopes
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-D02-SUMMARY.md`
</output>
