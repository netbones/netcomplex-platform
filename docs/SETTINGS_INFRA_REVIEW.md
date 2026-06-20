# Settings Infrastructure Review

**Date:** 2026-06-20
**Scope:** Admin and User settings infrastructure across the Netcomplex / Soralia Village platform
**Reviewer:** Claude (OpenCode)
**Status:** 🟡 9/16 issues resolved — critical + high priority complete, P3 rate limiting, audit, batch update done, remaining are low-priority enhancements

---

## Executive Summary

The platform's settings infrastructure operates on a **simple key-value string store** (`Setting` table) which is flexible but has led to **scattered defaults, duplicated logic, no schema validation, and inconsistent UI patterns** across admin and user settings. There is **no unified settings service** — each feature (page flags, services config, user preferences, interest categories) implements its own read/write logic with varying quality.

**Bottom line:** It works for the current scale, but the gaps below will compound as the platform grows.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────┐
│  Database Layer                         │
│  Setting { id, tenantId, key, value }   │
│  ─ All values stored as strings         │
│  ─ JSON configs serialized manually     │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│  API Routes (inconsistent patterns)    │
│  ─ /api/settings (generic CRUD)        │
│  ─ /api/admin/settings/page-flags       │
│  ─ /api/admin/services-config           │
│  ─ /api/users/[id] (user prefs mixed in) │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│  Client Layer (no shared abstraction)   │
│  ─ Direct fetch calls everywhere        │
│  ─ Manual state management per page     │
│  ─ No settings provider / context       │
└─────────────────────────────────────────┘
```

---

## 2. Database Schema: Too Simple for the Complexity

### 2.1 The `Setting` Model

**Location:** `prisma/schema.prisma` (line 522–529), `src/db/schema/settings.ts`

```prisma
model Setting {
  id       String @id
  tenantId String
  key      String
  value    String

  @@unique([tenantId, key])
}
```

ia-village
**Issues:**

| #   | Issue                                                                                                   | Risk                                                     |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | **All values are strings** — booleans, arrays, and complex objects are serialized/deserialized manually | Type safety violations, runtime errors on malformed JSON |
| 2   | **`value` column is unbounded** — no length limit on `String`                                           | Potential for abuse (store multi-MB blobs)               |
| 3   | **No `createdAt` / `updatedAt` timestamps**                                                             | ~~No audit trail~~ **FIXED (2026-06-20)**                |
| 4   | **No `updatedBy` or `version` field**                                                                   | No accountability for tenant config changes              |
| 5   | **No `description` or `category` metadata**                                                             | Hard to document what each key does                      |
| 6   | **IDs are manually generated** (`id: text('id').primaryKey()`) — not auto-increment or UUID by default  | Risk of collisions in some write paths                   |

### 2.2 Contrast: `TenantModule` Model

The `TenantModule` table (lines 26–38) has a richer schema with `config Json?`, `enabledAt`, and proper relations. **The `Setting` table should aspire to this level of structure.**

---

## 3. API Layer: Inconsistent Patterns & Quality Gaps

### 3.1 Three Different CRUD Patterns for Settings

| Route                                     | Pattern              | Auth Check                        | Validation                           | Tenant Isolation | Quality   |
| ----------------------------------------- | -------------------- | --------------------------------- | ------------------------------------ | ---------------- | --------- |
| `/api/settings/route.ts`                  | Generic GET/POST     | `hasPermission(role, 'settings')` | ❌ None                              | ✅ Yes           | ⚠️ Medium |
| `/api/settings/[key]/route.ts`            | GET/PATCH per key    | `hasPermission(role, 'admin')`    | ❌ None (value required only)        | ✅ Yes           | ⚠️ Medium |
| `/api/admin/settings/page-flags/route.ts` | GET/POST for flags   | `isAdmin(role)` + `getRLSContext` | ✅ Key whitelist                     | ✅ Yes (RLS)     | ✅ Good   |
| `/api/admin/services-config/route.ts`     | GET/PUT for services | `isAdmin(role)` + `getRLSContext` | ❌ None (spreads body into defaults) | ✅ Yes (RLS)     | ⚠️ Medium |

**Key Problems:**

1. **~~Inconsistent permission checks:~~** ~~`hasPermission(role, 'settings')` vs `hasPermission(role, 'admin')` vs `isAdmin(role)`~~ **FIXED (2026-06-20)** — All 4 settings endpoints now use `hasPermission(role, 'admin')`.
2. **`/api/settings/route.ts` POST does not enforce tenant isolation on the lookup** — line 74 queries by `key` only, not `tenantId + TenantId`:
   ```ts
   const existing = await db.select().from(settings).where(eq(settings.key, body.key)).limit(1);
   // Missing: and(eq(settings.tenantId, tenantId))
   ```
   **Risk:** ~~Cross-tenant setting overwrites in multi-tenant mode.~~ **FIXED (2026-06-20)**
3. **`/api/settings/[key]/route.ts` PATCH serializes all values to strings unconditionally** (line 99): `const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);` — no validation that the value is valid for the key.
4. **`/api/admin/services-config/route.ts` PUT blindly spreads user input over defaults** (line 48): `const config: ServicesPageConfig = { ...defaults, ...body };` — ~~no schema validation.~~ **FIXED (2026-06-20)** — Added Zod `servicesConfigSchema` validation via `servicesConfigSchema.partial().safeParse()`.

### 3.2 Missing API Patterns

- ~~❌ **No batch update endpoint**~~ — ~~updating 14 page flags requires 14 separate API calls.~~ **FIXED (2026-06-20)** — Added PUT handler to `page-flags/route.ts` accepting `Record<string, unknown>`.
- ~~❌ **No settings history/audit endpoint**~~ — ~~who changed what and when?~~ **FIXED (2026-06-20)** — Added `writeAuditLog('SETTINGS_CHANGED', ...)` to all settings mutation endpoints.
- ❌ **No settings export/import** — hard to migrate tenant configurations.
- ❌ **No schema validation library used** (Zod, Yup, Joi) — despite the project listing `zod` as a dependency for forms.
- ~~❌ **No rate limiting on settings mutations**~~ — ~~rapid toggling could DDoS the DB.~~ **FIXED (2026-06-20)** — Added `rateLimitByUser` (10 mutations/min) to all 4 settings endpoints.

---

## 4. Client Layer: No Shared Abstraction

### 4.1 Settings Page (`/settings`) ~~**FIXED triple-fetch (2026-06-20)**~~

**Location:** `src/app/settings/page.tsx`

| Aspect                 | Observation                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **State management**   | 8 `useState` hooks for different settings fields (language, email visibility, phone visibility, avatar, household image, etc.)         |
| **Data fetching**      | ~~3 separate `fetch()` calls to `/api/users/${session.user.id}`~~ **FIXED (2026-06-20)** — consolidated to single `fetchAllUserData()` |
| **Saving**             | Per-section save buttons, no global "Save All"                                                                                         |
| **Optimistic updates** | ❌ None — UI waits for API response                                                                                                    |
| **Error handling**     | `try/catch` with generic `toast.error()` — no per-field error display                                                                  |

**~~Code smell (lines 42–101):~~** ~~**FIXED** — replaced with single `fetchAllUserData()` call.~~

### 4.2 Admin System Page (`/admin/system`)

**Location:** `src/app/(tenant)/admin/system/page.tsx`

- ✅ Uses `PageSettingsWidget` for feature flags — good encapsulation
- ⚠️ **No loading state for `PageSettingsWidget`** — the widget fetches its own data, but the parent doesn't reflect loading state
- ⚠️ **Activity feed fetches on every mount** — no caching or deduplication

### 4.3 Admin Services Page (`/admin/services`)

**Location:** `src/app/(tenant)/admin/services/page.tsx`

| Aspect                | Observation                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| **State**             | Entire `ServicesPageConfig` object in one `useState`                          |
| **Mutations**         | Multiple `useCallback` updaters (`updateCategories`, `updateEmergency`, etc.) |
| **Save**              | Single "Save Changes" button — good                                           |
| **No undo**           | ❌ No "Revert changes" or "Cancel" after editing                              |
| **No dirty tracking** | Save button is always enabled, even with no changes                           |
| **No confirmation**   | Accidentally hitting Save applies all changes immediately                     |

### 4.4 PageSettings Widget

**Location:** `src/widgets/admin/ui/PageSettingsWidget.tsx`

- ✅ **Good pattern:** Whitelist of valid keys, per-key loading states (`savingKeys` Set)
- ✅ Dispatches `page-flags-updated` event for cross-component communication
- ⚠️ **No debouncing** — rapid toggle clicking fires multiple concurrent API calls
- ⚠️ **No optimistic UI** — toggle waits for full round-trip before updating

---

## 5. Security Findings

### 5.1 SQL Injection Risk (Low-Moderate)

**Location:** `/api/settings/route.ts` line 85

```ts
const newId = body.key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
```

- The `replace` sanitization is basic but acceptable for ID generation.
- **However:** No length limit on `body.key` — could generate extremely long IDs.

### 5.2 ~~XSS via Unescaped Setting Values~~ **FIXED (2026-06-20)**

~~**Location:** `src/app/settings/page.tsx`~~ — Added `isSafeImageUrl()` helper that validates URLs with `new URL()` and protocol whitelist (`https:`, `http:`). Applied to `userAvatar` and `householdImage` rendering.

### 5.3 Missing Input Validation on Settings Values

- `/api/settings/[key]/route.ts` accepts **any string** for any setting key.
- A malicious admin could set `page_campaign_enabled` to `"false"` (string) instead of `"true"` — the boolean check is `=== 'true'`, so `"false"` evaluates to `false`. This is actually safe, but `"maybe"` would also evaluate to `false`, which is confusing.
- **No type coercion or validation** before storing.

### 5.4 Authorization Inconsistency

| Endpoint                         | Required Role                     |
| -------------------------------- | --------------------------------- |
| `/api/settings` (generic)        | `hasPermission(role, 'settings')` |
| `/api/settings/[key]`            | `hasPermission(role, 'admin')`    |
| `/api/admin/settings/page-flags` | `isAdmin(role)`                   |
| `/api/admin/services-config`     | `isAdmin(role)`                   |

**Problem:** The same user with `BOARD` role (has `settings` permission but maybe not `admin`) can update some settings but not others. **This is likely a bug** — the generic settings API uses `settings` permission, but the specific admin UIs require `admin`.

### 5.5 AssistSession Scope Guard

**Location:** `/api/settings/[key]/route.ts` lines 87–89

```ts
const scopeError = await requireAssistScope(request, 'full');
if (scopeError) return scopeError;
```

- ✅ Good: Prevents metadata-scoped staff from modifying settings
- ⚠️ **Inconsistent:** Not applied to `/api/settings/route.ts` (the generic endpoint)

---

## 6. Data Consistency & Defaults

### 6.1 ~~Scattered Default Values~~ **FIXED (2026-06-20)**

Defaults centralized in `src/shared/lib/settings/defaults.ts`. Both `platform-flags.ts` and `PageSettingsWidget.tsx` now import from the single source.

### 6.2 Services Page Config Defaults

**Location:** `src/entities/tenant/api/flags/services-config.ts`

- Defaults are computed from imported constants (`defaultServiceCategories`, `emergencyContacts`, etc.)
- `getServicesConfig` does `{ ...defaultServicesConfig(), ...parsed }` — meaning **user config can only override, not remove default entries**
- No mechanism to explicitly disable a default category

### 6.3 No Settings Migration Strategy

- When a new feature flag is added, it defaults to `true` (enabled) in most places.
- **No mechanism to roll out new features as "opt-in"** for existing tenants.
- No versioning of settings schema.

---

## 7. Multi-Tenant Isolation

### 7.1 Tenant Isolation in Settings API

| Endpoint                         | Tenant Isolation                                      | Notes                                          |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `/api/settings/route.ts`         | ✅ `where(eq(settings.tenantId, tenantId))`           | But lookup on POST (line 74) misses `tenantId` |
| `/api/settings/[key]/route.ts`   | ✅ `where(and(eq(settings.tenantId, tenantId), ...))` | Correct for GET and PATCH                      |
| `/api/admin/settings/page-flags` | ✅ `runWithRLS` + `ctx.tenantId`                      | Best pattern                                   |
| `/api/admin/services-config`     | ✅ `runWithRLS` + `ctx.tenantId`                      | Best pattern                                   |

### 7.2 RLS (Row-Level Security)

- The newer admin endpoints (`page-flags`, `services-config`) use `runWithRLS()` — excellent.
- The generic settings endpoints do **not** use RLS — they rely on application-level filtering.
- **Recommendation:** Migrate all settings endpoints to RLS for defense in depth.

---

## 8. Performance Concerns

### 8.1 N+1 Queries

**Location:** `src/app/settings/page.tsx`

```ts
// THREE separate fetches to the same endpoint
fetch(`/api/users/${session.user.id}`); // fetchUserSettings
fetch(`/api/users/${session.user.id}`); // fetchUserHousehold
fetch(`/api/users/${session.user.id}`); // fetchUserProfile
```

**Impact:** Triples the database load for the settings page.

### 8.2 Full Table Scans for Settings

**Location:** `src/entities/tenant/api/flags/platform-flags.ts` line 37

```ts
const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
```

- Fetches **all** settings for a tenant, then filters in JavaScript.
- With 20+ settings, this is negligible. With 1000+, it becomes a problem.
- **Missing index:** The `@@unique([tenantId, key])` constraint creates an implicit index, but there's no index on `tenantId` alone for this query pattern.

### 8.3 ~~No Client-Side Caching~~ **FIXED (2026-06-20)**

~~- `usePageFlags()` hook (if it exists) likely fetches fresh data on every mount.~~

- `getPlatformPageFlags` now uses `unstable_cache` with 5-min revalidation and `CACHE_TAGS.SETTINGS` ISR tag.
- Settings page user data now uses TanStack Query `useQuery` with 5-min `staleTime`.

---

## 9. Testing & Observability

### 9.1 Test Coverage

| Component            | Tests? | Notes                               |
| -------------------- | ------ | ----------------------------------- |
| `platform-flags.ts`  | ✅ Yes | `platform-flags.test.ts` exists     |
| `services-config.ts` | ❌ No  | No test file found                  |
| `/api/settings/*`    | ❌ No  | No dedicated API tests for settings |
| `PageSettingsWidget` | ❌ No  | No UI tests                         |
| `settings/page.tsx`  | ❌ No  | No UI tests                         |

### 9.2 ~~Logging~~ **IMPROVED (2026-06-20)**

- ✅ All settings mutations now log via `writeAuditLog('SETTINGS_CHANGED', ...)` with `{ audit: true, action, actorId, tenantId, details }` — structured audit trail now captured in Pino logger.

---

## 10. Recommendations

### 10.1 Critical (Fix First)

| #     | Issue                                                       | Action                                                 | Effort      |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------ | ----------- |
| ~~1~~ | ~~**Cross-tenant setting overwrites**~~                     | ~~Add `tenantId` to the `existing` lookup query~~      | ~~✅ Done~~ |
| ~~2~~ | ~~**Inconsistent permission checks**~~                      | ~~Standardize on `hasPermission(role, 'admin')`~~      | ~~✅ Done~~ |
| ~~3~~ | ~~**No input validation** on `/api/admin/services-config`~~ | ~~Add Zod schema validation for `ServicesPageConfig`~~ | ~~✅ Done~~ |
| ~~4~~ | ~~**XSS via avatar URL**~~                                  | ~~Validate `avatar` / `image` URLs before rendering~~  | ~~✅ Done~~ |

### 10.2 High Priority

| #     | Issue                                           | Action                                                                   | Effort      |
| ----- | ----------------------------------------------- | ------------------------------------------------------------------------ | ----------- |
| ~~5~~ | ~~**No shared settings abstraction**~~          | ~~Create `useSettings()` hook in `src/shared/lib/hooks/useSettings.ts`~~ | ~~✅ Done~~ |
| ~~6~~ | ~~**Tripled network load on Settings page**~~   | ~~Consolidate to single `fetch()` call~~                                 | ~~✅ Done~~ |
| ~~7~~ | ~~**No schema validation on settings values**~~ | ~~Implement per-key validation using Zod schemas~~                       | ~~✅ Done~~ |
| 8     | ~~**No client-side caching**~~                  | ~~Add TanStack Query `useQuery` + `unstable_cache`~~                     | ~~✅ Done~~ |
| ~~9~~ | ~~**Scattered default values**~~                | ~~Centralize all defaults in `src/shared/lib/settings/defaults.ts`~~     | ~~✅ Done~~ |

### 10.3 Medium Priority

| #      | Issue                                                    | Action                                                                                | Effort      |
| ------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| ~~10~~ | ~~**Missing `createdAt`/`updatedAt` in Setting table**~~ | ~~Add timestamp fields via migration~~                                                | ~~✅ Done~~ |
| ~~11~~ | ~~**No settings history/audit**~~                        | ~~Add structured `writeAuditLog('SETTINGS_CHANGED', ...)` to all mutation endpoints~~ | ~~✅ Done~~ |
| 12     | **String-only values**                                   | Consider adding a `type` column (string, number, boolean, json) or migrate to JSONB   | 2 hrs       |
| ~~13~~ | ~~**No rate limiting**~~                                 | ~~Add rate limiting to settings mutation endpoints~~                                  | ~~✅ Done~~ |
| ~~14~~ | ~~**No batch update**~~                                  | ~~Add batch PUT endpoint for page flags (reduce 14 calls to 1)~~                      | ~~✅ Done~~ |

### 10.4 Low Priority / Future

| #      | Issue                           | Action                                                                                | Effort      |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| 15     | **Settings versioning**         | Add `version` or `schemaVersion` to settings for migration support                    | 4 hrs       |
| 16     | **Settings export/import**      | Build admin UI for exporting/importing tenant settings (JSON)                         | 4 hrs       |
| ~~17~~ | ~~**Type-safe settings keys**~~ | ~~Add `SettingValueMap` + `getTypedSetting()` in `src/shared/lib/settings/types.ts`~~ | ~~✅ Done~~ |

---

## 11. Positive Findings

| #   | Finding                               | Location                                                                     |
| --- | ------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | **RLS used in newer admin endpoints** | `/ periphery: `/api/admin/settings/page-flags`, `/api/admin/services-config` |
| 2   | **Component-level logging**           | All settings modules use `createComponentLogger`                             |
| 3   | **AssistSession scope guard**         | Prevents metadata-scoped staff from modifying settings                       |
| 4   | **Default fallback pattern**          | `getPlatformPageFlags` returns defaults if no DB rows — graceful degradation |
| 5   | **PageSettingsWidget encapsulation**  | Feature flag UI is well-isolated in a reusable widget                        |
| 6   | **Tenant isolation**                  | All endpoints (post-fix) filter by `tenantId`                                |

---

## 12. Appendix: Settings Keys Inventory

### 12.1 Feature Flags (Page Visibility)

| Key                              | Type     | Default                                         | Used By                    |
| -------------------------------- | -------- | ----------------------------------------------- | -------------------------- |
| `page_campaign_enabled`          | boolean  | `true`                                          | Navigation, pages          |
| `page_conservation_mode`         | enum     | `"default"`                                     | Conservation page          |
| `page_conservation_external_url` | string   | `""`                                            | Conservation page (iframe) |
| `page_chat_enabled`              | boolean  | `true`                                          | Chat feature               |
| `page_news_enabled`              | boolean  | `true`                                          | News page                  |
| `page_events_enabled`            | boolean  | `true`                                          | Events page                |
| `page_directory_enabled`         | boolean  | `true`                                          | Directory page             |
| `page_groups_enabled`            | boolean  | `true`                                          | Groups page                |
| `page_services_enabled`          | boolean  | `true`                                          | Services page              |
| `page_resources_enabled`         | boolean  | `true`                                          | Resources page             |
| `page_maintenance_enabled`       | boolean  | `true` Maintenance page                         |
| `page_surveys_enabled`           | boolean  | `true`                                          | Surveys page               |
| `page_competitions_enabled`      | boolean  | `true`                                          | Competitions page          |
| `page_dashboard_enabled`         | boolean  | `true`                                          | Dashboard page             |
| `page_bookings_enabled`          | boolean  | `true`                                          | Bookings page              |
| `page_messages_enabled`          | boolean  | `true`                                          | Messages page              |
| `header_links`                   | string[] | `["directory","groups","services","resources"]` | Navigation                 |
| `custom_pages`                   | JSON     | `[]`                                            | Dynamic pages              |
| `custom_nav`                     | JSON     | `[]`                                            | Custom navigation          |
| `services_config`                | JSON     | (complex object)                                | Services page content      |

### 12.2 User Settings (Stored in User table)

| Field              | Type    | Used By          |
| ------------------ | ------- | ---------------- |
| `showEmail`        | boolean | Privacy settings |
| `showPhone`        | boolean | Privacy settings |
| `language`         | string  | i18n             |
| `avatar` / `image` | string  | Profile display  |

### 12.3 Admin-Only Settings

| Key                   | Type            | Used By             |
| --------------------- | --------------- | ------------------- |
| `interest_categories` | string[] (JSON) | Group categories    |
| `services_config`     | JSON            | Admin services page |

---

_End of review._
