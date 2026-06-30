# REST/tRPC Settings Surface Assessment

**Date:** 2026-06-30
**Phase:** 121 Plan 03

## 1. Current State

The settings system is served through two parallel API surfaces:

### tRPC Router (`src/server/routers/settings.ts`)

| Procedure            | Type     | Access                                   | Audit Log        | Revalidation               | Rate Limit | AssistScope |
| -------------------- | -------- | ---------------------------------------- | ---------------- | -------------------------- | ---------- | ----------- |
| `listSettings`       | query    | tenantProcedure                          | N/A              | No                         | No         | No          |
| `getSetting`         | query    | tenantProcedure                          | N/A              | No                         | No         | No          |
| `upsertSetting`      | mutation | privilegedProcedure + inline admin check | SETTINGS_CHANGED | `revalidateAdminChanges()` | No         | No          |
| `deleteSetting`      | mutation | privilegedProcedure + inline admin check | SETTINGS_CHANGED | `revalidateAdminChanges()` | No         | No          |
| `getContactSettings` | query    | privilegedProcedure + inline admin check | N/A              | No                         | No         | No          |

### REST Routes

| Endpoint                                        | Method | Access                                       | Audit Log                          | Revalidation                                                        | Rate Limit | AssistScope                  |
| ----------------------------------------------- | ------ | -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- | ---------- | ---------------------------- |
| `/api/settings/`                                | GET    | `hasPermission(role, 'admin')`               | N/A                                | N/A                                                                 | No         | No                           |
| `/api/settings/`                                | POST   | `hasPermission(role, 'admin')` + AssistScope | SETTINGS_CHANGED                   | `revalidateAdminChanges()`                                          | 10/min     | `requireAssistScope('full')` |
| `/api/settings/[key]`                           | GET    | Public (no auth required)                    | N/A                                | N/A                                                                 | No         | No                           |
| `/api/settings/[key]`                           | PATCH  | `hasPermission(role, 'admin')` + AssistScope | SETTINGS_CHANGED                   | `revalidateAdminChanges()`                                          | 10/min     | `requireAssistScope('full')` |
| `/api/settings/contact/`                        | GET    | Auth required (no role check)                | N/A                                | N/A                                                                 | No         | No                           |
| `/api/settings/contact/`                        | POST   | `hasPermission(role, 'admin')`               | SETTINGS_CHANGED                   | `revalidateAdminChanges()`                                          | No         | No                           |
| `/api/admin/settings/page-flags/`               | GET    | Auth + RLS                                   | N/A                                | N/A                                                                 | No         | No                           |
| `/api/admin/settings/page-flags/`               | POST   | `hasPermission(role, 'admin')` + RLS         | SETTINGS_CHANGED                   | `revalidateTag(SETTINGS)`                                           | 10/min     | No                           |
| `/api/admin/settings/page-flags/`               | PUT    | `hasPermission(role, 'admin')` + RLS         | SETTINGS_CHANGED (per change)      | `revalidateTag(SETTINGS)`                                           | 10/min     | No                           |
| `/api/admin/services-config/`                   | GET    | Auth + RLS                                   | N/A                                | N/A                                                                 | No         | No                           |
| `/api/admin/services-config/`                   | PUT    | `hasPermission(role, 'admin')` + RLS         | SETTINGS_CHANGED                   | `revalidateTag(SETTINGS)`                                           | 10/min     | No                           |
| `/api/admin/tenant/provider-registration-mode/` | GET    | `canManageMode(ADMIN\|BOARD)`                | N/A                                | N/A                                                                 | No         | No                           |
| `/api/admin/tenant/provider-registration-mode/` | PATCH  | `canManageMode(ADMIN\|BOARD)`                | PROVIDER_REGISTRATION_MODE_CHANGED | `revalidateTag(SETTINGS)` + `revalidatePath('/providers/register')` | 10/min     | No                           |

## 2. Classification

### Canonical on tRPC (no REST equivalent)

- `listSettings` — list all settings for tenant
- `deleteSetting` — soft-delete a setting

### Canonical on REST (no tRPC equivalent)

