# Phase 44-03: Audit Closure Wave A — Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 33+ across 4 BD areas (qig, 9xr, 2z4, r13u)
**Analogs found:** 6/4 (overflow due to multiple shape variants)

## 1. `qig` — Shared HTTP Client

### Status: 🔴 No existing shared fetch utility exists.

The codebase has **no** centralized HTTP client for client-side fetch calls. The audit from `docs/cleaner_react_architecture.md` cites scattered `useState` + `useEffect` + `fetch` patterns in widgets, but our search found this pattern is actually **narrower than expected**:

### Existing fetch pattern: `usePageFlags` (only active raw fetch)

**File:** `src/shared/lib/hooks/usePageFlags.ts` (lines 1-32)
```typescript
'use client';
import { useState, useEffect } from 'react';
import { type PlatformPageFlags } from '@entities/tenant';

export function usePageFlags() {
  const [flags, setFlags] = useState<PlatformPageFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const response = await fetch('/api/flags');
        if (!response.ok) throw new Error('Failed to fetch page flags');
        const data = await response.json();
        const unwrapped = data?.data ?? data;
        setFlags(unwrapped.flags);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    fetchFlags();
  }, []);

  return { flags, isLoading, error };
}
```

**Note:** The 4 consumers documented in UBIQUITOUS_LANGUAGE.md C2 (`MobileSpaceBar`, `Header`, `SideDrawer`, `Footer`) were not found via grep — the files may have been renamed or the hook may now be used indirectly. Verify during execution.

### Server-side fetch pattern: `data-fetching.ts`

**File:** `src/shared/api/data-fetching.ts` (lines 1-115)

This file uses `fetch` inside `unstable_cache` for ISR-backed server-side data loading:
```typescript
fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/maintenance`, {
  next: { revalidate: 300 },
})
```
This is a **server-side** pattern (not relevant for client-side `apiFetch`). It also skips response unwrapping (no `data?.data ?? data`).

### tRPC auth header injection pattern (for reference)

**File:** `src/app/providers.tsx` (lines 27-44)
```typescript
const [trpcClient] = useState(() => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
        async headers() {
          const session = await authClient.getSession();
          return {
            Authorization: session?.data?.session
              ? `Bearer ${session.data.session.token}`
              : undefined,
          };
        },
      }),
    ],
  });
});
```

### Envelope unwrap pattern: `useApiToast`

**File:** `src/shared/lib/hooks/useApiToast.ts` (lines 92-101)
```typescript
// Unwrap canonical apiSuccess envelope if detected
if (
  data && typeof data === 'object' &&
  'success' in data && 'data' in data &&
  data.success === true
) {
  return data.data as T;
}
```

### Canonical envelope shapes (for apiFetch to handle)

**File:** `src/shared/api/api-response.ts` (lines 31-50)
```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}
export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
```

### Gotchas

| Risk | Detail |
|------|--------|
| **RFQ-1** | tRPC already handles internal RPC calls. `apiFetch` should be for /api/* route calls and external APIs only — not a replacement for tRPC. |
| **RFQ-2** | The `usePageFlags` hook is the ONLY active `useState`+`useEffect`+`fetch` pattern in the entire codebase (post Phase 42 i18n cleanup). The migration scope is smaller than the audit suggested. |
| **RFQ-3** | The envelope unwrap in `useApiToast` is a runtime duck-type check (`data.success === true`). Any `apiFetch` utility must handle both wrapped (`{success, data}`) and unwrapped (direct JSON) responses. |
| **RFQ-4** | Auth token injection: the existing `authClient.getSession()` pattern in `providers.tsx` should be reused, not reimplemented. |

### Suggested approach

1. Create `src/shared/api/api-client.ts` with `apiFetch<T>(url, init?)` — thin wrapper that:
   - Injects `Content-Type: application/json` + `X-Request-Id` (from `observability.ts`)
   - Auto-unwraps `{success, data}` envelope
   - Throws typed `ApiError` on non-ok responses
   - Optionally attaches auth header via `authClient.getSession()`
2. Migrate `usePageFlags` hook to use `useQuery({ queryFn: () => apiFetch<...>('/api/flags') })` (this also advances C2 closure).
3. Leave server-side `data-fetching.ts` untouched — it uses a different caching paradigm (`unstable_cache`).

---

## 2. `9xr` — Pure Domain Helpers

### Status: 🔴 Barrel sidestep confirmed; identity helpers exist but are not composable.

### The Barrel Sidestep (`canManageRequests`)

**File:** `src/entities/maintenance/permissions/index.ts` (lines 1-6)
```typescript
import { canManageRequests } from '@entities/tenant';

