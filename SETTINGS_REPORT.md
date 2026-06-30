# Settings Architecture Review Report

## Executive Summary

The settings system spans user-level preferences (stored on the `user` model) and tenant-level
administrative configuration (stored in a generic `Setting` key-value table). Two independent API
surfaces serve these settings: a tRPC router (`settingsRouter`) and a family of REST endpoints under
`/api/settings/`, `/api/admin/settings/`, and `/api/admin/*`. A third surface (`/api/flags`)
aggregates tenant-level page flags for client consumption.

The architecture works but suffers from duplication, inconsistent revalidation, gaps in audit
logging, and a large 150+ line switch statement duplicated across two functions. Below is a
detailed breakdown.

---

## 1. Database Layer

### 1.1 Generic `Setting` Table (Tenant-Level)

| File                           | Model              |
| ------------------------------ | ------------------ |
| `prisma/schema.prisma:476-487` | `Setting`          |
| `src/db/schema/settings.ts`    | Drizzle `settings` |

Fields: `id` (PK), `tenantId`, `key`, `value` (text), `schemaVersion`, `createdAt`, `updatedAt`,
`deletedAt` (soft-delete). Unique on `(tenantId, key)`.

### 1.2 User-Level Settings (on `user` Model)

| Field                     | Type     | Purpose                       |
| ------------------------- | -------- | ----------------------------- |
| `showEmail`               | Boolean  | Show email on public profile  |
| `showPhone`               | Boolean  | Show phone on public profile  |
| `notificationPreferences` | Json     | Per-type in-app/email toggles |
| `avatar`                  | String?  | Profile image URL             |
| `profileImage`            | String?  | Alternate profile image       |
| `profileData`             | Json?    | Freeform profile JSON         |
| `dashboardLayout`         | Json?    | Widget layout config          |
| `isPublic`                | Boolean  | Profile visibility            |
| `interests`               | String[] | User interest tags            |
| `books`                   | Json?    | Bookshelf data                |

### 1.3 Key Observation

User settings live directly on the `user` row and are mutated via `PATCH /api/users/:id`. Tenant
settings live in the generic `Setting` table and are mutated via `/api/settings/` or specialized
admin endpoints. These two worlds NEVER intersect, yet they share the term "settings." This is a
source of confusion — "settings" in the URL path means tenant config, but `useSettings(userId)`
fetches user profile data.

---

## 2. API Surface

### 2.1 tRPC Router

`src/server/routers/settings.ts` — 5 procedures:

| Procedure            | Method | Access                                      | Revalidates                |
| -------------------- | ------ | ------------------------------------------- | -------------------------- |
| `listSettings`       | GET    | Tenant (authenticated)                      | No                         |
| `getSetting`         | GET    | Tenant                                      | No                         |
| `upsertSetting`      | POST   | Privileged + `hasPermission(role, 'admin')` | `revalidateAdminChanges()` |
| `deleteSetting`      | DELETE | Privileged + `hasPermission(role, 'admin')` | `revalidateAdminChanges()` |
| `getContactSettings` | GET    | Privileged + `hasPermission(role, 'admin')` | No                         |

All mutations write `writeAuditLog({ action: 'SETTINGS_CHANGED', ... })`.

### 2.2 REST Routes

| Route                                           | Method | Access                              | Audit Log        | Revalidation                                                       | Rate Limit |
| ----------------------------------------------- | ------ | ----------------------------------- | ---------------- | ------------------------------------------------------------------ | ---------- |
| `/api/settings/`                                | GET    | Admin only                          | N/A              | N/A                                                                | No         |
| `/api/settings/`                                | POST   | Admin + AssistScope                 | Yes              | **MISSING**                                                        | 10/min     |
| `/api/settings/[key]`                           | GET    | Public                              | N/A              | N/A                                                                | No         |
| `/api/settings/[key]`                           | PATCH  | Admin + AssistScope                 | Yes              | **MISSING**                                                        | 10/min     |
| `/api/settings/contact/`                        | GET    | Authenticated                       | N/A              | N/A                                                                | No         |
| `/api/settings/contact/`                        | POST   | Authenticated (**no admin check!**) | **MISSING**      | **MISSING**                                                        | No         |
| `/api/admin/settings/page-flags/`               | GET    | Authenticated (RLS)                 | N/A              | N/A                                                                | No         |
| `/api/admin/settings/page-flags/`               | POST   | Admin + RLS                         | Yes              | **MISSING**                                                        | 10/min     |
| `/api/admin/settings/page-flags/`               | PUT    | Admin + RLS                         | Yes (per change) | **MISSING**                                                        | 10/min     |
| `/api/admin/services-config/`                   | GET    | Authenticated (RLS)                 | N/A              | N/A                                                                | No         |
| `/api/admin/services-config/`                   | PUT    | Admin + RLS                         | Yes              | **MISSING**                                                        | 10/min     |
| `/api/admin/tenant/provider-registration-mode/` | GET    | Admin/Board                         | N/A              | N/A                                                                | No         |
| `/api/admin/tenant/provider-registration-mode/` | PATCH  | Admin/Board                         | Yes              | `revalidateTag(SETTINGS)`, `revalidatePath('/providers/register')` | No         |
| `/api/flags/`                                   | GET    | Public (RLS)                        | N/A              | N/A                                                                | No         |

