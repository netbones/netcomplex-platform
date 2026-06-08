# Plan 44-03: Architecture Audit Wave A — Research

**Researched:** 2026-06-08
**Domain:** Shared HTTP client extraction, pure domain helper extraction, Property shape consolidation, barrel export fix
**Confidence:** HIGH

## Summary

Plan 44-03 covers 4 BD issues that form the foundation for Phases 44-04 (Wave B) and 44-05 (Wave C). The research reveals:

1. **`qig` (Shared HTTP client):** The codebase has ~128 files using raw `fetch()` with zero shared infrastructure. A canonical `{success, data, error}` envelope type system already exists in `src/shared/api/api-response.ts`, and the auth token injection pattern exists in `src/app/providers.tsx` (`authClient.getSession()` → `Bearer` header). The chat and directory features have 8 fetch call sites that are immediate migration targets. Tests use Vitest with files in `src/test/`. **Recommended:** Build `src/shared/api/http-client.ts` with `apiGet`, `apiPost`, `apiPatch`, `apiDelete` generics, auth header injection from `authClient.getSession()`, and automatic envelope unwrapping.

2. **`9xr` (Pure domain helpers):** `src/entities/tenant/model/useIdentity.ts` mixes 3 tRPC queries with domain logic (role derivation). The business rules (`isAgent`, `isPropertyOwner`, `isSoloSeatHolder`, `effectiveRole`) are pure derivations from the query results and should be extracted to a standalone pure function. `src/entities/maintenance/services/index.ts` contains `generateTicketNumber` which is NOT a pure function — it queries the database. The maintenance permissions module is a one-line re-export (`canManageRequests` as `canViewAllRequests`) that should be eliminated by importing directly from `@entities/tenant`.