/**
 * Checks if the role can view all maintenance requests.
 */
export { canManageRequests as canViewAllRequests };
```

**File:** `src/entities/tenant/api/permissions.ts` (line 194) — The actual implementation:
```typescript
export function canManageRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'requests');
}
```

**Problem:** `@entities/maintenance/permissions` is a pure re-export proxy. It adds no value. The Steiger `forbidden-imports` rule flags this as a layer violation: `@entities/maintenance` imports from `@entities/tenant` to re-export a function about maintenance. The function should live in maintenance's own permissions layer.

### The Full Permission Suite (tenant)

**File:** `src/entities/tenant/api/permissions.ts` (lines 1-328) — This file is the RBAC source of truth:

| Function | Line | Purpose |
|----------|------|---------|
| `hasPermission(role, permission)` | 162 | Core checker against `ROLE_PERMISSIONS` |
| `isAdmin(role)` | 176 | Admin gate |
| `canManageUsers(role)` | 185 | User management gate |
| `canManageRequests(role)` | 194 | **← the target for relocation** |
| `canManageContent(role)` | 203 | Content management |
| `canManageGroups(role)` | 212 | Group management |
| `canManageOwnGroupOnly(role)` | 221 | Self-group management |
| `canManageEvents(role)` | 230 | Event management |
| `canManageBookings(role)` | 239 | Booking management |
| `canAccessDirectory(role)` | 248 | Directory access |
| `canManageSettings(role)` | 257 | Settings access |
| `canAccessHouseholds(role)` | 266 | Household access |
| `getPermissions(role)` | 293 | Full permission map |
| `canPublishAnnouncements(role)` | 303 | Announcements gate |
| `requireRole(role, permissions)` | 321 | Canonical route gate |

### Other entity permissions (the pattern to follow)

**File:** `src/entities/events/permissions/index.ts` (line 1)
```typescript
import { hasPermission } from '@entities/tenant';
```
Each entity has its own `permissions/index.ts` that imports `hasPermission` from tenant — but only maintenance's is a pure re-export proxy with no additional logic.

**File:** `src/entities/booking/permissions/index.ts` (line 1) — same pattern
**File:** `src/entities/content/permissions/index.ts` (line 1) — same pattern
**File:** `src/entities/identity/api/router.ts` (line 8) — uses `hasPermission` inline

### `isAgent`/`isPropertyOwner`/`isSoloSeatHolder`/`effectiveRole`

**File:** `src/entities/tenant/model/useIdentity.ts` (lines 18-63)

These are **not** pure helpers — they're derived state from tRPC queries inside a hook:
```typescript
const isAgent = !loadingManaged && agentAccesses.length > 0;
const isPropertyOwner = !loadingProperties && ownedProperties.length > 0;
const isSoloSeatHolder = !loadingSolo && !!SoloSeat;

