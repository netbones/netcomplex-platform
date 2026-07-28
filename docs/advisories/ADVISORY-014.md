# ADVISORY-014: Better Auth Admin Plugin & User Impersonation

**Status:** Phase 1 — Agent Ready | Phase 2 — Gated on DavDev Approval  
**Date:** 2026-06-23  
**Supersedes:** COMMUNIQUE (2026-06-22)  
**Related:** ADR-002 (Better Auth), ADVISORY-011 (connection pooling)

---

## 1. Problem Statement

Better Auth's admin plugin is half-installed: the `adminClient()` plugin exists in
`auth-client.ts` but the `admin()` server plugin was never added to `auth.ts`. As a
result, admin API routes (`/api/auth/admin/*`) do not exist and user impersonation is
non-functional.

Impersonation is required immediately to test Phase 46 Provider Platform features from
a resident's perspective (e.g. sign in as John Smith / VoltSafe Electrical).

---

## 2. Root Cause Analysis

### 2.1 The Dual Role System

The project has two role fields that exist for completely different purposes:

| Field              | Location | Values                          | Owner       | Purpose                                  |
| ------------------ | -------- | ------------------------------- | ----------- | ---------------------------------------- |
| `user.role`        | DB enum  | `RESIDENT`, `BOARD`, `ADMIN`, … | Application | Business logic, `hasPermission()` checks |
| Better Auth `role` | DB text  | `"user"`, `"admin"`             | Better Auth | Admin plugin access gate only            |

These are **separate domains**. The COMMUNIQUE correctly identified the tension but
framed Option B as requiring a full migration of the enum. That is not necessary.
Better Auth's built-in role field only gates access to its own admin API surface —
it does not need to replace or subsume the application's `Role` enum.

### 2.2 Missing DB Fields

The admin plugin requires three fields on the `user` model that are not currently
in the schema:

```
banned        Boolean?   -- whether user is banned from platform
banReason     String?    -- reason for ban
banExpires    DateTime?  -- optional ban expiry
```

`session.impersonatedBy` already exists. ✅  
`user.isPlatformAdmin` already exists and is the **designated source of truth** for
the Phase 2 bridge.

### 2.3 `requireEmailVerification` Conflict

`requireEmailVerification: true` is configured. The admin plugin requires a
`customSyntheticUser` that includes its own fields, or initialization fails.

---

## 3. Architecture: Before / After

### Before (current state)

```
user.role (Role enum)     ←── hasPermission() ──→ business logic
user.isPlatformAdmin      ←── ad hoc checks  ──→ platform admin gates

Better Auth admin plugin:  NOT INSTALLED (server side)
adminClient():             present but non-functional
```

### After Phase 1

```
user.role (Role enum)     ←── hasPermission() ──→ business logic   [unchanged]
user.isPlatformAdmin      ←── ad hoc checks  ──→ platform admin    [unchanged]
user.banned / banReason / banExpires           ──→ new fields

Better Auth admin plugin:  INSTALLED with adminUserIds whitelist
adminClient():             functional
impersonation:             working via /api/auth/admin/*
```

### After Phase 2 (access control bridge)

```
user.role (Role enum)     ←── hasPermission() ──→ business logic   [unchanged]
user.isPlatformAdmin      ──→ hook sync ──→ Better Auth role field  [new sync]
Better Auth role field    ←── admin plugin  ──→ admin API gate      [replaces adminUserIds]

adminUserIds:              removed
```

---

## 4. Options Considered

### Option A — `adminUserIds` Whitelist (COMMUNIQUE original)

Hardcoded user IDs. Unblocks immediately but is not maintainable — adding admins
requires code change and deploy. Not production-grade.

### Option B — Full Role Migration (COMMUNIQUE original)

Change `role` enum to TEXT, remap values, update all permission checks.
Unnecessary blast radius. The enum and Better Auth's role field serve different
purposes and do not need to be unified.

### Option C — Custom Impersonation Endpoint (COMMUNIQUE original)

Reinventing session management. Security-critical code. Ruled out.

### Option D — `adminUserIds` Now + `isPlatformAdmin` Bridge Later (THIS ADVISORY)