### 2.3 V1 Wrappers

`src/app/api/v1/tenant/settings/` — three files that re-export canonical implementations. They
exist to establish the `/api/v1/tenant/` namespace but add a layer of indirection without functional
value. The migration plan to tRPC (Phase B) is noted in comments but not scheduled.

---

## 3. Shared Library: Settings Types & Validation

### 3.1 Types (`src/shared/lib/settings/types.ts`)

`SettingValueMap` maps 20 setting keys to their typed runtime values. **Missing keys** from the map
that exist in `SETTINGS_KEYS` and/or `PlatformPageFlags`:

- `page_education_enabled`
- `page_dwallet_enabled`
- `page_disputes_enabled`
- `page_providers_enabled`
- `page_marketplace_paypal_enabled`
- `interest_categories`
- `translation_provider`
- `translation_api_key`
- `provider_registration_mode`

### 3.2 Validation (`src/shared/lib/settings/validation.ts`)

`SETTINGS_VALUE_SCHEMAS` maps 24 setting keys to Zod schemas. Missing validators for keys that
exist in `SETTINGS_KEYS`:

- `page_education_enabled`
- `page_dwallet_enabled`
- `page_disputes_enabled`
- `page_providers_enabled`
- `page_marketplace_paypal_enabled`
- `translation_provider`
- `translation_api_key`

These keys have no runtime validation, so `validateSettingValue()` falls back to the `fallbackSchema`
(`z.string()`), which accepts any string.

### 3.3 Settings Keys Enum (`src/entities/tenant/api/settings.ts`)

`SETTINGS_KEYS` is the canonical source of truth with 40+ string constants. However:

- `validation.ts` hardcodes its own list of keys instead of deriving from `SETTINGS_KEYS`
- `platform-flags.ts` maps each key in a 150-line switch rather than using a data-driven approach
- `types.ts` only covers a subset

---

## 4. Specialized Settings Subsystems

### 4.1 Platform Page Flags

**Files:** `src/entities/tenant/api/flags/platform-flags.ts` (325 lines)

Two functions do the same thing:

- `getPlatformPageFlagsImpl(tenantId)` — uses global `db`
- `getPlatformPageFlagsWithTx(tx, tenantId)` — uses passed-in transaction

Both contain identical 150+ line switch statements mapping DB keys to `PlatformPageFlags` fields.
Only `getPlatformPageFlags` (non-tx) is ISR-cached via `unstable_cache`. The tx variant is needed
for RLS routes but contains no caching.

`mapFlagToSettingKey()` is a separate 20-line mapping function that duplicates the reverse mapping
already present in the switch statements.

### 4.2 Services Config

**Files:** `src/entities/tenant/api/flags/services-config.ts` + `.types.ts`

Stores the services page configuration as a JSON blob under key `services_config`. Fetches ALL
tenant settings from the DB then filters in JavaScript with `.then(r => r.filter(...))` rather
than using `and(eq(settings.key, SETTINGS_KEYS.SERVICES_CONFIG))` in the SQL query.

### 4.3 Provider Registration Mode

**Files:** `src/entities/tenant/api/provider-registration-mode.ts`

Simple string enum (`OPEN` / `INVITATION_ONLY`). Uses `unstable_cache` for reading and
`revalidateTag(SETTINGS)` + `revalidatePath()` after writes. This is the only settings
REST endpoint that revalidates its cache.

### 4.4 Statsig Experiment Flags

**File:** `src/entities/tenant/api/flags/statsig-flags.ts`

Six hardcoded experiment flags, all returning `false`. The Statsig SDK is not wired up.
Effectively dead code for now.