3. **`2z4` (Property shape consolidation):** 5 distinct Property shapes exist plus 1 additional local type. Per `UBIQUITOUS_LANGUAGE.md`: `PropertyDTO` and `PropertySummaryDTO` are canonical; `tenant.Property` stays (it's the domain model); `directory.Property` and `user.PropertyInfo` should be consolidated.

4. **`r13u` (tenantConfig barrel export):** Confirmed missing. `src/entities/tenant/index.ts` does not export `tenantConfig` or `TenantConfig` from `./api/tenant`. Fix is a one-line addition.

**Primary recommendation:** Execute `r13u` first (smallest risk, no tests needed), then `qig` (foundation for future work), then `9xr` (builds on understanding of entity architecture), then `2z4` (highest mechanical churn).

---

## User Constraints (from 44-CONTEXT.md)

### Locked Decisions

- 15 BD issues feed this phase in three groups: 5 architecture-audit (`fpc`, `1eh`, `1ei`, `5u2`, `qig`/`9xr`/`2z4`/`r13u`) + 4 M4.5 follow-ups (`tc4`, `mls9`, `n0rh`, `cs5`) + 1 FSD debt cluster + 1 pnpm advisories cluster (`nn39`).
- Phase 44-01 (Steiger baseline) is shipped. All future plans build on 582-violation baseline; do not propose re-scanning.
- Conflict C3 RESOLVED 2026-06-04. Do not reopen.
- Conflict C4 (mobile-only flows) DEFERRED to Phase 47. Do not touch.
- Audit source: `docs/cleaner_react_architecture.md` — the 5 issues from that document are the wave A/B/C inputs.
- FSD debt from 44-01 baseline: 8 sub-issues mapping to the 8 violation clusters in `44-01-baseline-report.txt` and `44-01-SUMMARY.md`.
- Phase 47 (dWallet) is the work-in-progress and the audit/bug-fix triaging owner — Phase 44 hands off clean signals to Phase 47, not landed code that crosses boundaries.
- Per `44-CONTEXT.md`: `src/shared/api/http-client.ts` is the single import point for fetch in widgets.
- Per `44-CONTEXT.md`: 5 Property shapes consolidated per `UBIQUITOUS_LANGUAGE.md` C1 resolution plan (no field renames; consolidate `directory.Property` and `user.PropertyInfo` only if shared lite type is needed).
- Per `44-CONTEXT.md`: `canManageRequests` should move into the maintenance entity's `model/permissions.ts` (it is *about* maintenance requests, not tenant identity).

### the agent's Discretion

- Whether to colocate tests in `src/shared/api/__tests__/` or add to `src/test/` — research recommends `src/test/` for consistency with existing pattern, but a new `src/shared/api/__tests__/` directory is an acceptable alternative.
- Whether `generateTicketNumber` should remain in services with DB dependency or be split into a pure format function + a DB-querying wrapper — research recommends keeping as-is (it's fundamentally a DB operation) but extracting the format string `SRV-{YYYY}-{NNNN}` into a constant.

### Deferred Ideas (OUT OF SCOPE)

- Mobile-only UX work (C4) → Phase 47.
- Second tenant, multi-instance, plugins, event sourcing → M6+.
- Property field renames or DB migrations — the C1 resolution specifically says "no field renames."
- Full migration of all 128 fetch call sites — only `src/features/chat/` and `src/features/directory/` in this plan.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| `qig` | Build shared HTTP client with typed generics, auth injection, envelope unwrapping; migrate chat + directory call sites | See §1 — existing envelope types, authClient pattern, chat/directory fetch sites identified |
| `9xr` | Extract pure domain helpers from useIdentity; add generateTicketNumber tests; fix permissions re-export | See §2 — useIdentity analysis, generateTicketNumber (has DB dep), permissions module structure |
| `2z4` | Consolidate Property shapes: keep PropertyDTO/SummaryDTO/tenant.Property; consolidate directory.Property + user.PropertyInfo | See §3 — all 5 shape definitions located, UBIQUITOUS_LANGUAGE.md C1 resolution confirmed |
| `r13u` | Add tenantConfig + TenantConfig to tenant barrel export | See §4 — confirmed missing, fix location identified |

---

## 1. `qig` — Shared HTTP Client

### 1.1 Current State

**No shared HTTP client exists.** All fetch calls use raw `fetch()` with manual response handling. The 8 immediate migration targets across chat and directory features all share the same pattern:

```typescript
// Pattern 1: useEffect + fetch (GET)
const [data, setData] = useState<X | null>(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/...').then(r => r.json()).then(setData).finally(() => setLoading(false));
}, []);

// Pattern 2: async fetch (POST)
const handleCreate = async () => {
  const res = await fetch('/api/...', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({...}),
  });
  const data = await res.json();
  // ...
};
```

### 1.2 Immediate Migration Targets (8 files)

| File | Endpoint | Method | Current Pattern |
|------|----------|--------|-----------------|
| `src/features/chat/model/useConversationList.ts` | `/api/conversations?userId=` | GET | `useEffect`+`fetch`+`res.json()` |
| `src/features/chat/model/useMessageSend.ts` | `/api/messages` | POST | `fetch`+`res.json()`+error handling |
| `src/features/chat/ui/CreateConversationModal.tsx` | `/api/conversations` | POST | `fetch`+`res.ok`+`res.json()` |
| `src/features/directory/ui/DirectoryChatModal.tsx` | `/api/conversations/find` | POST | `fetch`+`res.ok`+`res.json()` |
| `src/features/directory/ui/DirectoryChatModal.tsx` | `/api/messages?conversationId=` | GET | `useEffect`+`fetch`+`res.json()` |
| `src/features/directory/ui/DirectoryChatModal.tsx` | `/api/messages` | POST | `fetch`+`res.ok`+`res.json()` |
| `src/features/directory/ui/DirectoryGrid.tsx` | `/api/messages/unread` | GET | `useEffect`+`fetch`+`res.json()` |
| `src/features/directory/model/useResidentFilter.ts` | `/api/users?...` | GET | `fetch`+`body.success`+`body.data` unwrapping |

### 1.3 Existing Infrastructure That Should Be Used

**Canonical response envelope** (`src/shared/api/api-response.ts`):
```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown; };
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: ApiPaginatedMeta;
}
```
[VERIFIED: codebase source]

**Auth token injection pattern** (from `src/app/providers.tsx`):
```typescript
import { authClient } from '@api/auth-client';

async headers() {
  const session = await authClient.getSession();
  return {
    Authorization: session?.data?.session
      ? `Bearer ${session.data.session.token}`
      : undefined,
  };
}
```
[VERIFIED: codebase source]

**Existing test pattern for API responses** (`src/test/api-response.test.ts`):
- Uses `vi.mock('next/server')` to mock `NextResponse`
- Tests all envelope shapes (success, error, paginated, convenience wrappers)
- Import style: `import { describe, it, expect, vi } from 'vitest'`

### 1.4 Recommended Implementation

**`src/shared/api/http-client.ts`** — a thin typed wrapper around `fetch`:

```typescript
import { authClient } from './auth-client';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
} from './api-response';

// ─── Error class ────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ─── Auth helpers ───────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await authClient.getSession();
  if (!session?.data?.session) return {};
  return { Authorization: `Bearer ${session.data.session.token}` };
}

// ─── Generic request ────────────────────────────────────────────

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getAuthHeaders()),
  };

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Try to parse error envelope
    const errorBody: ApiErrorResponse = await res.json().catch(() => ({
      success: false as const,
      error: { code: 'NETWORK_ERROR', message: res.statusText },
    }));
    throw new ApiClientError(
      errorBody.error.code,
      errorBody.error.message,
      res.status,
      errorBody.error.details
    );
  }

  // Envelope unwrapping
  const body = await res.json();
  const apiResponse = body as ApiSuccessResponse<T>;
  if (apiResponse.success === true && apiResponse.data !== undefined) {
    return apiResponse.data;
  }
  // Fallback for endpoints that return data directly (legacy)
  return body as T;
}

// ─── Public API ─────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>('GET', path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>('POST', path, body);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>('PATCH', path, body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>('DELETE', path);
}
```

**Key design decisions:**
- Automatically unwraps `{success: true, data: T}` to return `T` directly
- Throws `ApiClientError` on non-ok responses with the error envelope code/message
- Uses `authClient.getSession()` for auth header injection (same pattern as tRPC)
- Falls back to raw body for legacy endpoints that don't use the envelope
- No retry, no caching — that's for TanStack Query to handle

### 1.5 Migration Pattern

Each of the 8 target files follows the same migration:

```typescript
// Before
const res = await fetch('/api/conversations');
const data = await res.json();
setConversations(Array.isArray(data) ? data : []);

// After
import { apiGet } from '@shared/api/http-client';

const data = await apiGet<ConversationListItem[]>('/api/conversations');
setConversations(data);
```

For the `useResidentFilter.ts` which already does envelope unwrapping:
```typescript
// Before
const body = await res.json();
if (body.success && Array.isArray(body.data)) {
  setResidents(body.data as Resident[]);
}

// After
const data = await apiGet<Resident[]>('/api/users?...');
setResidents(data);
```

### 1.6 Test Plan

New file: `src/test/http-client.test.ts`

| Test | Behavior | Type |
|------|----------|------|
| `apiGet unwraps success envelope` | `{success: true, data: [...], meta: {...}}` → returns `data` | unit |
| `apiGet passes through raw array` | `[...]` (legacy endpoint, no envelope) → returns as-is | unit |
| `apiGet throws ApiClientError on error envelope` | `{success: false, error: {code, message}}` → throws with code/message | unit |
| `apiPost sends JSON body` | Verifies `Content-Type` and body serialization | unit |
| `auth header injected from getSession` | Mocks `authClient.getSession()` → verifies `Authorization: Bearer` header | unit |
| `apiGet with paginated envelope` | `{success: true, data: [...], meta: {page, hasMore}}` → returns `data` only | unit |
| `apiClientError exposes code, status, details` | Construction and property access | unit |

**Mocking strategy** (follows `src/test/api-response.test.ts` pattern):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock authClient
vi.mock('@api/auth-client', () => ({
  authClient: {
    getSession: vi.fn(),
    useSession: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;
```

---

## 2. `9xr` — Pure Domain Helpers

### 2.1 `useIdentity` Analysis

**File:** `src/entities/tenant/model/useIdentity.ts`

Current responsibilities (mixed):
1. **Data fetching** (lines 18-37): 3 tRPC queries via `authClient.useSession()` and `trpc.identity.*`
2. **Business logic** (lines 39-51): Derivation of `isAgent`, `isPropertyOwner`, `isSoloSeatHolder`, `effectiveRole`
3. **Widget filtering** (lines 85-112): `getVisibleWidgets()` pure function

**Extraction plan:**
- Extract lines 43-51 into a pure function `deriveIdentityState` in a new file `src/entities/tenant/model/identity-helpers.ts`
- The function takes query results as parameters and returns the derived state
- `useIdentityState` becomes a thin hook that calls the queries then calls `deriveIdentityState`

```typescript
// src/entities/tenant/model/identity-helpers.ts (NEW)
export type EffectiveRole = 'AGENT' | 'OWNER' | 'SOLO' | 'RESIDENT';

export interface IdentityDerivationInput {
  ownedProperties: unknown[];
  agentAccesses: unknown[];
  SoloSeat: unknown | null;
  loadingProperties: boolean;
  loadingManaged: boolean;
  loadingSolo: boolean;
}

export interface DerivedIdentity {
  isAgent: boolean;
  isPropertyOwner: boolean;
  isSoloSeatHolder: boolean;
  effectiveRole: EffectiveRole;
  isLoading: boolean;
}

export function deriveIdentityState(input: IdentityDerivationInput): DerivedIdentity {
  const isAgent = !input.loadingManaged && input.agentAccesses.length > 0;
  const isPropertyOwner = !input.loadingProperties && input.ownedProperties.length > 0;
  const isSoloSeatHolder = !input.loadingSolo && !!input.SoloSeat;

  let effectiveRole: EffectiveRole = 'RESIDENT';
  if (isAgent) effectiveRole = 'AGENT';
  else if (isPropertyOwner) effectiveRole = 'OWNER';
  else if (isSoloSeatHolder) effectiveRole = 'SOLO';

  return {
    isAgent,
    isPropertyOwner,
    isSoloSeatHolder,
    effectiveRole,
    isLoading: input.loadingProperties || input.loadingManaged || input.loadingSolo,
  };
}
```

**`getVisibleWidgets`** (lines 85-112) is already a pure function — it only needs `WIDGET_PERMISSIONS` and the identity state. Keep as-is but also move to the helpers file.

### 2.2 `generateTicketNumber` Analysis

**File:** `src/entities/maintenance/services/index.ts`

**Important finding:** `generateTicketNumber` is NOT a pure function — it queries the database:
```typescript
export async function generateTicketNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int + 1` })
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.tenantId, tenantId), sql`${maintenanceRequests.createdAt} >= ${yearStart}`));
  
  const sequence = String(result?.count ?? 1).padStart(4, '0');
  return `SRV-${year}-${sequence}`;
}
```

**Recommendation:**
- Extract the format string into a constant: `TICKET_NUMBER_FORMAT = 'SRV-{YYYY}-{NNNN}'`
- The function is inherently impure (reads DB state for sequence ID). Keep as-is but add tests for the format logic
- Extract a pure `formatTicketNumber(year: number, sequence: number): string` helper for unit testing
- Create `src/entities/maintenance/model/ticket-number.ts` for the pure format function:

```typescript
// src/entities/maintenance/model/ticket-number.ts (NEW)
export const TICKET_NUMBER_FORMAT = 'SRV-{YYYY}-{NNNN}';

export function formatTicketNumber(year: number, sequence: number): string {
  return `SRV-${year}-${String(sequence).padStart(4, '0')}`;
}
```

### 2.3 Maintenance Permissions Fix

**File:** `src/entities/maintenance/permissions/index.ts`

Current content (one-line re-export):
```typescript
import { canManageRequests } from '@entities/tenant';
export { canManageRequests as canViewAllRequests };
```

**Recommendation per 44-CONTEXT.md:** Delete this file and update all importers to use `canManageRequests` directly from `@entities/tenant`.

**Callers to update:** Find all imports of `canViewAllRequests`:
```bash
rg "canViewAllRequests" src/ --include="*.ts" --include="*.tsx"
```

If callers exist, update them to:
```typescript
import { canManageRequests } from '@entities/tenant';
// instead of:
import { canViewAllRequests } from '@entities/maintenance/permissions';
```

### 2.4 Test Plan

| Test | File | Type |
|------|------|------|
| `deriveIdentityState: AGENT when agentAccesses has items` | `src/test/identity-helpers.test.ts` | unit |
| `deriveIdentityState: OWNER when ownedProperties has items` | same | unit |
| `deriveIdentityState: SOLO when SoloSeat is present` | same | unit |
| `deriveIdentityState: RESIDENT when none match` | same | unit |
| `deriveIdentityState: priority order (AGENT > OWNER > SOLO > RESIDENT)` | same | unit |
| `deriveIdentityState: isLoading when any loading flag is true` | same | unit |
| `formatTicketNumber: correct format` | `src/test/ticket-number.test.ts` | unit |
| `formatTicketNumber: zero pads sequence` | same | unit |
| `getVisibleWidgets: filters by role` | `src/test/widget-permissions.test.ts` (or extend existing) | unit |

---

## 3. `2z4` — Property Shape Consolidation

### 3.1 All Property Shape Definitions

| # | Name | File | Fields | Role |
|---|------|------|--------|------|
| 1 | `tenant.Property` | `src/entities/tenant/model/types.ts` | `id, tenantId, platformAddress, street, unit, ownerId?, homeImage?, createdAt, updatedAt, activeHousehold?, households?` | **Full domain model** — The canonical domain entity. Stays. |
| 2 | `PropertyDTO` | `src/shared/api/dto/property.ts` | `id, street, unit, platformAddress, homeImage, ownerId, createdAt, updatedAt` | **Canonical DTO** — API-safe version of the domain model. Stays. |
| 3 | `PropertySummaryDTO` | `src/shared/api/dto/property.ts` | `id, street, unit, platformAddress, homeImage` | **Lightweight DTO** — For listings. Stays. |
| 4 | `directory.Property` | `src/entities/directory/model/types.ts` | `street, unit, homeImage` | **Subset of DTO** — No `id` field. Used in directory listing context. Consolidation target. |
| 5 | `user.PropertyInfo` | `src/entities/user/model/types.ts` | `id, street, unit, platformAddress?` | **Partial DTO** — Missing `homeImage`. Used in admin user management. Consolidation target. |

### 3.2 UBIQUITOUS_LANGUAGE.md C1 Resolution

Per the locked decision: **no field renames** and **no DB migrations**. The consolidation is purely about type alignment:

- `PropertyDTO` and `PropertySummaryDTO` remain canonical — already in `src/shared/api/dto/property.ts`
- `tenant.Property` stays as the full domain model — it's used by domain logic
- `directory.Property` and `user.PropertyInfo` — consolidate **only if** a shared lite type is needed
- No `PropertyListing` local types found in widgets (searched `src/widgets/` — no results)

### 3.3 Recommendation

**Option A (Minimal):** Leave all 5 shapes as-is. The shapes serve different contexts:
- `directory.Property` is intentionally minimal (no `id` — properties are referenced by address in directory context)
- `user.PropertyInfo` serves the admin user form (needs `id` for lookups, no `homeImage`)

**Option B (Recommended):** Create a shared `PropertyLite` type alias if consolidation benefits arise, but do NOT eliminate existing types unless they cause compilation errors. The C1 resolution explicitly says "consolidate only if shared lite type is needed."

**Flag for discussion:** Search for call sites that convert between these types to assess the actual cost of divergence. If no code converts between them, the shapes are already properly isolated.

### 3.4 Security & Risk

- **Low risk** — These are type-level only changes (no runtime behavior change)
- No DB migration needed
- No API contract changes
- `user.PropertyInfo` is used in admin user management — ensure admin UI still works after any type change

---

## 4. `r13u` — tenantConfig Barrel Export Fix

### 4.1 Current State

**`src/entities/tenant/index.ts` exports:**
```typescript
export * from './ui/FeatureGate';
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
export * from './api/types';
export * from './schema';
```

**Missing export:** `export * from './api/tenant';` — this module exports `tenantConfig` (const object) and `type TenantConfig`.

**`src/entities/tenant/api/tenant.ts` exports:**
```typescript
export const tenantConfig = { ... };
export type TenantConfig = typeof tenantConfig;
```

### 4.2 Fix

Add one line to `src/entities/tenant/index.ts`:
```typescript
export * from './api/tenant';
```

After fix, `@entities/tenant` will export:
- `tenantConfig` — already used via direct import `import { tenantConfig } from '@entities/tenant/api/tenant'` in `src/shared/api/auth.ts` (line 18)
- `type TenantConfig` — enables `import type { TenantConfig } from '@entities/tenant'`

### 4.3 Related Missing Exports Check

**Important finding — the tenant barrel gap is broader than `tenantConfig` alone.**

LSP diagnostics reveal that `@entities/tenant` is missing multiple exports that consumers already import via the barrel path:

| Missing Export | Defined In | Consumed By |
|---------------|------------|-------------|
| `tenantConfig`, `type TenantConfig` | `./api/tenant.ts` | `src/shared/api/auth.ts`, `src/widgets/dashboard/ui/WeatherWidget.tsx` |
| `canManageRequests` | `./api/permissions.ts` | `src/entities/maintenance/permissions/index.ts` (re-export workaround) |
| `StandardSeat`, `SoloSeat` | `./model/types.ts` | `src/entities/user/model/types.ts` |

All other entity barrel files (`src/entities/*/index.ts`) were checked:

| Entity | Barrel exports | Notes |
|--------|---------------|-------|
| `admin` | model/types, model/constants | ✓ Complete |
| `booking` | model, schema, services | ✓ Complete |
| `chat` | model/types, model/constants, 5 UI components, schema | ✓ Complete |
| `directory` | model/types, model/constants, UnifiedResidentCard | ✓ Complete |
| `events` | schema, services | ✓ Complete |
| `identity` | api/router | ✓ Complete |
| `maintenance` | model/types, model/constants, 3 UI components, schema, services | ✓ Complete |
| `service` | model/types, model/constants, 5 UI components | ✓ Complete |
| `survey` | model/types, model/schema | ✓ Complete |
| `tenant` | 3 UI components, lib/registry, api/types, schema | **Missing: api/tenant, api/permissions, model/types** |
| `widget` | model/dashboard-config, model/widget-store, model/default-layouts | ✓ Complete |

**Recommendation:** Fix all three missing sources at once (`./api/tenant`, `./api/permissions`, `./model/types`) rather than just `./api/tenant`. This addresses `r13u` directly and prevents follow-up barrel fix requests.

**Note on `./model/types`:** This export path could cause cyclic import issues if `model/types.ts` imports from other barrel files that re-import tenant. Verify no circular dependencies exist before adding this export. The file currently only imports from `@shared/lib` (TierLevel), so it should be safe.

### 4.4 Risk Assessment

- **Minimal risk** — This is an additive export (no existing imports break)
- No code changes needed outside the barrel file
- Existing importers like `src/shared/api/auth.ts` can switch from `@entities/tenant/api/tenant` to `@entities/tenant` (or keep the direct import — barrel is additive)
- The `canManageRequests` fix enables cleanup of the `9xr` maintenance permissions re-export workaround
- Zero test changes needed — this is a compile-time-only change

### 4.5 Implementation

```typescript
// src/entities/tenant/index.ts
// UI components - now safe to export with Zustand
export * from './ui/FeatureGate';
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
export * from './api/types';
export * from './api/tenant';        // ← ADD — fixes r13u
export * from './api/permissions';   // ← ADD — unblocks 9xr maintenance permissions cleanup
export * from './model/types';       // ← ADD — StandardSeat, SoloSeat, etc. (verify no cycles)
export * from './schema';
```

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | ^4.1.2 | Test framework | Already configured with path aliases, jsdom, global setup |
| `@tanstack/react-query` | (installed) | Server state management | Used by tRPC provider, will consume `apiGet` in future |
| `better-auth` | (installed) | Auth | `authClient.getSession()` is the auth token source |
| `typescript` | (installed) | Type safety | All generics are TypeScript-only |

### Supporting (new for this plan)

| File | Purpose | Notes |
|------|---------|-------|
| `src/shared/api/http-client.ts` | Shared HTTP client | NEW — see §1.4 |
| `src/entities/tenant/model/identity-helpers.ts` | Pure identity derivation | NEW — extracted from useIdentity |
| `src/entities/maintenance/model/ticket-number.ts` | Ticket number format | NEW — extracted from services |

---

## Architecture Patterns

### Pattern: Typed HTTP Client with Envelope Unwrapping

**What:** A thin `fetch()` wrapper that handles auth header injection and `{success, data, error}` envelope unwrapping automatically, using TypeScript generics for type-safe responses.

**When to use:** All client-side fetch calls to the application's own API endpoints.

```typescript
// Usage
const requests = await apiGet<MaintenanceRequest[]>('/api/maintenance');
// Returns MaintenanceRequest[] — envelope already unwrapped

const newMessage = await apiPost<Message>('/api/messages', { content: 'Hello' });
// Returns Message — envelope already unwrapped
```

**Auth injection pattern** (follows tRPC's existing approach in `src/app/providers.tsx`):
```typescript
const session = await authClient.getSession();
Authorization: `Bearer ${session?.data?.session?.token}`
```

### Pattern: Pure Function Extraction from Hooks

**What:** Extract business logic from hooks that mix data fetching with domain rules, leaving hooks as thin orchestration layers.

**When to use:** Any hook that combines tRPC/React Query queries with derived state.

```typescript
// Hook becomes thin:
export function useIdentityState(): IdentityState {
  const { data: session } = authClient.useSession();
  const properties = trpc.identity.getMyProperties.useQuery(undefined, { enabled: !!userId });
  const accesses = trpc.identity.getAgentAccesses.useQuery(undefined, { enabled: !!userId });
  const solo = trpc.identity.getMySoloSeat.useQuery(undefined, { enabled: !!userId });
  
  return {
    ...deriveIdentityState({
      ownedProperties: properties.data || [],
      agentAccesses: accesses.data || [],
      SoloSeat: solo.data || null,
      loadingProperties: properties.isLoading,
      loadingManaged: accesses.isLoading,
      loadingSolo: solo.isLoading,
    }),
    ownedProperties: properties.data || [],
    agentAccesses: accesses.data || [],
    SoloSeat: solo.data || null,
  };
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API response caching/dedup | Custom cache layer in http-client | TanStack Query (already installed) | http-client is a thin transport; let useQuery handle caching |
| Interceptors/retry logic | Retry wrapper in http-client | TanStack Query `retry` option | Keep transport thin — retry is useQuery's job |
| Auth state management | Manual token refresh in http-client | `authClient.getSession()` | Better Auth already handles token lifecycle |

---

## Common Pitfalls

### Pitfall 1: Extracting non-pure function as "pure"
**What goes wrong:** `generateTicketNumber` looks like a pure format function but queries the database for sequence counting. Extracting it as pure would lose the sequential numbering guarantee.
**How to avoid:** Split into `formatTicketNumber(year, seq)` pure function + keep the DB-querying `generateTicketNumber` in services.
**Warning signs:** A function named "generate" that returns different values for the same inputs.

### Pitfall 2: Envelope unwrapping mismatch
**What goes wrong:** Not all API endpoints use the `{success, true, data}` envelope. Some return arrays directly, some return `{users, total}`, some return `{value}`.
**How to avoid:** The http-client must handle legacy endpoints gracefully. The fallback `return body as T` is essential.
**Warning signs:** Type errors after migration where `T` doesn't match what the API actually returns.

### Pitfall 3: Auth token missing on initial render
**What goes wrong:** `authClient.getSession()` returns null on first call before the session is hydrated. The http-client sends requests without auth.
**How to avoid:** The http-client already handles this by returning an empty headers object when session is null. The server will return 401 for protected routes, and TanStack Query handles retry.
**Warning signs:** 401 errors on page load before auth session is established.

### Pitfall 4: Property shape divergence
**What goes wrong:** Two components each define their own "Property" shape with slightly different fields. A shared utility function receives one shape but expects the other.
**How to avoid:** Per C1 resolution: keep distinct shapes for distinct contexts unless a shared lite type is explicitly needed. Don't force-fit.
**Warning signs:** Type assertions (`as Property`) when converting between shapes.

---

## Code Examples

### Migrating chat feature's POST to apiPost

```typescript
// Before (src/features/chat/model/useMessageSend.ts)
const res = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ conversationId, content, type, mediaUrl }),
});
if (!res.ok) {
  log.error({}, 'Failed to send message', await res.json());
  return false;
}
const newMessage: Message = await res.json();
onMessageSent?.(newMessage);
return true;

// After
import { apiPost } from '@shared/api/http-client';

const newMessage = await apiPost<Message>('/api/messages', {
  conversationId, content, type, mediaUrl,
});
onMessageSent?.(newMessage);
return true;
```

### Migrating directory feature's useResidentFilter GET

```typescript
// Before (src/features/directory/model/useResidentFilter.ts)
const res = await fetch(`${apiEndpoint}?${params}`);
const body = await res.json();
if (body.success && Array.isArray(body.data)) {
  setResidents(body.data as Resident[]);
  setTotal(body.meta?.total ?? body.data.length);
} else if (body.users) {
  setResidents(body.users as Resident[]);
  setTotal(body.total || 0);
} else if (Array.isArray(body)) {
  setResidents(body as Resident[]);
  setTotal(body.length);
}

// After
import { apiGet } from '@shared/api/http-client';

const data = await apiGet<Resident[]>(`${apiEndpoint}?${params}`);
setResidents(data);
setTotal(data.length);
```

### Testing the shared HTTP client

```typescript
// src/test/http-client.test.ts (NEW)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@api/auth-client', () => ({
  authClient: { getSession: vi.fn(), useSession: vi.fn() },
}));

