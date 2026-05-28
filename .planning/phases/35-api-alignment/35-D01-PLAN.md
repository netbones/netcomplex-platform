---
phase: 35-api-alignment
plan: D01
type: execute
wave: 3
depends_on: ['35-A01']
files_modified:
  - src/shared/api/observability.ts
  - src/shared/api/audit-log.ts
  - src/middleware.ts
  - src/app/api/maintenance/route.ts
  - src/app/api/maintenance/[id]/route.ts
  - src/app/api/users/[id]/suspend/route.ts
  - src/app/api/users/[id]/unsuspend/route.ts
  - src/app/api/users/[id]/route.ts
  - src/app/api/admin/platform/tenants/route.ts
  - src/app/api/admin/platform/tenants/[id]/route.ts
autonomous: true
requirements:
  - API-GOV-01

must_haves:
  truths:
    - 'Every API request has a unique request ID'
    - 'Tenant tracing is available in logs (tenantId, actorId on every request)'
    - 'Sensitive operations (suspensions, tenant changes, role changes) are audit-logged'
    - 'Latency is tracked per-request in logs'
  artifacts:
    - path: 'src/shared/api/observability.ts'
      provides: 'Request ID generation, tenant tracing helpers'
    - path: 'src/shared/api/audit-log.ts'
      provides: 'Audit trail for sensitive operations'
  key_links:
    - from: 'src/shared/api/observability.ts'
      to: 'src/middleware.ts'
      via: 'Middleware adds request ID header'
    - from: 'src/shared/api/audit-log.ts'
      to: 'src/db/schema/'
      via: 'Audit log writes to an auditLog table or structured log'
---

<objective>
Implement request-level observability and audit logging for sensitive operations.

Purpose: API_ARCHITECTURE.md §16 and API.md §21 require request IDs, tenant tracing, and latency tracking for all APIs. API.md §21.2 mandates audit logging for sensitive operations (suspensions, onboarding, moderation, permissions changes, tenant settings).

Currently, there is no request ID middleware, no tenant tracing correlation, and no audit trail for sensitive operations.

Output: Request ID middleware, tenant-tracing observability helpers, audit logging infrastructure wired to sensitive API routes.
</objective>

<execution_context>
@/home/ubuntupunk/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/ubuntupunk/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@docs/STEERING/API.md
@docs/architecture/API_ARCHITECTURE.md
@src/middleware.ts
@src/shared/lib/logger.ts
@src/app/api/users/[id]/suspend/route.ts
@src/app/api/users/[id]/route.ts
@src/app/api/admin/platform/tenants/[id]/route.ts
</context>

<tasks>

<task type="auto">
<name>Task 1: Create observability utilities</name>
<files>src/shared/api/observability.ts, src/middleware.ts</files>
<action>
**Create `src/shared/api/observability.ts`:**

```typescript
import { headers } from 'next/headers';
import { apiLogger } from '@shared/lib';
import { randomUUID } from 'crypto';

/**
 * Generates or retrieves a request ID from the incoming request headers.
 * Falls back to generating a new UUID.
 */
export function getRequestId(): string {
  // In middleware context, use the x-request-id header set by middleware
  // In route context, generate a new one
  return randomUUID();
}

/**
 * Structured log context builder for API requests.
 * Attaches requestId, tenantId, actorId, and route for consistent log correlation.
 */
export interface RequestLogContext {
  requestId: string;
  actorId?: string | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  route?: string;
  method?: string;
}

/**
 * Create a structured log context for the current request.
 * Call at the top of each route handler to enable correlated logging.
 */
export function createLogContext(opts: {
  requestId?: string;
  actorId?: string | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  route?: string;
  method?: string;
}): RequestLogContext {
  return {
    requestId: opts.requestId || getRequestId(),
    actorId: opts.actorId || null,
    tenantId: opts.tenantId || null,
    tenantSlug: opts.tenantSlug || null,
    route: opts.route,
    method: opts.method,
  };
}

/**
 * Timing helper — wraps an async operation with latency logging.
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  logContext?: RequestLogContext
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    apiLogger.info({ ...logContext, duration: `${duration.toFixed(0)}ms`, label }, 'API request');
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    apiLogger.error(
      { ...logContext, duration: `${duration.toFixed(0)}ms`, label, err: error },
      'API error'
    );
    throw error;
  }
}
```

**Update `src/middleware.ts`:**
Add request ID generation to the middleware, before the existing API route handling:

```typescript
// After the `const response = NextResponse.next();` line:

// Generate request ID for observability
const requestId = randomUUID?.() || crypto.randomUUID();
response.headers.set('x-request-id', requestId);

// Forward to route handler
request.headers.set('x-request-id', requestId);
```

This gives every API response an `x-request-id` header and makes the ID available to route handlers via request headers.