---

## 5. Frontend

### 5.1 User Settings Page (`src/app/settings/page.tsx`)

- 402 lines in a single client component
- Fetches user data via `useSettings(userId)` (TanStack Query → `GET /api/users/:id`)
- Mutates via inline `fetch()` calls to `/api/users/:id`, `/api/households/:id`
- Handles: profile avatar, language, property image, account info, notifications, privacy
- Has `ErrorBoundary` wrapper but no granular error states for individual sections

### 5.2 Admin Page Settings Widget (`src/widgets/admin/ui/PageSettingsWidget.tsx`)

- 367 lines
- Fetches flags from `/api/admin/settings/page-flags` (raw `useState` + `useEffect`, NOT TanStack Query)
- Handles: navigation header links (max 4), page visibility toggles (15 pages), conservation mode
- Dispatches `window.dispatchEvent(new Event('page-flags-updated'))` for cross-component sync

### 5.3 Client Hooks

| Hook                  | Fetches              | Uses TanStack Query | Cache       |
| --------------------- | -------------------- | ------------------- | ----------- |
| `useSettings(userId)` | `GET /api/users/:id` | Yes                 | 5 min stale |
| `usePageFlags()`      | `GET /api/flags`     | No (raw `useState`) | None        |

---

## 6. Revalidation

`src/shared/api/revalidation.ts` defines six revalidation functions:

- `revalidateDashboard()` — revalidates `/dashboard`, `/api/stats`, `/api/maintenance`, etc.
- `revalidateDirectory()` — revalidates `/directory`, `/api/users`, `/api/groups`
- `revalidateContent()` — revalidates `/resources`, `/conservation`, `/api/content`
- `revalidateConversations()` — revalidates `/messages`, `/api/conversations`, `/api/messages`
- `revalidateAdminChanges()` — calls Dashboard + Directory + Content + `/admin/*`
- `revalidateGate()` — revalidates `/api/flags` + all gated page paths

**The tRPC settings router calls `revalidateAdminChanges()` after every mutation.** None of the
REST settings endpoints call any revalidation after mutations (except `provider-registration-mode`
which calls `revalidateTag` + `revalidatePath`). This means a setting changed via the REST API
will return stale values from ISR-cached pages until the TTL expires.

---

## 7. Findings: Anti-Patterns & Improvements

### 7.1 CRITICAL: Revalidation Gap in REST Settings Endpoints

**Severity: High**

The tRPC router calls `revalidateAdminChanges()` after every mutation. The REST equivalents do
NOT. Endpoints affected:

- `POST /api/settings/`
- `PATCH /api/settings/[key]`
- `POST /api/settings/contact/`
- `POST /api/admin/settings/page-flags/`
- `PUT /api/admin/settings/page-flags/`
- `PUT /api/admin/services-config/`

**Impact:** Admin changes made via REST do not invalidate ISR caches. Stale data served until
TTL expires (300s for page flags, 300s for provider registration mode).

**Fix:** Add `revalidateAdminChanges()` to POST/PATCH handlers in `src/app/api/settings/route.ts`
and `[key]/route.ts`. Add `revalidateTag(CACHE_TAGS.SETTINGS)` to page-flags and services-config
mutations (as `provider-registration-mode` already does).

### 7.2 CRITICAL: Missing Audit Log on Contact Settings

**Severity: Medium**

`POST /api/settings/contact/route.ts:38-66` does NOT call `writeAuditLog`. Every other settings
mutation writes `SETTINGS_CHANGED`. This is the only gap.

### 7.3 CRITICAL: Missing Admin Check on Contact Settings POST

**Severity: High**

`POST /api/settings/contact/route.ts:38-66` checks `getSessionAndRole` (auth required) but does
NOT check if the user has admin privileges. Any authenticated user can bulk-upsert tenant settings
via this endpoint.

**Fix:** Add `hasPermission(authData.role, 'admin')` check after line 40.

### 7.4 HIGH: Duplicated 150-line Switch Statement

**Severity: Medium (maintenance)**

`getPlatformPageFlagsImpl` and `getPlatformPageFlagsWithTx` in
`src/entities/tenant/api/flags/platform-flags.ts` contain identical ~150-line switch statements
(lines 25-99 and lines 175-249). Any new flag requires changes in both places plus
`mapFlagToSettingKey()` plus `SETTINGS_KEYS` plus `PlatformPageFlags` interface plus
`DEFAULT_PAGE_FLAGS` plus `VALID_KEYS` in the page-flags route.