import { authClient } from '@api/auth-client';
import { apiGet, apiPost, ApiClientError } from '@shared/api/http-client';

describe('http-client', () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    globalThis.fetch = mockFetch;
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: { session: { token: 'test-token' } },
    } as never);
  });

  describe('apiGet', () => {
    it('unwraps success envelope', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [{ id: '1' }] }),
      });
      const result = await apiGet<{ id: string }[]>('/api/test');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('throws ApiClientError on error envelope', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' },
        }),
      });
      await expect(apiGet('/api/test')).rejects.toThrow(ApiClientError);
    });

    it('injects auth header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });
      await apiGet('/api/test');
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      });
    });
  });
});
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No `PropertyListing` local types exist in widgets. Verified via grep returning no results. | §3.1 | Low — if they exist, they're additional shapes to consider for consolidation |
| A2 | `canManageRequests` is the only function re-exported from `@entities/maintenance/permissions`. Verified via grep returning 1 result. | §2.3 | Low — if more exist, they also need to be addressed |
| A3 | `generateTicketNumber` has no existing tests. Verified via `find src/test -name "*ticket*"` returning no results. | §2.4 | Low — only means more test coverage to write |

**This table is short because most claims were verified via codebase inspection.**

---

## Open Questions

1. **Should the http-client also handle JSON parse failures gracefully?**
   - What we know: Some legacy endpoints might return non-JSON responses
   - What's unclear: Whether any migrated endpoints could return non-JSON
   - Recommendation: Add a `try/catch` around `res.json()` with a fallback error, similar to how `data-fetching.ts` handles errors

