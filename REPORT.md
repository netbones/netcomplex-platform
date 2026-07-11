# Boundary Quarantine Review Report

**Reviewed commits:** `1c2f000c..e14b1e54` (6 commits)
**Reviewer:** Subagent (plan mode)
**Date:** 2026-07-10

---

## 1. Does It Solve the Problem?

**Yes.** The quarantine correctly narrows `ctx.tenantId: string | null` to `string` at route entry points, preventing the nullable cascade from spreading through downstream code. The approach works because:

- Every tenant-scoped route now explicitly guards `null` → returns 403/401
- Downstream code operates on a narrowed `string` variable
- No `!` or `as string` type suppression anywhere
- `RLSContext.tenantId` stays `string | null` (the type is correct at the source)

**The 14 affected production files compile cleanly.** The 58 remaining typecheck errors are pre-existing debt in unrelated files.

---

## 2. Issues Found

### 2a. Inconsistent guard placement (cosmetic, not a bug)

Routes are split between two patterns:

| Pattern                         | Files                                                                                                 | Example                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Before `runWithRLS`**         | `page-flags`, `services-config`, `hero-carousel`, `achievements/[id]`                                 | `if (tenantId === null) return apiForbidden();` then `runWithRLS(ctx, ...)`                                            |
| **Inside `runWithRLS` closure** | `achievements`, `achievements/progress`, `admin/activity`, `admin/maintenance-stats`, `admin/urgency` | `runWithRLS(ctx, async tx => { const tenantId = ctx.tenantId; if (tenantId === null) return apiUnauthorized(); ... })` |

**Both are functionally correct** — the closure returns a `NextResponse`, and `runWithRLS` passes it through. However, the inconsistency makes the pattern harder to recognize at a glance.

**Verdict:** Cosmetic. No fix needed for correctness. Consider standardizing in a future hardening pass.

### 2b. Inconsistent HTTP status codes (minor semantic mismatch)

Some routes return `apiUnauthorized()` (401) for null tenant, others return `apiForbidden()` (403). Semantically:

- **401** = "you're not authenticated" — wrong here, the user IS authenticated (session exists)
- **403** = "you're authenticated but not authorized for this resource" — correct

| Route                       | Current | Correct?         |
| --------------------------- | ------- | ---------------- |
| `page-flags` (GET/POST/PUT) | 403     | ✅               |
| `services-config` (GET/PUT) | 403     | ✅               |
| `hero-carousel` (GET/PUT)   | 403     | ✅               |
| `achievements/[id]`         | 403     | ✅               |
| `achievements` (list)       | 401     | ❌ should be 403 |
| `achievements/progress`     | 401     | ❌ should be 403 |
| `admin/activity`            | 401     | ❌ should be 403 |
| `admin/maintenance-stats`   | 401     | ❌ should be 403 |
| `admin/urgency`             | 401     | ❌ should be 403 |

**Impact:** Low. Client-side auth redirects won't differentiate 401 vs 403. But semantically the 5 routes above are slightly misleading.

### 2c. Repetitive boilerplate — fragile to new routes

Every tenant-scoped route must manually add the guard. There is **no compile-time enforcement** — a developer adding a new route can forget the guard and hit the same cascade. The pattern:

```typescript
const ctx = await getRLSContext(request);
if (!ctx) return apiUnauthorized();
const tenantId = ctx.tenantId;
if (tenantId === null) return apiForbidden();
```

is repeated 15+ times with no abstraction.

**Alternative considered:** A `requireTenantRLS(request)` helper that returns `{ tenantId: string, ...rest }` or throws/returns early. This would:

- Eliminate the repetitive guard boilerplate
- Make it impossible to forget the guard (enforced at the helper level)
- Standardize the HTTP status code (always 403)

This is the single biggest improvement opportunity.

### 2d. `getTenantByUserId` — silent `undefined` for null-tenant users

```typescript
// base.ts:223-228
export async function getTenantByUserId(userId: string): Promise<Tenant | undefined> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return undefined;
  const tenantId = user[0].tenantId;
  if (tenantId === null) return undefined; // ← new guard
  return getTenantById(tenantId);
}
```