**Fix:** Extract the switch logic into a shared helper. Define flags as a data structure
(not code) and generate the getter, setter, defaults, and valid keys from it.

```typescript
// Instead of switch:
const FLAG_DEFS = [
  { flag: 'campaign', settingKey: SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED, type: 'boolean' },
  {
    flag: 'conservation',
    settingKey: SETTINGS_KEYS.PAGE_CONSERVATION_MODE,
    type: 'enum',
    values: ['default', 'managed', 'external'],
  },
  // ...
] as const;

function applySetting(flags, setting) {
  const def = FLAG_DEFS.find(d => d.settingKey === setting.key);
  if (!def) return;
  flags[def.flag] = def.type === 'boolean' ? setting.value === 'true' : setting.value;
}
```

### 7.5 HIGH: N+1 Pattern in Services Config & Provider Registration

**Severity: Medium (performance)**

Both `getServicesConfigWithTx` and `getProviderRegistrationModeImpl` fetch ALL tenant settings
rows then filter in JavaScript:

```typescript
// services-config.ts:64 — fetches all, filters in JS
const rows = await tx
  .select()
  .from(settings)
  .where(eq(settings.tenantId, tenantId))
  .then(r => r.filter(s => s.key === SETTINGS_KEYS.SERVICES_CONFIG));

// provider-registration-mode.ts:22 — same pattern
const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
const rawValue = tenantSettings.find(
  s => s.key === SETTINGS_KEYS.PROVIDER_REGISTRATION_MODE
)?.value;
```

**Fix:** Add `eq(settings.key, ...)` to the WHERE clause so the database filters, not JS.

### 7.6 MEDIUM: `usePageFlags` Doesn't Use TanStack Query

**Severity: Low (consistency)**

`useSettings` uses TanStack Query with 5-min stale time. `usePageFlags` uses raw `useState` +
`useEffect` with `cache: 'no-cache'` + timestamp busting. Inconsistent patterns for similar
data fetching.

### 7.7 MEDIUM: `getSessionAndRole` Duplicated Inline

**Severity: Low (consistency)**

Defined inline in `src/app/api/settings/route.ts:22-42` and
`src/app/api/settings/[key]/route.ts:28-44`. The `contact/route.ts` imports it from `@api/server`.
The inline copies also query the `users` table for the role, while other routes rely on the session
object already containing the role — an extra DB roundtrip.

### 7.8 MEDIUM: Settings Component Too Large

**Severity: Low (maintenance)**

`src/app/settings/page.tsx` is 402 lines with 7 distinct sections (Profile, Language, Property,
Account, Notifications, Privacy) all in one file. The component manages 10+ state variables and
makes inline fetch calls. No separation of container/logic from presentation.

### 7.9 MEDIUM: Inconsistent Setting ID Generation

**Severity: Low**

- tRPC `upsertSetting`: `id = ${tenantId}_${key}` (tenant-prefixed)
- REST `POST /api/settings/`: `id = key.replace(/[^a-zA-Z0-9]/g, '_')` (no tenant prefix)
- REST `PATCH /api/settings/[key]`: `id = ${tenantId}_${key}` (tenant-prefixed)
- `POST /api/settings/contact/`: `id = key.replace(/[^a-zA-Z0-9]/g, '_')` (no tenant prefix)

The ID is the primary key. If the same key is upserted via both tRPC and REST, two different
rows would be created with different IDs but the same `(tenantId, key)` — the unique constraint
prevents this, but the ID divergence is confusing.

### 7.10 MEDIUM: Page Flags `VALID_KEYS` Duplicates `PlatformPageFlags` Keys

**Severity: Low**

`src/app/api/admin/settings/page-flags/route.ts:42-61` hardcodes a `VALID_KEYS` array. This
should derive from `PlatformPageFlags` keys minus the ones not user-settable, or from
`FLAG_DEFS` (see 7.4).

### 7.11 LOW: v1 Wrappers Add Indirection Without Value

**Severity: Low**

Three files in `src/app/api/v1/tenant/settings/` re-export canonical implementations. This is
paper architecture — the routes exist but do nothing unique. Either remove them or wire them to
future tRPC procedures.

### 7.12 LOW: Statsig Experiment Flags are Dead Code

**Severity: Low**

Six experiment flags all hardcoded to `false` with no Statsig adapter wired up. Either ship the
integration or delete the module.