- `GET /api/settings/[key]` — public read (no auth)
- `GET /api/settings/contact/` — authenticated read (no admin check)
- Page-flags GET/POST/PUT — specialized admin only
- Services-config GET/PUT — specialized admin only
- Provider-registration-mode GET/PATCH — specialized admin/board only

### Duplicated (both surfaces exist)

- **upsert**: tRPC `upsertSetting` vs REST `POST /api/settings/` + `PATCH /api/settings/[key]`
- **get single**: tRPC `getSetting` vs REST `GET /api/settings?key=X` + `GET /api/settings/[key]`
- **contact settings get**: tRPC `getContactSettings` vs REST `GET /api/settings/contact/`

## 3. Gaps Between Surfaces

| Gap                            | tRPC                                 | REST                                                                |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------- |
| Rate limiting on mutations     | Missing                              | Present (POST/PATCH)                                                |
| AssistScope guard on mutations | Missing                              | Present (`requireAssistScope('full')`)                              |
| Public read access             | No (all tenant/privileged)           | Yes (`GET /api/settings/[key]`)                                     |
| RLS (app_user role)            | Not implemented                      | Present (page-flags, services-config)                               |
| ISR cache invalidation         | Via `revalidateAdminChanges()` only  | Via both `revalidateAdminChanges()` and `revalidateTag(SETTINGS)`   |
| OpenAPI generation             | Yes (via tRPC `meta.openapi`)        | No                                                                  |
| Soft-delete support            | Yes (`deleteSetting`)                | No REST equivalent                                                  |
| Consumer surface               | Internal tRPC callers + OpenAPI docs | Admin UI (PageSettingsWidget, provider settings page), public reads |

## 4. Recommendation

**Consolidate on REST as canonical surface.**

Reasons:

1. **Page-flags, services-config, and provider-registration-mode are REST-only** — these are the most actively used admin settings features with no tRPC equivalent. Moving them to tRPC would be a larger migration than moving the 3 duplicated tRPC operations to REST.
2. **REST endpoints have richer guarantees** — rate limiting, AssistScope guards, and tag-based ISR revalidation are only in REST. tRPC lacks all three.
3. **Admin UI already calls REST directly** — PageSettingsWidget, provider settings page, and flags consumer all hit REST endpoints. No admin UI component uses tRPC for settings.
4. **tRPC settings router has minimal consumers** — outbound OpenAPI generation (metadata only) and potentially internal tRPC callers. No frontend components use it.
5. **Public read endpoints are REST-only** — `GET /api/settings/[key]` requires no auth. tRPC has no equivalent.

### Migration Roadmap

#### Phase A — Feature Parity (1 day)

1. Add `deleteSetting` REST endpoint (`DELETE /api/settings/[key]`) to match tRPC
2. Add `listSettings` REST endpoint (`GET /api/settings/`) — already exists
3. Add rate limiting to tRPC `upsertSetting` and `deleteSetting` (10/min)
4. Verify both surfaces have equivalent guarantees before deprecation

#### Phase B — Deprecate tRPC (1 day)

1. Mark all 5 tRPC procedures with `@deprecated` JSDoc
2. Add migration comments pointing to REST equivalents:
   - `upsertSetting` → `POST /api/settings/` or `PATCH /api/settings/[key]`
   - `getSetting` → `GET /api/settings?key=X` or `GET /api/settings/[key]`
   - `listSettings` → `GET /api/settings/`
   - `deleteSetting` → `DELETE /api/settings/[key]`
   - `getContactSettings` → `GET /api/settings/contact/`
3. Remove OpenAPI metadata from deprecated procedures (or point to REST docs)

#### Phase C — Remove tRPC (1 day, future milestone)

1. Identify and migrate any remaining tRPC callers
2. Remove `src/server/routers/settings.ts`
3. Unregister from tRPC app router

### Effort Estimate

- Phase A: 2-3 hours
- Phase B: 1-2 hours
- Phase C: 1-2 hours (after verifying no consumers)
- **Total: ~5 hours**

### Decision

- **Recommend REST canonical, tRPC deprecated.**
- **Defer to follow-up BD issue.** Phase 121 includes only this assessment.
- **Create BD issue tracking Phase A execution.**