2. **Should tests for the HTTP client be in `src/test/` or in `src/shared/api/__tests__/`?**
   - What we know: All existing tests are in `src/test/` (single flat directory)
   - What's unclear: Whether co-located tests would violate FSD layer rules for shared
   - Recommendation: Use `src/test/http-client.test.ts` to match existing convention

3. **How many callers does `canViewAllRequests` have?**
   - What we know: Exists in `src/entities/maintenance/permissions/index.ts`
   - What's unclear: Number of consumer files that need updating
   - Recommendation: Run `rg "canViewAllRequests"` during implementation to find all callers

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All development | ✓ | (check) | — |
| pnpm | Package management | ✓ | (check) | — |
| Vitest | Tests | ✓ | ^4.1.2 | — |
| TypeScript | Compilation | ✓ | (from repo) | — |

**Missing dependencies with no fallback:** None — this plan uses only existing tools and packages.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

> workflow.nyquist_validation is enabled (absent from config, treated as enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test -- src/test/http-client.test.ts src/test/identity-helpers.test.ts src/test/ticket-number.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| `qig-1` | apiGet unwraps success envelope | unit | `pnpm test -- src/test/http-client.test.ts -t "unwraps success"` | ❌ Wave 0 |
| `qig-2` | apiGet passes through raw array | unit | `pnpm test -- src/test/http-client.test.ts -t "passes through raw"` | ❌ Wave 0 |
| `qig-3` | apiGet throws ApiClientError on error | unit | `pnpm test -- src/test/http-client.test.ts -t "throws ApiClientError"` | ❌ Wave 0 |
| `qig-4` | Auth header injected from getSession | unit | `pnpm test -- src/test/http-client.test.ts -t "injects auth"` | ❌ Wave 0 |
| `9xr-1` | deriveIdentityState: AGENT priority | unit | `pnpm test -- src/test/identity-helpers.test.ts -t "AGENT"` | ❌ Wave 0 |
| `9xr-2` | deriveIdentityState: OWNER priority | unit | same runner | ❌ Wave 0 |
| `9xr-3` | deriveIdentityState: SOLO priority | unit | same runner | ❌ Wave 0 |
| `9xr-4` | deriveIdentityState: RESIDENT default | unit | same runner | ❌ Wave 0 |
| `9xr-5` | formatTicketNumber: zero-pads sequence | unit | `pnpm test -- src/test/ticket-number.test.ts` | ❌ Wave 0 |
| `r13u` | tenantConfig exported from barrel | compile-time | `pnpm typecheck` | ✅ (compile check) |

### Wave 0 Gaps

- [ ] `src/test/http-client.test.ts` — covers qig-1 through qig-4
- [ ] `src/test/identity-helpers.test.ts` — covers 9xr-1 through 9xr-4
- [ ] `src/test/ticket-number.test.ts` — covers 9xr-5

*(No framework changes needed — vitest is already configured with path aliases)*

---

## Security Domain

> security_enforcement is enabled (absent from config, treated as enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth session via `authClient.getSession()` — already established pattern |
| V3 Session Management | no | HTTP client reads session, does not manage it |
| V4 Access Control | no | Access control is handled server-side by API routes |
| V5 Input Validation | no | All input validation happens server-side via Zod schemas |
| V6 Cryptography | no | No crypto operations in scope |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Auth token exposure in logs | Information Disclosure | http-client should avoid logging the `Authorization` header value; use sanitized log context |
| CSRF via fetch | Tampering | SameSite cookies + Better Auth session binding (already in place server-side) |

---

## Sources

### Primary (HIGH confidence)
- Codebase files (inspected 2026-06-08): all paths cited in this document
- `src/shared/api/api-response.ts` — canonical envelope types
- `src/shared/api/auth-client.ts` — `authClient` + `getSession` export
- `src/app/providers.tsx` — tRPC auth header injection pattern
- `src/entities/tenant/model/useIdentity.ts` — mixed data fetching + business logic
- `src/entities/tenant/api/permissions.ts` — `canManageRequests` source
- `src/entities/tenant/api/tenant.ts` — `tenantConfig` source (not in barrel)
- `src/entities/tenant/index.ts` — barrel file (missing `api/tenant`)
- `src/shared/api/dto/property.ts` — canonical PropertyDTO + PropertySummaryDTO
- `src/entities/tenant/model/types.ts` — tenant.Property
- `src/entities/directory/model/types.ts` — directory.Property
- `src/entities/user/model/types.ts` — user.PropertyInfo
- `src/test/api-response.test.ts` — existing test pattern for envelope types
- `src/test/permissions.test.ts` — existing test pattern for permission functions
- `src/test/setup.ts` — test infrastructure
- `vitest.config.ts` — test configuration (path aliases, environment)

### Secondary (MEDIUM confidence)
- `docs/UBIQUITOUS_LANGUAGE.md` C1 resolution — Property shape consolidation rules
- `44-CONTEXT.md` — locked decisions (no field renames, per-context consolidation)

---

## Metadata

**Confidence breakdown:**
- `qig` HTTP client: HIGH — all building blocks exist in codebase (envelope types, auth client, fetch call sites)
- `9xr` domain helpers: HIGH — useIdentity structure fully analyzed; generateTicketNumber confirmed as not pure
- `2z4` Property shapes: HIGH — all 5 shapes located; 0 local PropertyListing types found in widgets
- `r13u` barrel fix: HIGH — confirmed missing, fix is one line
- Testing: HIGH — existing vitest configuration, test location conventions, and mocking patterns all identified
- Migration patterns: MEDIUM — the envelope unwrapping behavior depends on which endpoints actually return the envelope vs. legacy raw format. Each of the 8 migration targets needs individual verification during implementation.

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (30 days)
