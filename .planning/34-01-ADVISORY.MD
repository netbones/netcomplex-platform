# Advisory — 34-01-PLAN: AdminLayer Corrections

**Issued:** Post-agent-review  
**Plan:** 34-01-PLAN.md  
**Status:** Required fixes before re-execution

---

## Summary

8 issues identified by the agent during execution. 4 are plan metadata errors (missing files in
`files_modified`, wrong context reference). 3 are code correctness issues (auth pattern, Drizzle
imports, TypeScript). 1 is a routing architecture issue discussed separately and now requiring
explicit plan resolution.

All 8 are fixable with targeted amendments to the plan. No architectural rethink required.

---

## Issue Corrections

---

### Issue 1 — `admin/page.tsx` must be CREATED not UPDATED + `[space]/page.tsx` must be UPDATED

**Filed as:** Routing architecture gap (discussed prior to execution)

**Current plan task 4 says:**
> Update `src/app/(tenant)/dashboard/admin/page.tsx`

**Correction:**

`admin/page.tsx` does not exist. Next.js static-over-dynamic resolution means creating this file
causes `/dashboard/admin` to route here instead of `[space]/page.tsx` — which is the desired
behaviour. Task 4 must be amended to two explicit sub-steps:

**Step A — CREATE `src/app/(tenant)/dashboard/admin/page.tsx`:**
```tsx
import { AdminLayer } from '@/widgets/dashboard/ui/AdminLayer';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

export default function AdminSpacePage() {
  return (
    <ErrorBoundary>
      <AdminLayer />
    </ErrorBoundary>
  );
}
```

**Step B — UPDATE `src/app/(tenant)/dashboard/[space]/page.tsx`:**

This file currently renders `AdminSubLauncher` and `UsersListSection` for the admin space inline.
That logic must be removed. After the change, `[space]/page.tsx` must only render `SpaceLayout`
for non-admin spaces. Add a guard to redirect or 404 if `space === 'admin'` somehow reaches it
(belt-and-suspenders — Next.js routing should prevent this, but the guard makes intent explicit):

```tsx
// In [space]/page.tsx — add this guard before the SpaceLayout render
if (params.space === 'admin') {
  // Should never reach here — admin/page.tsx takes precedence in Next.js routing.
  // If this renders, it means admin/page.tsx is missing.
  redirect('/dashboard/admin');
}
```

Then remove all admin-specific conditional rendering (AdminSubLauncher, UsersListSection, any
`space === 'admin'` branches) from `[space]/page.tsx`.

---

### Issue 2 — `files_modified` missing `[space]/page.tsx`

**Correction:** Add to the plan front matter:

```yaml
files_modified:
  - src/app/(tenant)/dashboard/[space]/page.tsx   # ADD THIS
```

This file is modified in Task 4 (remove admin-specific rendering, add guard). It must be listed
so the agent's pre-task context load includes it and the summary correctly records the change.

---

### Issue 3 — `files_modified` missing `src/entities/widget/model/default-layouts.ts`

**Correction:** Add to the plan front matter:

```yaml
files_modified:
  - src/entities/widget/model/default-layouts.ts   # ADD THIS
```

Task 4 explicitly updates admin space default widgets (`admin: ['admin-stats', 'admin-user']`).
The agent needs this file in scope and it must appear in the summary.

---

### Issue 4 — `files_modified` missing `src/widgets/dashboard/model/spaces.ts`

**Correction:** Add to the plan front matter:

```yaml
files_modified:
  - src/widgets/dashboard/model/spaces.ts   # ADD THIS
```

Task 4 updates `getAdminDomainWidgets` to add `page-settings` and `admin-system` to the system
domain mapping. This file must be listed.

---

### Issue 5 — Context references non-existent file

**Current plan context block includes:**
```
@src/app/(tenant)/dashboard/admin/page.tsx
```

**Correction:** Replace with the file that actually exists and contains the admin rendering logic:

```
@src/app/(tenant)/dashboard/[space]/page.tsx
```

The agent needs `[space]/page.tsx` in context to understand what admin-specific code currently
lives there and needs to be removed. The non-existent path produces a context load error that
consumes an agent step and may cause hallucinated assumptions about the file's contents.

---

### Issue 6 — Auth pattern misalignment

**Current plan uses:**
```typescript
hasPermission('admin')
```

**Correction:** The codebase uses `getSessionAndRole` + `hasPermission` from
`@shared/api/auth-utils`, not a standalone `hasPermission` call. Align both API routes with the
existing pattern used in `src/app/api/competitions/route.ts` and similar routes.