If `crypto.randomUUID()` is not available in Edge runtime, use `Math.random().toString(36).substring(2, 15)` as fallback.

Add the `x-request-id` header docs to the existing comment block about API routes in middleware.
</action>
<verify>
<automated>test -f src/shared/api/observability.ts && grep -q "getRequestId\|createLogContext\|withTiming" src/shared/api/observability.ts && grep -q "x-request-id" src/middleware.ts</automated>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>observability.ts created with request ID, log context, and timing helpers. Middleware sets x-request-id header.</done>
</task>

<task type="auto">
<name>Task 2: Create audit logging infrastructure and wire to sensitive routes</name>
<files>src/shared/api/audit-log.ts, src/app/api/users/[id]/suspend/route.ts, src/app/api/users/[id]/unsuspend/route.ts, src/app/api/users/[id]/route.ts, src/app/api/admin/platform/tenants/[id]/route.ts, src/app/api/admin/platform/tenants/route.ts</files>
<action>
**Create `src/shared/api/audit-log.ts`:**

```typescript
import { apiLogger } from '@shared/lib';

export type AuditAction =
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'USER_ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_DELETED'
  | 'PERMISSIONS_CHANGED'
  | 'SETTINGS_CHANGED'
  | 'CONTENT_DELETED'
  | 'INVITATION_CREATED'
  | 'INVITATION_REVOKED';

export interface AuditLogEntry {
  action: AuditAction;
  actorId: string;
  targetId?: string;
  tenantId?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Write an audit log entry.
 * In the current infrastructure, this writes to the structured Pino logger.
 * Future: will write to a dedicated audit_log table.
 */
export function writeAuditLog(entry: AuditLogEntry): void {
  apiLogger.info(
    {
      audit: true,
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId,
      tenantId: entry.tenantId,
      details: entry.details,
      requestId: entry.requestId,
    },
    `AUDIT: ${entry.action}`
  );
}
```

**Wire audit logging to sensitive routes:**

For each route, import `writeAuditLog` and call it after successful operations:

1. **`src/app/api/users/[id]/suspend/route.ts`** — after successful suspension:

```typescript
writeAuditLog({
  action: 'USER_SUSPENDED',
  actorId: authData.userId,
  targetId: params.id,
  tenantId,
  details: { suspensionType, reason, endDate },
});
```

2. **`src/app/api/users/[id]/unsuspend/route.ts`** — after successful unsuspension:

```typescript
writeAuditLog({
  action: 'USER_UNSUSPENDED',
  actorId: authData.userId,
  targetId: params.id,
  tenantId,
});
```

3. **`src/app/api/users/[id]/route.ts`** — in PATCH handler, if `role` is being changed:

```typescript
if (body.role) {
  writeAuditLog({
    action: 'USER_ROLE_CHANGED',
    actorId: authData.userId,
    targetId: params.id,
    tenantId,
    details: { oldRole: currentUser.role, newRole: body.role },
  });
}
```

4. **`src/app/api/admin/platform/tenants/route.ts`** — POST handler after successful creation:

```typescript
writeAuditLog({
  action: 'TENANT_CREATED',
  actorId: session.user.id,
  targetId: tenant.id,
  details: { name: tenant.name, slug: tenant.slug },
});
```

5. **`src/app/api/admin/platform/tenants/[id]/route.ts`** — PATCH handler:

```typescript
writeAuditLog({
  action: 'TENANT_UPDATED',
  actorId: session.user.id,
  targetId: params.id,
  details: { updatedFields: Object.keys(body) },
});
```

For each modification, get the `requestId` from `request.headers.get('x-request-id')`.

Do NOT change any business logic — only add audit log calls after successful operations.
</action>
<verify>
<automated>test -f src/shared/api/audit-log.ts && grep -q "writeAuditLog" src/app/api/users/\[id\]/suspend/route.ts && npx tsc --noEmit 2>&1 | head -10</automated>
<manual>Trigger a suspension and verify AUDIT: USER_SUSPENDED appears in server logs</manual>
<sampling_rate>run after task commits</sampling_rate>
</verify>
<done>Audit logging infrastructure created. Suspensions, role changes, and tenant CRUD are audit-logged.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. `curl -I /api/v1/system/health` returns `x-request-id` header
3. Pino logs contain `audit: true` entries for suspension/tenant operations
4. `createLogContext` and `withTiming` compile without errors
</verification>

<success_criteria>

- Request ID middleware operational (x-request-id on every response)
- Observability helpers (getRequestId, createLogContext, withTiming) created
- Audit logging infrastructure created for sensitive operations
- Suspensions, role changes, tenant CRUD routes have audit logging wired
  </success_criteria>

<output>
After completion, create `.planning/phases/35-api-alignment/35-D01-SUMMARY.md`
</output>