Phase 1 uses `adminUserIds` to unblock Phase 46 testing immediately. Phase 2
replaces the whitelist with a hook that syncs `isPlatformAdmin → true` to Better
Auth's built-in role field (`"admin"`). No enum migration. No `hasPermission()`
changes. The two role systems remain separate domains connected by a one-way sync.

**Selected: Option D.**

---

## 5. Phase 1 Execution Plan

### Pre-Execution Discovery Checklist

The agent MUST run these checks before making any changes:

```bash
# 1. Confirm banned fields are absent from user model
grep -n "banned\|banReason\|banExpires" prisma/schema.prisma

# 2. Confirm impersonatedBy exists on session
grep -n "impersonatedBy" prisma/schema.prisma

# 3. Confirm isPlatformAdmin exists on user
grep -n "isPlatformAdmin" prisma/schema.prisma

# 4. Confirm current auth.ts server plugin list
grep -n "admin\|plugin" src/shared/api/auth.ts | head -20

# 5. Confirm adminClient presence in auth-client.ts
grep -n "adminClient" src/shared/api/auth-client.ts

# 6. Confirm requireEmailVerification setting
grep -n "requireEmailVerification\|emailVerification" src/shared/api/auth.ts

# 7. Check current Drizzle schema for user table fields
grep -n "banned\|banReason\|banExpires" src/db/schema/users.ts

# 8. Confirm target adminUserIds exist in DB
# Run in psql or Supabase dashboard:
# SELECT id, email, "isPlatformAdmin" FROM "user" WHERE "isPlatformAdmin" = true;
```

**STOP AND ESCALATE** if:

- `impersonatedBy` is NOT on the session model (schema assumption is wrong)
- `auth.ts` already has an `admin()` plugin configured (would create duplicate)
- The `adminUserIds` target users are not present in the database

### Step 1 — Add Missing Fields to Prisma Schema

Add to the `user` model in `prisma/schema.prisma`:

```prisma
model user {
  // ... existing fields ...
  banned        Boolean?
  banReason     String?
  banExpires    DateTime?
  // ... rest of model ...
}
```

### Step 2 — Generate and Migrate

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_better_auth_admin_fields

# Verify Drizzle schema was regenerated
# Check src/db/schema/users.ts for banned/banReason/banExpires
```

**STOP AND ESCALATE** if migration fails due to existing data constraints.

### Step 3 — Configure Server Admin Plugin

In `src/shared/api/auth.ts`, add the `admin()` plugin to the plugins array:

```ts
import { admin } from 'better-auth/plugins';

export const auth = betterAuth({
  // ... existing config ...
  plugins: [
    // ... existing plugins ...
    admin({
      adminUserIds: [
        // GATE G1: DavDev must supply the actual user IDs before execution
        // Run: SELECT id, email FROM "user" WHERE "isPlatformAdmin" = true;
        // Insert the returned IDs here as strings
      ],
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    customSyntheticUser: {
      // Include admin plugin fields in synthetic user
      banned: false,
      banReason: null,
      banExpires: null,
    },
  },
});
```

**GATE G1 — DavDev must provide the adminUserIds array before Step 3 executes.**  
The agent must not infer or guess user IDs. Query the database and present the
results to DavDev for confirmation.

### Step 4 — Verify Client Plugin Alignment

In `src/shared/api/auth-client.ts`, confirm `adminClient()` is already present.
No changes needed to the client if it is already configured. If it is absent,
add it:

```ts
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // ... existing config ...
  plugins: [
    // ... existing plugins ...
    adminClient(),
  ],
});
```

### Step 5 — Functional Verification

```bash
# Start dev server
pnpm dev

# From the admin user's session, test impersonation:
# POST /api/auth/admin/impersonate-user
# Body: { "userId": "<target-user-id>" }
# Expected: 200 with new session token

# Test stop impersonating:
# POST /api/auth/admin/stop-impersonating
# Expected: 200, session reverts to admin user

