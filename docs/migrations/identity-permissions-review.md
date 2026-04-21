# Identity & Permissions System Review

**Reviewed:** 2026-03-31  
**Scope:** `src/lib/permissions.ts`, `src/lib/constants.ts`, `src/server/routers/identity.ts`, `prisma/schema.prisma`, `docs/IDENTITY_MODEL.md`

---

## Summary

The identity model design in `IDENTITY_MODEL.md` is solid, and the `identityRouter` implements most of it correctly. However there are **5 security gotchas**, **4 model/code mismatches**, and **5 structural improvement opportunities** worth addressing.

---

## 🔴 Security Gotchas

### 1. `AGENT` Role is Invisible to the Permissions System

**File:** [`src/lib/constants.ts:34`](src/lib/constants.ts:34), [`src/lib/permissions.ts:23`](src/lib/permissions.ts:23)

The Prisma schema defines `AGENT` in the `Role` enum ([`prisma/schema.prisma:63`](prisma/schema.prisma:63)), but `ROLES` in constants.ts **omits** it, and `ROLE_PERMISSIONS` in permissions.ts has **no entry** for it.

**Impact:**

- `hasPermission('AGENT', ...)` → always `false` (falls through to undefined)
- `getPermissions('AGENT')` → silently returns **RESIDENT** permissions (wrong role, wrong defaults)
- TypeScript `Role = keyof typeof ROLES` does not include `AGENT`, so any agent passed into typed code will fail or produce unexpected behaviour

**Fix:** Add `AGENT` to `ROLES` constant and define explicit `AGENT` permissions in `ROLE_PERMISSIONS`:

```ts
// constants.ts
export const ROLES = {
  RESIDENT: 'RESIDENT',
  GROUP_ADMIN: 'GROUP_ADMIN',
  COMMITTEE: 'COMMITTEE',
  BOARD: 'BOARD',
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',   // ADD THIS
} as const;

// permissions.ts
AGENT: {
  admin: false,
  users: false,
  requests: false,   // agents can't manage maintenance globally
  content: false,
  contentOwn: false,
  groups: false,
  groupsOwn: false,
  events: false,
  bookings: false,   // agents manage via AgentAccess, not RBAC
  directory: false,
  messages: false,
  settings: false,
},
```

---

### 2. Agent Self-Approves Their Own Access Request

**File:** [`src/server/routers/identity.ts:636-645`](src/server/routers/identity.ts:636)