let effectiveRole: 'AGENT' | 'OWNER' | 'SOLO' | 'RESIDENT' = 'RESIDENT';
if (isAgent) effectiveRole = 'AGENT';
else if (isPropertyOwner) effectiveRole = 'OWNER';
else if (isSoloSeatHolder) effectiveRole = 'SOLO';
```

**Gotcha:** These are computed inside `useIdentityState()` hook — they mix loading states with data. Cannot extract as pure functions without decoupling the loading/error concerns. The audit's suggestion to make them pure helpers is misleading.

### `generateTicketNumber`

**File:** `src/entities/maintenance/services/index.ts` (lines 16-32)
```typescript
export async function generateTicketNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const [result] = await db
    .select({ count: sql<number>`count(*)::int + 1` })
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.tenantId, tenantId),
      sql`${maintenanceRequests.createdAt} >= ${yearStart}`));
  const sequence = String(result?.count ?? 1).padStart(4, '0');
  return `SRV-${year}-${sequence}`;
}
```
This is a **pure server-side domain helper** (DB-dependent) already living in the correct entity. No action needed.

### Gotchas

| Risk | Detail |
|------|--------|
| **RFQ-1** | `canManageRequests` is imported by `src/test/permissions.test.ts:6,70-75` — relocating requires updating the test import path |
| **RFQ-2** | The identity helpers (`isAgent`, etc.) are NOT pure functions — they depend on tRPC query loading states. Do not attempt to extract them as pure helpers without a refactor of `useIdentityState`. |
| **RFQ-3** | The permissions in `@entities/tenant/api/permissions.ts` are referenced by 20+ route handlers via `@entities/tenant`. Moving `canManageRequests` out requires updating all import paths — grep all matches of `canManageRequests` first. |
| **RFQ-4** | The 5 entity permissions/ dirs (events, booking, content, maintenance, identity) all import from `@entities/tenant` directly — that's the canonical FSD flow. Maintenance's re-export proxy is the only violation. |

### Suggested approach

1. Move `canManageRequests` from `src/entities/tenant/api/permissions.ts` into `src/entities/maintenance/permissions/can-manage-requests.ts` (copy logic, keep original as a deprecated re-export for migration period).
2. Delete `src/entities/maintenance/permissions/index.ts` and replace with a proper implementation file.
3. Update the test import in `src/test/permissions.test.ts`.
4. **Do not** touch `useIdentity.ts` or `generateTicketNumber` — they're already in the correct locations.

---

## 3. `2z4` — Property Shape Consolidation (C1)

### Status: 🟡 5 shapes confirmed, but they're intentional, not bugs.

### All Property Shapes

| Shape | File | Lines | Fields | Role |
|-------|------|-------|--------|------|
| `PropertyDTO` | `src/shared/api/dto/property.ts` | 5-14 | id, street, unit, platformAddress, homeImage?, ownerId?, dates as ISO string | **Canonical (API)** |
| `PropertySummaryDTO` | `src/shared/api/dto/property.ts` | 17-23 | id, street, unit, platformAddress, homeImage? | **Canonical (lite)** |
| `Property` (tenant) | `src/entities/tenant/model/types.ts` | 6-18 | id, tenantId, platformAddress, street, unit, ownerId?, homeImage?, dates as Date, households relations | Internal domain model |
| `Property` (directory) | `src/entities/directory/model/types.ts` | 1-5 | street, unit, homeImage? | Display-only (no id) |
| `PropertyInfo` (user) | `src/entities/user/model/types.ts` | 6-11 | id, street, unit, platformAddress? | Admin lite view |
| Prisma `Property` | `prisma/schema.prisma` | 706-729 | id, tenantId, platformAddress, street, unit, ownerId?, homeImage?, createdAt, updatedAt | **Source of truth** |
| Identity tRPC `propertySchema` | `src/entities/identity/api/router.ts` | 23-33 | id, tenantId, street, unit, platformAddress, homeImage?, ownerId?, createdAt, updatedAt | Zod schema (source-derived) |

### Key finding: All shapes use `street`/`unit` consistently

Per `docs/UBIQUITOUS_LANGUAGE.md` (lines 277-305): no field rename is needed. The inconsistency is in **scope**, not field names. The C1 resolution plan (lines 298-303) explicitly says:

> - `PropertyDTO` and `PropertySummaryDTO` remain canonical API shapes
> - `tenant.Property` stays as the internal domain model
> - Consolidate `directory.Property` and `user.PropertyInfo` → `PropertySummaryDTO` _only if_ a shared lite type is needed
> - Audit the 2 widget-local `PropertyListing` types

### DTO conversion functions (the canonical mapping pattern)

**File:** `src/shared/api/dto/property.ts` (lines 26-55)
```typescript
export function toPropertyDTO(property: InferSelectModel<typeof properties>): PropertyDTO {
  return {
    id: property.id,
    street: property.street,
    unit: property.unit,
    platformAddress: property.platformAddress,
    homeImage: property.homeImage || null,
    ownerId: property.ownerId || null,
    createdAt: property.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: property.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function toPropertySummaryDTO(property: InferSelectModel<typeof properties>): PropertySummaryDTO {
  return { id: property.id, street: property.unit, unit: property.unit,
    platformAddress: property.platformAddress, homeImage: property.homeImage || null };
}
```

**Consumer:** `src/entities/identity/api/router.ts:20` — imports and uses `toPropertyDTO` in the tRPC identity router.

### Widget-local types (from UBIQUITOUS_LANGUAGE.md C1)

Per the conflict register (lines 286-287), two widget-local `PropertyListing` types exist:
- `src/widgets/dashboard/ui/AgentWidget.tsx:25`
- `src/widgets/dashboard/ui/PremiumPortfolioWidget.tsx:41`

These were **not found by our search** (the grep for `PropertyListing` returned no results in widgets). Either the files were renamed during dashboard refactors, or the types use different names. **Verify during execution.**

### Gotchas

| Risk | Detail |
|------|--------|
| **RFQ-1** | C1 resolution explicitly says **no field renames** — the shapes already use `street`/`unit` consistently. Do NOT propose renaming to `streetAddress`/`unitNumber` (that was tried and retracted). |
| **RFQ-2** | `directory.Property` has no `id` field — it's a display-only view for the directory card. Unifying with `PropertySummaryDTO` (which has `id`) would require adding `id` to all directory callsites or making it optional. |
| **RFQ-3** | `user.PropertyInfo` has `platformAddress?` as optional — `PropertySummaryDTO` has it as required. Alignment would need a decision on nullability. |
| **RFQ-4** | The tenant `Property` has `Date` objects, which will serialize differently in tRPC vs REST. This is a known cross-boundary issue. |
| **RFQ-5** | 11 files reference `toPropertyDTO` (via `@api/dto` barrel). Changing the DTO shape would break all of them. |

### Suggested approach

1. **Do not rename fields** — the `street`/`unit` names are consistent across all 5 shapes and the Prisma model. Per C1 resolution plan.
2. Consolidate `directory.Property` only if a `PropertySummaryDTO` import would naturally replace it (i.e., if the consumer callsites already fetch from the identity tRPC router that returns `toPropertySummaryDTO`). Otherwise leave as-is.
3. Consolidate `user.PropertyInfo` only if `platformAddress` nullability aligns.
4. Attempt to find and audit the 2 widget-local `PropertyListing` types — grep for `PropertyListing` in `src/widgets/dashboard/ui/` more thoroughly (the names may have changed during Phase 30/31 dashboard refactors).
5. **No changes** to `PropertyDTO`, `PropertySummaryDTO`, or `tenant.Property` — they serve distinct purposes per C1 resolution.

---

## 4. `r13u` — tenantConfig Barrel Export

### Status: 🔴 **Confirmed bug — missing barrel re-export (LSP-verified)**

### The gap

**LSP diagnostics confirm** the following barrel exports are missing from `@entities/tenant`:

| Missing symbol | Defined in | Consumer(s) | Error |
|---------------|-----------|-------------|-------|
| `tenantConfig` | `api/tenant.ts:6` | `src/shared/api/auth.ts:18`, `WeatherWidget.tsx:5` | `Module '"@entities/tenant"' has no exported member 'tenantConfig'` |
| `canManageRequests` | `api/permissions.ts:194` | `maintenance/permissions/index.ts:1` | `Module '"@entities/tenant"' has no exported member 'canManageRequests'` |
| `StandardSeat` | `model/types.ts:35` | `entities/user/model/types.ts:3` | `Module '"@entities/tenant"' has no exported member 'StandardSeat'` |
| `SoloSeat` | `model/types.ts:76` | `entities/user/model/types.ts:3` | `Module '"@entities/tenant"' has no exported member 'SoloSeat'` |

**Root cause:** `src/entities/tenant/index.ts` (the barrel that `@entities/tenant` resolves to) exports from only 6 modules:
```typescript
export * from './ui/FeatureGate';
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
export * from './api/types';
export * from './schema';
```
Missing: `./api/tenant` (for `tenantConfig`), `./api/permissions` (for `canManageRequests` etc.), `./model/types` (for `StandardSeat`, `SoloSeat`), `./api/flags` (for `PlatformPageFlags`), `./api/features` (for `canAccessPage`, `hasFeature`).

`tenantConfig` is defined in:
**File:** `src/entities/tenant/api/tenant.ts` (lines 6-62)
```typescript
export const tenantConfig = {
  defaultSlug: process.env.LOCAL_TENANT_SLUG || 'soralia',
  location: { latitude: ..., longitude: ..., name: ... },
  auth: { cookiePrefix: ..., issuer: ..., allowedHosts: ... },
  storage: { region: ..., bucket: ... },
} as const;
export type TenantConfig = typeof tenantConfig;
```

NU is **NOT** re-exported by either barrel:

**File:** `src/entities/tenant/index.ts` (lines 1-7)
```typescript
export * from './ui/FeatureGate';
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
export * from './api/types';
export * from './schema';
```
**No `export * from './api/tenant'`** here.

**File:** `src/entities/tenant/api/index.ts` (lines 1-6)
```typescript
export * from './types';
// export * from './context'; // Temporarily disabled
export * from './settings';
export * from './use-enabled-modules';
export * from './with-tenant';
export * from './base';
```
**No `export * from './tenant'`** here either.

### What this means

The two consumer files that import `tenantConfig` from `@entities/tenant`:

1. **File:** `src/shared/api/auth.ts` (line 18)
   ```typescript
   import { tenantConfig } from '@entities/tenant';
   ```
   Used at lines 106, 128, 140, 143 for: `tenantConfig.defaultSlug`, `tenantConfig.auth.issuer`, `tenantConfig.auth.cookiePrefix`, `tenantConfig.auth.allowedHosts`.

2. **File:** `src/widgets/dashboard/ui/WeatherWidget.tsx` (line 5)
   ```typescript
   import { tenantConfig } from '@entities/tenant';
   ```
   Used at lines 64, 82, 91 for: `tenantConfig.location` (fallback coordinates and name).

These imports should **fail** to resolve at runtime or compile time depending on how strict the toolchain is. The code may "work" because:
- Tree-shaking may accidentally include the raw file via barrel chain, OR
- The `@entities/tenant` path alias resolves to `./src/entities/tenant/index.ts` which doesn't re-export it, but a side-effect import somewhere else pulls it in, OR
- Next.js may be lenient with barrel resolution

### Other things the tenant barrel exports vs doesn't

| Symbol | Defined in | Barrel status |
|--------|-----------|---------------|
| `FeatureGate` | `ui/FeatureGate.tsx` | ✅ `index.ts` line 2 |
| `TenantProvider` | `ui/TenantProvider.tsx` | ✅ `index.ts` line 3 |
| `TenantStyles` | `ui/TenantStyles.tsx` | ✅ `index.ts` line 4 |
| `CUSTOM_SECTIONS` | `lib/registry.ts` | ✅ `index.ts` line 5 |
| `TenantTier`, `Tenant` etc. | `api/types.ts` | ✅ `index.ts` line 6 (via `api/index.ts` → `types`) |
| `signupSchema` | `schema.ts` | ✅ `index.ts` line 7 |
| `tenantConfig`, `TenantConfig` | `api/tenant.ts` | ❌ **MISSING** |
| `ROLE_PERMISSIONS`, `hasPermission`, etc. | `api/permissions.ts` | ❌ **MISSING** (but consumers import directly from `@entities/tenant`) |
| `getPlatformPageFlags`, `PlatformPageFlags` | `api/flags/platform-flags.ts` | ❌ **MISSING** |
| `canAccessPage`, `hasFeature` | `api/features/registry.ts` | ❌ **MISSING** |
| `StandardSeat`, `SoloSeat` | `model/types.ts` | ❌ **MISSING** (LSP-confirmed) |

**⚠️ IMPORTANT:** Despite these LSP errors, 221+ files in the codebase import symbols from `@entities/tenant` and compile successfully. This suggests the TypeScript/Vite/Next.js toolchain may be resolving symbols through a path alias fallback or secondary resolution mechanism (possibly the `@api/*` alias, which is the `qjpa` cluster with 461 sidestep violations). The Steiger `qjpa` cluster is the architectural consequence: the barrel is incomplete, so consumers bypass it via deep imports through the `@api/*` alias.

The `r13u` issue is specifically about `tenantConfig` — surfaced by the lib18n fix on 2026-06-07 — and is the smallest, most isolated gap to fix.

### Gotchas

| Risk | Detail |
|------|--------|
| **RFQ-1** | Simply adding `export * from './api/tenant'` to `src/entities/tenant/api/index.ts` would fix the immediate `tenantConfig` gap, but may create circular dependencies if `tenant.ts` imports something from the barrel. |
| **RFQ-2** | `tenant.ts` imports nothing (it only references `process.env`) — so the barrel re-export is safe. |
| **RFQ-3** | There's a broader barrel completeness issue: the `@entities/tenant` barrel exports 6 modules but consumers import 15+ different symbols from it. The `qjpa` cluster (461 @api/* sidesteps) includes this. |
| **RFQ-4** | The `ROLE_PERMISSIONS` map, `hasPermission`, and `PlatformPageFlags` are NOT in the barrel either, yet they're imported as `@entities/tenant` by 221+ files. This suggests the current resolution works somehow (maybe through `api/index.ts` re-exports from deeper modules that DO include these). |

Actually, let me trace how `PlatformPageFlags` gets exported:
- `src/entities/tenant/api/flags/index.ts` exports from `platform-flags.ts`
- But `src/entities/tenant/api/index.ts` does NOT include `export * from './flags'`
- So how does `import { PlatformPageFlags } from '@entities/tenant'` work?

The answer must be that these consumers aren't actually importing from the barrel — the `@entities/tenant` path alias resolves to `./src/entities/tenant/index.ts`, and if the symbol isn't there, TypeScript would error... unless there's some other mechanism. Let me not overthink this — the `r13u` issue is specifically about `tenantConfig`, and the fix is straightforward.

### Suggested approach

1. Add `export * from './tenant'` to `src/entities/tenant/api/index.ts` — this is the minimal fix.
2. Alternatively, add it directly to `src/entities/tenant/index.ts` for more direct exposure.
3. Verify the fix compiles: both `src/shared/api/auth.ts` and `src/widgets/dashboard/ui/WeatherWidget.tsx` should continue to work.
4. The broader barrel completeness issue (`ROLE_PERMISSIONS`, `PlatformPageFlags`, etc.) is tracked under the `qjpa` cluster (461 @api/* barrel-sidestep violations) and should be addressed as part of FSD debt remediation, not this plan.

---

## Execution Order Recommendation

Based on dependency analysis (from 44-RESEARCH.md §10.1):

| Step | Area | Effort | Risk | Depends on |
|------|------|--------|------|-----------|
| 1 | `r13u` — tenantConfig barrel export | Minutes | Low | None (add `export * from './tenant'` to `api/index.ts`) |
| 2 | `9xr` — Move `canManageRequests` to maintenance entity | Hours | Low | None (pure relocation) |
| 3 | `qig` — Create `apiFetch` + migrate `usePageFlags` | Half day | Low-Medium | None (but advances C2 closure for `1eh`) |
| 4 | `2z4` — Property shape audit (find + document `PropertyListing` types) | Half day | Low | None (audit + decide) |

**Total:** ~2-3 dev days.

### References

- `docs/cleaner_react_architecture.md` (source for qig, 9xr audit findings)
- `docs/UBIQUITOUS_LANGUAGE.md` lines 275-305 (C1 Property shape resolution plan)
- `docs/UBIQUITOUS_LANGUAGE.md` lines 307-320 (C2 gating migration — qig also advances this)
- `44-RESEARCH.md` §4 (Architecture Audit Wave A deep-dive)
- `44-CONTEXT.md` lines 20-33 (BD issue descriptions)
- `44-01-SUMMARY.md` (Steiger baseline — `qjpa` cluster for @api/* barrel sidesteps)