# Confirm impersonatedBy is populated on the session:
# SELECT token, "userId", "impersonatedBy" FROM session
# WHERE "impersonatedBy" IS NOT NULL LIMIT 5;
```

### Step 6 — Update HOLISTIC.md

Add entry under known risks:

> **ADVISORY-014-P1:** Better Auth admin plugin uses `adminUserIds` whitelist.
> Adding new platform admins requires code change + deploy until Phase 2
> (`isPlatformAdmin` bridge) is implemented. Tracked for resolution.

---

## 6. Phase 2 Design (Gated — Do Not Execute)

**This phase requires explicit DavDev approval before the agent touches any code.**

### Goal

Replace `adminUserIds` with a sync hook so that any user with `isPlatformAdmin = true`
automatically receives Better Auth admin privileges — without touching the `Role` enum
or `hasPermission()`.

### Mechanism

Better Auth exposes database hooks (`databaseHooks`) that fire on user create/update.
A hook on `user.update` checks `isPlatformAdmin` and writes `"admin"` or `"user"` to
Better Auth's built-in role field.

This requires adding Better Auth's built-in `role` TEXT field to the `user` model:

```prisma
model user {
  // ... existing fields ...
  betterAuthRole  String  @default("user") @map("better_auth_role")
  // NOTE: Do NOT name this "role" — that conflicts with the existing Role enum column
}
```

The field is mapped to `better_auth_role` in the DB to avoid column name collision
with the existing `role` enum.

### Hook Implementation (sketch — not for agent execution)

```ts
admin({
  adminRoles: ['admin'],
  // betterAuthRole field must be configured as the role column
}),
```

With a `databaseHooks.user.update.after` hook:

```ts
databaseHooks: {
  user: {
    update: {
      after: async (user) => {
        // Sync isPlatformAdmin → Better Auth role field
        // If isPlatformAdmin changes, write to betterAuthRole
      },
    },
  },
},
```

### Phase 2 Pre-conditions

- [ ] ⏳ Phase 1 is verified working in production
- [ ] ⏳ Better Auth version in use confirms `databaseHooks` API signature
      (check: `node_modules/better-auth/package.json` version)
- [ ] ⏳ DavDev confirms `better_auth_role` column name is acceptable
- [ ] ⏳ DavDev provides list of users currently in `adminUserIds` to verify
      they all have `isPlatformAdmin = true` (data integrity check before cutover)

**GATE G2 — DavDev approval required before Phase 2 execution begins.**

---

## 7. Risk Register

| ID  | Risk                                                                    | Severity | Mitigation                                                                                   |
| --- | ----------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| R1  | `customSyntheticUser` config syntax differs across Better Auth versions | Medium   | Agent must check Better Auth version before Step 3; escalate if syntax differs from advisory |
| R2  | `adminUserIds` users not in DB at time of config                        | High     | GATE G1 forces DB query before IDs are written                                               |
| R3  | Migration breaks existing user data                                     | Low      | `banned`/`banReason`/`banExpires` are all nullable; no backfill needed                       |
| R4  | Phase 2 `databaseHooks` API changed in current Better Auth version      | Medium   | Phase 2 gated; agent must verify API surface before execution                                |
| R5  | `betterAuthRole` column name conflicts with ORM mapping                 | Low      | Explicit `@map("better_auth_role")` and distinct Prisma field name prevents collision        |
| R6  | Dual admin plugin registration (if `admin()` already present)           | High     | Discovery checklist Step 4 catches this before any changes                                   |

---

## 8. Done Criteria

### Phase 1

- [ ] ⏳ `banned`, `banReason`, `banExpires` present in `prisma/schema.prisma`
- [ ] ⏳ Migration applied, Drizzle schema regenerated
- [ ] ⏳ `admin()` plugin present in `auth.ts` with non-empty `adminUserIds`
- [ ] ⏳ `adminClient()` confirmed present in `auth-client.ts`
- [ ] Impersonation round-trip tested: start → session shows `impersonatedBy` → stop
- [ ] ⏳ HOLISTIC.md updated with Phase 2 debt note

### Phase 2 (separate approval cycle)

- [ ] ⏳ `better_auth_role` column added to schema
- [ ] ⏳ Hook syncs `isPlatformAdmin` changes to `better_auth_role`
- [ ] ⏳ `adminUserIds` removed from config
- [ ] ⏳ All current platform admins verified to have `isPlatformAdmin = true`
- [ ] ⏳ Impersonation round-trip re-verified after cutover