In `requestAgentAccess`, the `grantedById` is set to `ctx.userId` (the agent's own ID):

```ts
grantedById: ctx.userId, // Self-granted for demo
```

This means an agent can grant themselves access to **any household** without owner consent. The comment acknowledges it as a demo shortcut, but it's shipped.

**Fix:**

1. Create an `AgentAccessRequest` with status `PENDING`
2. Notify the household's primaryOwner
3. The `grantAgentAccess` procedure (already implemented) should be the only path to setting `isActive: true`

Or at minimum, do **not** set `isActive: true` on `requestAgentAccess`:

```ts
return ctx.prisma.agentAccess.create({
  data: {
    agentId: ctx.userId,
    householdId: input.householdId,
    grantedById: ctx.userId,
    reason: input.reason,
    isActive: false, // PENDING owner approval
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});
```

---

### 3. `getProfile` (Public) Leaks Private User Data

**File:** [`src/server/routers/identity.ts:414`](src/server/routers/identity.ts:414)

`getProfile` is a `publicProcedure` but it returns `user.email` and `user.avatar` unconditionally, ignoring the `showEmail` flag on the user and the profile's `isPublic` flag.

```ts
user: { select: { id: true, name: true, email: true, avatar: true } },
```

**Fix:** Filter the returned data based on privacy flags:

```ts
const profile = await ctx.prisma.profile.findUnique({ ... });
if (!profile || profile.status === 'REMOVED') return null;
if (!profile.isPublic) return null;   // or return minimal stub

return {
  ...profile,
  user: profile.user ? {
    id: profile.user.id,
    name: profile.user.name,
    email: profile.showEmail ? profile.user?.email : undefined,
    avatar: profile.user.avatar,
  } : null,
};
```

---

### 4. `getSoloSeat` (Public) Returns Email Regardless of `showEmail`

**File:** [`src/server/routers/identity.ts:509`](src/server/routers/identity.ts:509)

The public `getSoloSeat` procedure includes `email` in the select:

```ts
user: {
  select: {
    id: true, name: true,
    email: true,        // exposed publicly regardless of showEmail flag
    avatar: true, interests: true,
    isPublic: true, showEmail: true, showPhone: true,
  },
},
```

The `showEmail` flag is fetched but not applied to filter the output.

**Fix:** Post-process the result to strip `email` if `!user.showEmail` and return `null` / empty if `!user.isPublic`.

---

### 5. `upgradeToSolo` Does Not Verify the Caller Owns the Profile

**File:** [`src/server/routers/identity.ts:433`](src/server/routers/identity.ts:433)

The procedure checks tenure (1 year) and active status, but does **not** verify that `ctx.userId` is linked to the profile being upgraded. It then creates a `SoloSeat` for `ctx.userId` tied to `profile.householdId`. Any authenticated user who knows a profileId can claim an upgrade for a household they don't belong to.

**Fix:** Add ownership check:

```ts
if (profile.userId !== ctx.userId) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot upgrade a profile you do not own' });
}
```

---

## 🟡 Model / Code Mismatches

### 6. `getHouseholdByUnit` Ignores the `street` Parameter

**File:** [`src/server/routers/identity.ts:103`](src/server/routers/identity.ts:103)

```ts
.input(z.object({ unit: z.string(), street: z.string().optional() }))
.query(async ({ input, ctx }) => {
  const household = await ctx.prisma.household.findFirst({
    where: { unit: input.unit },   // street not used!
```

Two streets can share the same unit number (e.g., `42 Pagoda Rd` vs `42 Wild Almond Rd`). The schema already has a composite unique key `street_unit`. The query must use street when provided.

**Fix:**

```ts
where: {
  unit: input.unit,
  ...(input.street ? { street: input.street } : {}),
},
```

---

### 7. Platform Address Generation Has No Uniqueness Check & Is Fragile

**Files:** [`src/server/routers/identity.ts:228`](src/server/routers/identity.ts:228), [`src/server/routers/identity.ts:304`](src/server/routers/identity.ts:304), [`src/server/routers/identity.ts:473`](src/server/routers/identity.ts:473)

Three places generate a `platformAddress` with no collision check:

```ts
// createStandardSeat
const platformAddress = `${user?.name.toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

// createProfile
const profileAddress = `${displayName.toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

// upgradeToSolo
const platformAddress = `${user?.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`;
```

Issues:

- `user?.name` can be `undefined` → generates `.42@soralia.org`
- Two residents named "John Smith" in the same unit get identical addresses
- No check that the generated address is unique in the DB

**Fix:**

1. Assert `user` is not null before proceeding (throw `INTERNAL_SERVER_ERROR` if missing)
2. Check `platformAddress` uniqueness against the respective table
3. Add a suffix counter if collision: `john.smith.2.unit042@soralia.org`

---

### 8. `createStandardSeat` Has No Admin Guard — Anyone Can Link to Any Household

**File:** [`src/server/routers/identity.ts:200`](src/server/routers/identity.ts:200)

`createStandardSeat` is a `protectedProcedure` — any authenticated user can link themselves to any household as a property owner. There's no admin approval, invitation token, or ownership verification step.

**Impact:** A renter could gain `isOwner` access to their landlord's household, bypassing update/manage restrictions.

**Fix:** Either:

- Make it `adminProcedure` (admin registers households manually), or
- Require an invitation token that was issued by admin for that household, or
- Keep self-service but mark as `isPrimaryOwner: false` and require admin approval

---

### 9. `User` Model Retains Deprecated Legacy Identity Fields

**File:** [`prisma/schema.prisma:18`](prisma/schema.prisma:18)

The `User` model still has `street`, `unit`, `homeImage`, `residentType` — all of which are now properly modelled in `Household`, `StandardSeat`, and `SoloSeat`. This creates dual sources of truth.

**Impact:**

- Code may read `user.homeImage` instead of `household.homeImage`, silently showing stale data
- Onboarding code may write to `User.street` instead of `Household`
- `residentType: ResidentType` (OWNER/RENTER/SUSPENDED) partially duplicates the seat model

**Fix:** Migration plan:

1. Deprecate with a DB comment (already in migration notes)
2. Add a warning in the Prisma schema
3. Migrate any code reading these fields to use the identity model
4. Remove in a future migration once migration-identity.ts has run

---

## 🔵 Structural Improvements

### 10. `BOARD` Role Cannot Manage Users But Can Access All Household Data

**File:** [`src/lib/permissions.ts:66`](src/lib/permissions.ts:66), [`src/server/routers/identity.ts:93`](src/server/routers/identity.ts:93)

`BOARD` has `users: false` in `ROLE_PERMISSIONS`, yet in `getHousehold` and `createProfile`, `ctx.role === 'BOARD'` grants full access. This inconsistency means the permission matrix is bypassed by ad-hoc role checks in the router.

**Fix:** Either:

- Set `users: true` for BOARD in `ROLE_PERMISSIONS` to align with actual behaviour
- Or introduce a `households` permission flag and use `hasPermission(ctx.role, 'households')` in the router

---

### 11. `removeProfile` Status Mapping Is Incomplete

**File:** [`src/server/routers/identity.ts:403`](src/server/routers/identity.ts:403)

```ts
const status = input.reason === 'EVICTED' ? 'EVICTED' : 'REMOVED';
```

`LEASE_ENDED` is a valid reason but maps to `REMOVED`, losing the distinction. If admin/board later audits why a profile was removed, the reason is lost.

**Fix:** Map reasons to distinct statuses or store the `reason` as a separate field on the profile:

```ts
const status =
  input.reason === 'EVICTED'
    ? 'EVICTED'
    : input.reason === 'LEASE_ENDED'
      ? 'LEASE_ENDED'
      : 'REMOVED';
```

And add `LEASE_ENDED` to the `ProfileStatus` enum in schema.

---

### 12. `resolveUserId` Uses Inconsistent Casing for Return Types

**File:** [`src/server/routers/identity.ts:559`](src/server/routers/identity.ts:559)

```ts
return { type: 'SoloSeat', data: SoloSeat }; // PascalCase
return { type: 'profile', data: profile }; // camelCase
return { type: 'standardSeat', data: standardSeat }; // camelCase
```

Clients must handle mixed casing. The variable name `SoloSeat` (line 540) also shadows the model name.

**Fix:** Normalise to camelCase discriminators: `'soloSeat'`, `'profile'`, `'standardSeat'`.

---

### 13. No `organizationId` on Identity Tables

**File:** `prisma/schema.prisma` — `Household`, `StandardSeat`, `SoloSeat`, `Profile`

`IDENTITY_MODEL.md` explicitly states multi-tenancy requires `organizationId` on every record with RLS enforcement. None of the identity tables have this field yet.

**Impact:** Adding it later will require a migration and backfill for every row.

**Recommendation:** Add `organizationId String` (nullable or with a default for single-tenant mode) to `Household`, `Profile`, `SoloSeat`, `StandardSeat`, and `AgentAccess` now, before data accumulates. This ensures zero migration pain.

---

### 14. `agentAccess.expiresAt` Can Be Set to a Past Date

**File:** [`src/server/routers/identity.ts:656`](src/server/routers/identity.ts:656)

`grantAgentAccess` accepts any `z.date()` for `expiresAt` without validating it's in the future. A misconfigured client could grant immediately-expired access.

**Fix:**

```ts
expiresAt: z.date().min(new Date(), { message: 'Expiry must be in the future' }),
```

---

## Implementation Plan

| Priority | Issue                                                                 | Effort | File(s)                              |
| -------- | --------------------------------------------------------------------- | ------ | ------------------------------------ |
| 🔴 P0    | Add `AGENT` to ROLES + ROLE_PERMISSIONS                               | XS     | `constants.ts`, `permissions.ts`     |
| 🔴 P0    | Fix agent self-approval (set `isActive: false`)                       | XS     | `identity.ts:637`                    |
| 🔴 P0    | Add ownership check to `upgradeToPremium`                             | XS     | `identity.ts:458`                    |
| 🔴 P1    | Filter private fields in `getProfile` + `getSoloSeat`                 | S      | `identity.ts:414`, `identity.ts:509` |
| 🟡 P1    | Fix `getHouseholdByUnit` to use `street` in query                     | XS     | `identity.ts:106`                    |
| 🟡 P1    | Add uniqueness + null-safety to platform address generation           | S      | `identity.ts:228,304,473`            |
| 🟡 P1    | Guard `createStandardSeat` (admin or invitation token)                | M      | `identity.ts:200`                    |
| 🔵 P2    | Align `BOARD` permission in ROLE_PERMISSIONS or add `households` perm | S      | `permissions.ts`, `identity.ts`      |
| 🔵 P2    | Fix inconsistent `resolveUserId` type discriminants                   | XS     | `identity.ts:559`                    |
| 🔵 P2    | Add `LEASE_ENDED` to ProfileStatus enum + fix mapping                 | XS     | `schema.prisma`, `identity.ts:403`   |
| 🔵 P2    | Validate `expiresAt` is in the future in `grantAgentAccess`           | XS     | `identity.ts:656`                    |
| 🔵 P3    | Add `organizationId` to identity tables (future-proofing)             | M      | `schema.prisma` + migration          |
| 🔵 P3    | Deprecate legacy `User.street/unit/homeImage/residentType`            | L      | `schema.prisma` + all callers        |

---

_Reviewed against: `IDENTITY_MODEL.md` (2026-03-30), `schema.prisma`, `identity.ts`, `permissions.ts`, `constants.ts`_