The correct pattern for both `/api/admin/urgency` and `/api/admin/activity`:

```typescript
import { getSessionAndRole } from '@/shared/api/auth-utils';

// Inside the GET handler:
const { session, role } = await getSessionAndRole(request);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (role !== 'ADMIN' && role !== 'BOARD' && role !== 'MANAGER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

Replace every instance of `hasPermission('admin')` in the plan with this pattern. The role check
should allow `ADMIN`, `BOARD`, and `MANAGER` — check the existing admin API routes in the
codebase to confirm the exact role set used for admin-gated endpoints before executing.

---

### Issue 7 — Drizzle imports not re-exported from `@shared/api/db`

**Current plan uses:**
```typescript
import { count, inArray, and, lte, lt, desc } from '@/shared/api/db';
```

(Implied — the plan references `count()`, `inArray()`, etc. without specifying the import source.)

**Correction:** These Drizzle operators are not re-exported from `@shared/api/db`. They must be
imported directly from `drizzle-orm`:

```typescript
import { count, inArray, and, lte, lt, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/shared/api/db';
```

The `db` instance itself comes from `@/shared/api/db`. All Drizzle query builder functions
(`count`, `eq`, `and`, `or`, `lte`, `lt`, `gt`, `desc`, `asc`, `sql`, `inArray`) come from
`drizzle-orm` directly. Apply this split consistently across both new API routes.

Add the correct import lines explicitly to the task action for both route files so the agent
does not have to infer them.

---

### Issue 8 — `sql<null>` is invalid TypeScript

**Current plan uses:**
```typescript
actorId: sql<null>`null`,
```

**Correction:** `sql<null>` is not a valid Drizzle generic. Use `sql<string | null>` for nullable
string columns, or simply `sql<null | string>`. The correct form for a literal null expression:

```typescript
actorId: sql<string | null>`null`,
```

Apply this fix everywhere `sql<null>` appears in the activity route query — specifically in the
surveys and events domain queries where `actorId` has no natural source column.

Alternatively, if the `ActivityItem` type defines `actorId` as `string | null`, use a typed
cast:

```typescript
actorId: sql<string | null>`null::text`,
```

The `::text` PostgreSQL cast ensures Drizzle receives a typed null rather than an untyped SQL
null, which can cause inference issues in some Drizzle versions.

---

## Corrected `files_modified` Front Matter

Replace the current `files_modified` block with:

```yaml
files_modified:
  - src/widgets/dashboard/ui/AdminLayer.tsx
  - src/widgets/dashboard/ui/AdminCommandBar.tsx
  - src/widgets/dashboard/ui/AdminActivityStream.tsx
  - src/widgets/dashboard/ui/AdminSubLauncher.tsx
  - src/app/api/admin/activity/route.ts
  - src/app/api/admin/urgency/route.ts
  - src/app/(tenant)/dashboard/admin/page.tsx          # CREATE (new file)
  - src/app/(tenant)/dashboard/[space]/page.tsx        # UPDATE (remove admin logic)
  - src/app/(tenant)/dashboard/admin/[domain]/page.tsx # UPDATE (system domain)
  - src/entities/widget/model/default-layouts.ts       # UPDATE (admin defaults)
  - src/widgets/dashboard/model/spaces.ts              # UPDATE (system domain mapping)
  - src/widgets/dashboard/model/widgets.ts             # UPDATE (space assignments)
```

---

## Corrected Context Block

Replace:
```
@src/app/(tenant)/dashboard/admin/page.tsx
```

With:
```
@src/app/(tenant)/dashboard/[space]/page.tsx
@src/app/(tenant)/dashboard/admin/[domain]/page.tsx
```

Both files are needed — `[space]/page.tsx` to understand what admin logic to remove, and
`admin/[domain]/page.tsx` to understand the existing domain page structure before modifying
the system domain entry.

---

## Pre-Execution Checklist

- [ ] Confirm exact role set used in existing admin API routes (ADMIN / BOARD / MANAGER)
      before executing Issue 6 fix — check `src/app/api/competitions/route.ts` as reference
- [ ] Confirm `getSessionAndRole` export path in `@/shared/api/auth-utils`
- [ ] Confirm `withTenant()` import path (used in both new API routes)
- [ ] Verify `[space]/page.tsx` admin-specific code to be removed:
      AdminSubLauncher render + UsersListSection + any `space === 'admin'` conditionals
- [ ] Add routing note as inline comment in `admin/page.tsx` after creation:
      `// This file takes Next.js static-route precedence over [space]/page.tsx for /dashboard/admin`
