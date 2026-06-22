# COMMUNIQUE — Better Auth Admin Plugin & User Impersonation

**To:** Architecture Advisors  
**Date:** 2026-06-22  
**Status:** Decision Required

---

## 1. What We Want

Enable Better Auth's **admin plugin** to support **user impersonation** — the ability for an administrator to sign in as another user for debugging, support, and testing purposes. This is needed specifically to:

- Test the Phase 46 Provider Platform from a resident's perspective (John Smith as VoltSafe Electrical)
- Debug user-reported issues by seeing exactly what they see
- Validate feature flag gating and role-based UI visibility

## 2. Current State

The admin plugin is **half-installed**:

| Side      | Status                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| Client    | `adminClient()` in `auth-client.ts` — present but non-functional                 |
| Server    | `admin()` in `auth.ts` — **missing**                                             |
| DB schema | `banned`/`banReason`/`banExpires` on `user` ✅, `impersonatedBy` on `session` ✅ |

The client plugin was added early, likely from a template or copy-paste. The server plugin was never configured, so the admin API routes don't exist.

## 3. Why It's Not Simple

### 3.1 Role Column Conflict

Better Auth's admin plugin uses a **built-in `role` TEXT column** with two values:

```
"user"  — default for all new users
"admin" — grants admin privileges
```

This project has a **custom Role enum column** as an `additionalField`:

```
RESIDENT  — default
BOARD     — board members
ADMIN     — community administrators
```

**These are two separate columns** in the same `user` table. Better Auth stores `"user"` in its built-in role field for all users. The custom `ADMIN`/`BOARD` values live in the additional fields JSON or a separate column. The admin plugin checks `user.role === 'admin'` (the built-in field) and never sees the custom values.

### 3.2 Access Control Requirement

The `adminRoles: ['ADMIN', 'BOARD']` config option **fails at startup** because:

> "Admin roles must be defined in the 'roles' configuration."

Better Auth requires custom role names to be registered through its access control system (`createAccessControl` + `ac.newRole()` + `roles` object). This project uses its own `hasPermission()` system (`src/shared/lib/permissions.ts`) — completely separate from Better Auth's access control. Wiring them together means:

- Defining `RESIDENT`, `ADMIN`, `BOARD` in Better Auth's access control
- Passing `ac` + `roles` to both `admin()` and `adminClient()`
- Ensuring the project's permission checks and Better Auth's checks don't conflict

### 3.3 Synthetic User Requirement

Because `requireEmailVerification: true` is configured, every sign-up goes through a synthetic user path. The admin plugin requires `customSyntheticUser` to include its fields (`role`, `banned`, `banReason`, `banExpires`) or the plugin fails to initialize.

## 4. Options

### Option A — `adminUserIds` (Minimal, Recommended)

Whitelist specific admin user IDs. No role unification, no access control setup.

```ts
// auth.ts
admin({
  adminUserIds: ['soralia-user-david-vdm', 'soralia-user-hoa-services'],
});
```

**Pros:** One config line, no schema changes, no migration.  
**Cons:** Admin list is hardcoded. Adding new admins requires code change + deploy. No role-based admin — individual IDs only.

### Option B — Unify Role Systems (Complex)

Migrate the custom Role enum into Better Auth's built-in role field. This means:

1. Change the `role` column from enum to TEXT
2. Map values: `RESIDENT → "user"`, `ADMIN → "admin"`, `BOARD → "admin"`
3. Update all code that checks `role === 'ADMIN'` or uses the custom `hasPermission()`
4. Register roles in Better Auth's access control
5. Configure `adminRoles: ['admin']` (now matching)

**Pros:** Clean separation, Better Auth native role system, `adminRoles` works naturally.  
**Cons:** Touches every role check in the codebase. High risk of regressions. Migration is irreversible without backup.

### Option C — Custom Impersonation Endpoint (Bespoke)

Don't use Better Auth's admin plugin at all. Write a custom API endpoint that creates sessions directly.

**Pros:** Full control, no dependency on Better Auth internals.  
**Cons:** Reinventing the wheel. Session management code is security-critical. Maintenance burden.

## 5. Recommendation

**Option A** for immediate needs. It unblocks testing now. File a follow-up issue for Option B as architectural debt — the dual role system is technical debt regardless of the admin plugin decision.

Implementation checklist for Option A:

- [ ] Add `admin()` to server plugins in `auth.ts` with `adminUserIds`
- [ ] Add `customSyntheticUser` to `emailAndPassword` config
- [ ] Verify `banned`/`banReason`/`banExpires` columns exist in DB
- [ ] Verify `impersonatedBy` exists on session table (already confirmed)
- [ ] Test impersonation: admin logs in → `POST /api/auth/admin/impersonate-user`
- [ ] Test stop: `POST /api/auth/admin/stop-impersonating`

## 6. Related

- ADR-002: Better Auth selection (no admin plugin exclusion)
- Phase 46 Provider Platform — triggers this need
- `src/shared/api/auth.ts` — server config
- `src/shared/api/auth-client.ts` — client config
- `src/shared/lib/permissions.ts` — project's permission system