Callers treat `undefined` as "user not found" or "tenant not found." For deferred-provisioning users (who exist but have no tenant), this is **logically correct** — they have no tenant. But callers that log "user not found" will produce misleading logs for these users.

**Verdict:** Acceptable for now. No callers currently depend on distinguishing "user has no tenant" from "user not found." If this distinction matters later, the return type would need to change (e.g., `null` for "no tenant" vs `undefined` for "not found").

### 2e. `platform/tenants` route — `let tenantId = ''` sentinel

```typescript
// route.ts:96
let tenantId = '';
try {
  await db.transaction(async tx => { ... tenantId = newTenant.id; ... });
} catch { ... return apiInternalError(...); }
// tenantId is now '' (empty string) or the real ID
```

The empty-string sentinel is fine because the `catch` block returns before `tenantId` is used. But it's a code smell — TypeScript allows it because `''` is a valid `string`, but the variable is never actually used as `''`.

**Alternative:** Use the `db.transaction` return value (as the first draft did). The reason it was reverted: the test mock doesn't propagate the transaction return value, breaking Test 2.

**Verdict:** Acceptable. The revert was necessary for test compatibility. The `''` sentinel is never used at runtime. Could be improved by fixing the test mock, but not worth blocking Phase 124.

### 2f. AI pool notification fix — correct but unrelated to route boundary

```typescript
// pool.ts:226
tenantId: options.tenantId,  // was: u.tenantId
```

This is a data-layer fix, not a route boundary fix. `options.tenantId` is `string` (from the caller), while `u.tenantId` is `string | null`. The fix is correct and prevents inserting a notification with `null` tenantId.

**Verdict:** Good catch. This is a genuine bug that would have surfaced at runtime for deferred-provisioning users.

### 2g. `auth-client.ts` alignment — correct fix

```typescript
// Before
role: { type: 'string' },                          // inferred as required
tenantId: { type: 'string', nullable: true },       // inferred as required
// After
role: { type: 'string', required: false, defaultValue: 'USER', input: false },
tenantId: { type: 'string', nullable: true, required: false, input: true },
```

Without `required: false`, Better Auth infers these as required sign-up fields, breaking `authClient.signUp.email()`. The fix correctly mirrors the server-side `auth.ts` definition.

**Verdict:** Correct fix. This is a genuine bug.

### 2h. Test typing fix — correct

`createRequest` now returns `NextRequest` (the POST handler expects `NextRequest`, not `Request`). `mockGetSession` is now typed as `Promise<MockSession | null>` so `mockResolvedValue` accepts properly-shaped session mocks.

**Verdict:** Correct fix. No concerns.

---

## 3. Is There a Better Approach?

### 3a. `requireTenantRLS()` helper (recommended for future hardening)

Instead of repeating the guard in every route, create a helper that combines session + tenant validation:

```typescript
async function requireTenantRLS(
  request: NextRequest
): Promise<
  { ok: true; ctx: RLSContext; tenantId: string } | { ok: false; response: NextResponse }
> {
  const ctx = await getRLSContext(request);
  if (!ctx) return { ok: false, response: apiUnauthorized() };
  if (ctx.tenantId === null) return { ok: false, response: apiForbidden() };
  return { ok: true, ctx, tenantId: ctx.tenantId };
}
```

Usage:

```typescript
const result = await requireTenantRLS(request);
if (!result.ok) return result.response;
const { ctx, tenantId } = result;
// tenantId is string — no guard needed
```

**Benefits:**

- Impossible to forget the guard
- Single source of truth for HTTP status code (always 403)
- Reduces boilerplate by 3 lines per route
- Makes the intent explicit: "this route requires a tenant"

### 3b. Type narrowing at `getRLSContext` level (not recommended)

Could change `getRLSContext` to return `RLSContext & { tenantId: string }` when the user has a tenant. But this breaks the API contract for routes that legitimately don't need a tenant (e.g., `POST /api/platform/tenants` for tenant creation).

### 3c. Middleware-level guard (not feasible)