---

## 8. Missing Tests

| File                                                           | Has Tests?                                 |
| -------------------------------------------------------------- | ------------------------------------------ |
| `src/app/api/settings/route.ts`                                | Yes (`__tests__/settings.test.ts`)         |
| `src/app/api/settings/[key]/route.ts`                          | **No**                                     |
| `src/app/api/settings/contact/route.ts`                        | Yes (`__tests__/settings-contact.test.ts`) |
| `src/app/api/admin/settings/page-flags/route.ts`               | Yes (`__tests__/page-flags.test.ts`)       |
| `src/app/api/admin/services-config/route.ts`                   | Yes (`__tests__/services-config.test.ts`)  |
| `src/app/api/admin/tenant/provider-registration-mode/route.ts` | **No**                                     |
| `src/app/api/v1/tenant/settings/route.ts`                      | **No**                                     |
| `src/server/routers/settings.ts`                               | **No unit test**                           |
| `src/shared/lib/settings/validation.ts`                        | **No**                                     |
| `src/shared/lib/settings/types.ts`                             | **No**                                     |
| `src/shared/lib/hooks/useSettings.ts`                          | **No**                                     |
| `src/shared/lib/hooks/usePageFlags.ts`                         | **No**                                     |
| `src/widgets/admin/ui/PageSettingsWidget.tsx`                  | **No**                                     |
| `src/app/settings/page.tsx`                                    | **No**                                     |

---

## 9. FSD (Feature-Sliced Design) Compliance Notes

The settings architecture spans three FSD layers:

| Layer              | Files                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `shared/`          | Types, validation, defaults, hooks, revalidation, provider registration schema                      |
| `entities/tenant/` | `SETTINGS_KEYS`, `platform-flags.ts`, `services-config.ts`, `provider-registration-mode.ts`, schema |
| `app/`             | REST routes, settings page                                                                          |
| `widgets/`         | `PageSettingsWidget`                                                                                |
| `server/`          | tRPC `settingsRouter`                                                                               |

No clear FSD violations detected in the import graph (all imports flow downward or lateral
within `entities`). However, the boundary between `shared/lib/settings` and
`entities/tenant/api/flags` is fuzzy — both define defaults, types, and validation for the
same domain objects.

---

## 10. Recommended Improvements (Priority-Ordered)

### Immediate (fix bugs)

1. ✅ **Add missing admin check** to `POST /api/settings/contact/` — fixed in `soralia-village-71gn`
2. ✅ **Add `revalidateAdminChanges()` or `revalidateTag(CACHE_TAGS.SETTINGS)`** to all REST mutation endpoints — fixed in `soralia-village-71gn`
3. ✅ **Add `writeAuditLog`** to `POST /api/settings/contact/` — fixed in `soralia-village-71gn`

### Short-term (reduce debt)

4. **Extract the switch statement** in `platform-flags.ts` into a data-driven design (see 7.4).
5. **Add missing validators** for `page_education_enabled`, `page_dwallet_enabled`, `page_disputes_enabled`, `page_providers_enabled`, `page_marketplace_paypal_enabled`, `translation_provider`, `translation_api_key` in `validation.ts`.
6. **Fill missing keys** in `SettingValueMap` in `types.ts`.
7. **Add proper DB WHERE clauses** in `services-config.ts` and `provider-registration-mode.ts` instead of filtering all rows in JS.
8. **Unify `getSessionAndRole`** — use the shared import consistently.
9. **Convert `usePageFlags`** to TanStack Query for consistency with `useSettings`.

### Medium-term (architecture)

10. **Unify the REST and tRPC settings surfaces** — either migrate REST routes to tRPC (as the
    v1 wrapper comments suggest) or consolidate into one pattern. Currently mutations exist in
    both places with different guarantees.
11. **Split `src/app/settings/page.tsx`** into section components (ProfileSection,
    NotificationSection, PrivacySection, etc.).
12. **Remove or implement the v1 wrappers** — don't leave placeholder code in the repo.
13. **Add `rateLimitByUser`** to `provider-registration-mode` PATCH (all other write endpoints
    have it).

### Long-term (design)

14. **Consider merging `PlatformPageFlags`, `SettingValueMap`, `SETTINGS_KEYS`, and `validation.ts`**
    into a single source of truth. Generate types, validators, defaults, and the switch statement
    from a single data definition.
15. **Add integration tests** that verify end-to-end: REST mutation → cache invalidation →
    ISR re-render.