Next.js middleware can't access `RLSContext` (requires DB lookup). The guard must stay at the route level.

---

## 4. Summary

| Aspect                                | Verdict                                  |
| ------------------------------------- | ---------------------------------------- |
| **Solves the nullable cascade?**      | ✅ Yes                                   |
| **No `!` / `as string` suppression?** | ✅ Correct                               |
| **Guard correctness?**                | ✅ All 14 files guarded                  |
| **HTTP status consistency?**          | ⚠️ 5 routes use 401 instead of 403       |
| **Guard placement consistency?**      | ⚠️ Mixed (before vs inside `runWithRLS`) |
| **Fragility for new routes?**         | ⚠️ No compile-time enforcement           |
| **Test compatibility?**               | ✅ 21/21 passing                         |
| **Typecheck?**                        | ✅ 0 errors in Phase 124 files           |
| **`auth-client.ts` alignment?**       | ✅ Correct fix                           |
| **AI pool notification?**             | ✅ Correct bug fix                       |

**Overall: The boundary quarantine is a solid, pragmatic solution.** It solves the immediate problem without type suppression and without spreading nullable types through the platform. The two minor issues (HTTP status inconsistency, repetitive boilerplate) are not blocking and can be addressed in a future hardening pass.

**Recommended follow-up (non-blocking):**

1. Standardize 401→403 for null-tenant guards (5 routes)
2. Extract `requireTenantRLS()` helper to eliminate boilerplate and enforce the pattern
3. Consider whether `getTenantByUserId` should return a distinct sentinel for "user exists but has no tenant" vs "user not found"

---

## 5. Implementation (all 3 recommendations adopted)

### 5a. `requireTenantRLS()` helper — `src/shared/api/require-tenant-rls.ts`

New helper that combines session + tenant validation in one call:

```typescript
export async function requireTenantRLS(
  request: Request
): Promise<{ ok: true; ctx: RLSContext; tenantId: string } | { ok: false; response: NextResponse }>;
```

- Returns 401 (`apiUnauthorized`) if no session
- Returns 403 (`apiTenantForbidden`) if session exists but no tenant
- Returns narrowed `{ ctx, tenantId: string }` on success
- Exported from `@api/server` for route imports

### 5b. Routes refactored (9 files, 12 handlers)

All routes now use `requireTenantRLS` instead of manual `getRLSContext` + null guard:

| File                                    | Handler(s)     | Status change                                 |
| --------------------------------------- | -------------- | --------------------------------------------- |
| `achievements/route.ts`                 | GET            | 401 → 403                                     |
| `achievements/progress/route.ts`        | GET            | 401 → 403                                     |
| `admin/urgency/route.ts`                | GET            | 401 → 403                                     |
| `admin/maintenance-stats/route.ts`      | GET            | 401 → 403                                     |
| `admin/activity/route.ts`               | GET            | 401 → 403 (platform admin override preserved) |
| `admin/services-config/route.ts`        | GET, PUT       | already 403                                   |
| `admin/settings/hero-carousel/route.ts` | GET, PUT       | already 403                                   |
| `admin/settings/page-flags/route.ts`    | GET, POST, PUT | already 403                                   |
| `admin/achievements/[id]/route.ts`      | PATCH          | already 403                                   |

**Guard placement now consistent:** always before `runWithRLS`, never inside the closure.

### 5c. `getTenantByUserId` — `src/entities/tenant/api/base.ts`

Return type changed from `Promise<Tenant | undefined>` to `Promise<Tenant | null | undefined>`:

| Return value | Meaning                                               |
| ------------ | ----------------------------------------------------- |
| `Tenant`     | User has a valid tenant                               |
| `null`       | User exists but has no tenant (deferred-provisioning) |
| `undefined`  | User not found                                        |

No callers to update — function is currently exported but unused.

### 5d. Verification

- **Typecheck:** 0 errors in all changed files
- **Tests:** 6/6 auth-provisioning pass, 133/133 api/dto/schema tests pass
- **Pre-existing failures:** 2 content tests (`resolveLocale`) unrelated to our changes
