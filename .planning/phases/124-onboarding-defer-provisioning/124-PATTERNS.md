# Phase 124: Onboarding Refactor — Defer Tenant Provisioning — Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 15 new/modified files
**Analogs found:** 15 / 15

## File Classification

| New/Modified File                                              | Role                      | Data Flow        | Closest Analog                                                                                                                                                                    | Match Quality |
| -------------------------------------------------------------- | ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `prisma/schema/schema.prisma` (line 98)                        | model/config              | CRUD             | `prisma/schema/schema.prisma` itself (line 98 change from `String` → `String?`)                                                                                                   | exact         |
| `prisma/migrations/<ts>_make_tenant_id_nullable/migration.sql` | migration                 | transform        | `prisma/migrations/20260624000000_add_user_role_and_seat_lifecycle/migration.sql` (ALTER COLUMN on `user` table, line 8)                                                          | role-match    |
| `src/db/schema/users.ts` (line 6)                              | model (auto-gen)          | CRUD             | `src/db/schema/users.ts` itself (drop `.notNull()` after `prisma generate`)                                                                                                       | exact         |
| `src/shared/api/auth.ts` (additionalFields, hooks, email)      | config                    | request-response | `src/shared/api/auth.ts` itself (in-place reconfiguration)                                                                                                                        | exact         |
| `src/shared/api/rls-context.ts`                                | utility                   | request-response | `src/shared/api/rls-context.ts` itself (line 16 — tenantId: user.tenantId will become `string \| null`)                                                                           | exact         |
| `src/shared/api/db.ts` (RLSContext type)                       | utility                   | request-response | `src/shared/api/db.ts` itself (line 15 — `tenantId: string` → `string \| null`)                                                                                                   | exact         |
| `src/features/auth/model/useSignupForm.ts`                     | hook                      | request-response | `src/features/auth/model/useSignupForm.ts` itself (collapse from 3→2 steps, drop community fields, call Better Auth)                                                              | exact         |
| `src/app/(platform)/signup/page.tsx`                           | page component            | request-response | `src/app/(platform)/signup/page.tsx` itself (remove Step 1 community-details UI)                                                                                                  | exact         |
| `src/app/(platform)/home/page.tsx`                             | page component            | request-response | `src/app/api/platform/setup/route.ts` (auth gating pattern) + current `src/app/(platform)/home/page.tsx` (layout shell)                                                           | role-match    |
| `src/features/auth/ui/CommunitySetupForm.tsx` (NEW)            | component                 | request-response | `src/features/auth/ui/SignupFormSection.tsx` (form layout) + `src/app/(platform)/signup/page.tsx` (community fields extracted from Step 1, lines 54–150)                          | role-match    |
| `src/app/api/platform/tenants/route.ts`                        | controller/API route      | request-response | `src/app/api/platform/setup/route.ts` (lines 32-35 — `auth.api.getSession` + 401 pattern) + `src/app/api/platform/setup/missions/route.ts` (lines 34-37 session check + Zod body) | role-match    |
| `src/app/api/v1/platform/tenants/route.ts`                     | controller/shim re-export | request-response | `src/app/api/v1/platform/tenants/route.ts` itself (unchanged re-export)                                                                                                           | exact         |
| `src/entities/tenant/schema.ts`                                | schema/validation         | request-response | `src/entities/tenant/schema.ts` itself (signupSchema split into identity-only + community-setup)                                                                                  | exact         |
| `src/entities/tenant/api/with-tenant.ts`                       | utility (audit)           | request-response | `src/entities/tenant/api/with-tenant.ts` itself (audit only — verify no reliance on user.tenantId)                                                                                | exact         |
| `src/middleware.ts`                                            | middleware                | request-response | `src/middleware.ts` itself (audit only — `/home` is already in `isPlatformRoute`, line 100)                                                                                       | exact         |

## Pattern Assignments

---

### 1. `prisma/schema/schema.prisma` (model, line 98 — MODIFY)

**Analog:** `prisma/schema/schema.prisma:96-98` — the user model itself

**Imports pattern:** N/A (Prisma schema — no imports)

**Current state (line 98):**

```prisma
model user {
  id                                                    String                    @id
  tenantId                                              String
  // ...
}
```

**Target state:**

```prisma
model user {
  id                                                    String                    @id
  tenantId                                              String?
  // ...
}
```

**Pattern:** Change a required scalar field to optional by appending `?`. This is the standard Prisma nullable-field syntax. The `?` suffix tells Prisma to generate `ALTER COLUMN ... DROP NOT NULL`.

---

### 2. `prisma/migrations/<timestamp>_make_tenant_id_nullable/migration.sql` (CREATE)

**Analog:** `prisma/migrations/20260624000000_add_user_role_and_seat_lifecycle/migration.sql` — ALTER COLUMN on the `user` table

**Pattern (lines 1-8):**

```sql
-- ADVISORY-015 Phase 1 Migration
-- Add USER role, seat lifecycle fields, Property.platformAddress @unique

-- 1. Add USER to Role enum (before RESIDENT, as lowest-privilege staging value)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER' BEFORE 'RESIDENT';

-- 2. Change default on user.role from RESIDENT to USER
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';
```

**Migration conventions observed:**

- Comment header with advisory/phase reference
- Numbered steps in comments
- `ALTER TABLE "user" ALTER COLUMN ...` syntax for column modifications
- Prisma generates the SQL automatically from `prisma migrate dev --name <name>`

**Expected generated migration:**

```sql
-- Phase 124: Make tenantId nullable (ADVISORY-031 §10)
-- Allow verified users to exist without a tenant (tenantId = null)

ALTER TABLE "user" ALTER COLUMN "tenantId" DROP NOT NULL;
```

**Migration workflow (from RESEARCH.md §2, pattern 1):**

```bash
# 1. Edit prisma/schema/schema.prisma: line 98 — tenantId String → String?
# 2. Create Prisma migration
npx prisma migrate dev --name make_tenant_id_nullable
# 3. Regenerate Drizzle schema
npx prisma generate
# 4. Verify
pnpm db:check
```

---

### 3. `src/db/schema/users.ts` (auto-generated — REGENERATE)

**Analog:** `src/db/schema/users.ts:4-7` — current Drizzle schema

**Current state (lines 4-7):**

```typescript
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  email: text('email').notNull(),
  // ...
});
```

**Expected post-regeneration (line 6):**

```typescript
  tenantId: text('tenantId'),  // .notNull() removed by prisma-generator-drizzle
```

**Key insight (RESEARCH.md §2):** Do NOT manually edit this file. It is auto-generated by `prisma-generator-drizzle`. Run `prisma generate` after editing the Prisma schema, and the `.notNull()` will be dropped automatically.

**TypeScript type becomes:** `string | null`

---

### 4. `src/shared/api/auth.ts` (config — MODIFY)

**Analog:** `src/shared/api/auth.ts` itself — three sections modified:

#### 4a. `additionalFields` (lines 148-153) — `required: false` + drop `defaultValue`

**Current state:**

```typescript
// src/shared/api/auth.ts:148-153
tenantId: {
  type: 'string',
  required: true,                           // ← Must be present
  defaultValue: tenantConfig.defaultSlug,   // ← Force-stamps soralia
  input: true,
},
```

**Target state:**

```typescript
tenantId: {
  type: 'string',
  required: false,                          // ← Optional
  // defaultValue removed                   // ← No force-stamp
  input: true,                              // ← Keep for invited-user header path
},
```

**Pattern source:** Better Auth additionalFields config. Field `required: false` makes Better Auth accept sign-ups without `tenantId`. Removing `defaultValue` stops the unconditional force-stamp.

#### 4b. `databaseHooks.user.create.before` (lines 243-260) — conditional fallback

**Current state (lines 253-259):**

```typescript
return {
  data: {
    ...user,
    tenantId: tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug,
    profileSlug: generateProfileSlug(user.name),
    role: 'USER',
  },
};
```

**Target state:**

```typescript
return {
  data: {
    ...user,
    tenantId: tenant?.id ?? rawTenantId ?? null, // ← null for global signups
    profileSlug: generateProfileSlug(user.name),
    role: 'USER',
  },
};
```

**Invited-user path preserved:** `rawTenantId` from `x-tenant-slug` header still resolves through `tenants` table lookup (`tenant?.id`). The only change is the final `?? tenantConfig.defaultSlug` becoming `?? null`.

#### 4c. `sendVerificationEmail` (lines 114-137) — remove fire-and-forget `.catch()`

**Current state (lines 129-136):**

```typescript
sendEmail({
  to: user.email,
  subject: templates.verifyEmail.subject(tenantName),
  html: templates.verifyEmail.getHtml(user.name || '', url, tenantName),
  fromName: tenantName,
}).catch(err => authLogger.error({ err, email: user.email }, 'Verification email send failed'));
```

**Target state:**

```typescript
await sendEmail({
  to: user.email,
  subject: templates.verifyEmail.subject(tenantName),
  html: templates.verifyEmail.getHtml(user.name || '', url, tenantName),
  fromName: tenantName,
});
// If sendEmail throws, Better Auth propagates the error to the client
```

**Pattern source (RESEARCH.md Pattern 3):** Remove the `.catch()` — `sendVerificationEmail` is async. If the callback rejects (throws), Better Auth surfaces it as an error to the client.

#### 4d. `emailVerification.sendOnSignUp` — add `sendOnSignUp: true`

**Current state (line 138):**

```typescript
sendOnSignIn: true, // Send verification email on sign-in if not verified
```

**Target state — add after line 138:**

```typescript
sendOnSignUp: true,  // ← NEW — send verification email immediately at sign-up
sendOnSignIn: true,  // Send verification email on sign-in if not verified
```

#### 4e. `advanced.crossSubDomainCookies` — enable (Phase 2, same file)

**Current state (lines 214-216):**

```typescript
advanced: {
  cookiePrefix: tenantConfig.auth.cookiePrefix,
},
```

**Target state:**

```typescript
advanced: {
  cookiePrefix: tenantConfig.auth.cookiePrefix,
  crossSubDomainCookies: {
    enabled: true,
    domain: 'netbones.co.za', // NOTE: no leading dot per Better Auth docs
  },
},
```

**Pattern source:** `src/features/auth/ui/SignupFormSection.tsx` — the `sendEmail` import from `@shared/api/email/resend` (line 27-61) returns `SendEmailResult`. The function signature at `src/shared/api/email/resend.ts:27-37` shows `async function sendEmail(...): Promise<SendEmailResult>`.

---

### 5. `src/shared/api/rls-context.ts` (utility — MODIFY)

**Analog:** `src/shared/api/rls-context.ts:7-20` — the `getRLSContext` function itself

**Current state (lines 7-20):**

```typescript
export async function getRLSContext(request: Request): Promise<RLSContext | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}
```

**What changes:** Line 16 (`tenantId: user.tenantId`) — after Drizzle regen, `user.tenantId` becomes `string | null`. The `RLSContext` type update (see §6 below) makes this compile clean. No code change needed in this file — the return type changes naturally, and the consumer audit (Phase 0 done criteria) verifies all callers handle null.

**Pattern:** No structural change. The `eq(users.id, session.user.id)` fetch and null-guard remain identical.

---

### 6. `src/shared/api/db.ts` (RLSContext type + runWithRLS — MODIFY)

**Analog:** `src/shared/api/db.ts:13-18` + `src/shared/api/db.ts:346-368`

#### 6a. RLSContext type (lines 13-18)

**Current state:**

```typescript
export type RLSContext = {
  userId: string;
  tenantId: string;
  role: string;
  isPlatformAdmin: boolean;
};
```

**Target state:**

```typescript
export type RLSContext = {
  userId: string;
  tenantId: string | null; // ← nullable for unprovisioned users
  role: string;
  isPlatformAdmin: boolean;
};
```

#### 6b. runWithRLS null guard (lines 346-368)

**Current state (lines 360-361):**

```typescript
await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
```

**Target state — add null guard before the `set_config` calls:**

```typescript
await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
if (ctx.tenantId !== null) {
  await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
}
await tx.execute(sql`SELECT set_config('app.user_role', ${ctx.role}, true)`);
await tx.execute(
  sql`SELECT set_config('app.is_platform_admin', ${ctx.isPlatformAdmin ? 'true' : 'false'}, true)`
);
```

**Pattern source:** The existing `set_config` calls use `sql` template literals with the `ctx` properties. The null guard follows the existing try/catch pattern in the function (lines 351-358). RLS policies should fail closed (no `app.tenant_id` → no tenant-scoped rows returned) rather than crashing on `NULL`.

---

### 7. `src/features/auth/model/useSignupForm.ts` (hook — MODIFY)

**Analog:** `src/features/auth/model/useSignupForm.ts` — collapse from 3 steps to 2

**Current imports (lines 1-7):**

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { signupSchema, type SignupFormData } from '@entities/tenant';
```

**Changes needed:**

1. **Collapse steps:** `type Step = 1 | 2 | 3` → `type Step = 1 | 2`
2. **Drop community fields from defaultValues (lines 19-29):**
   ```typescript
   // REMOVE: communityName, subdomain, plan
   // KEEP: firstName, lastName, email, phone, password, confirmPassword
   ```
3. **Remove step 1 (community details) validation (lines 36-38):**
   ```typescript
   // Current step 1 maps to step 1 (identity)
   case 1:
     fieldsToValidate = ['firstName', 'lastName', 'email', 'phone'];
     break;
   case 2:
     fieldsToValidate = ['password', 'confirmPassword'];
     break;
   ```
4. **Switch submission from `POST /api/platform/tenants` to Better Auth (lines 86-128):**

   ```typescript
   // OLD (lines 89-104):
   const res = await fetch('/api/platform/tenants', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       name: data.communityName,
       slug: data.subdomain,
       plan: data.plan,
       admin: { firstName, lastName, email, phone, password },
     }),
   });

   // NEW — use authClient.signUp.email:
   import { authClient } from '@api/client';
   const { error } = await authClient.signUp.email({
     email: data.email,
     password: data.password,
     name: `${data.firstName} ${data.lastName}`,
     callbackURL: '/verify-email',
   });
   if (error) {
     throw new Error(error.message || 'Failed to create account');
   }
   ```

5. **Remove `handleSubdomainChange` (lines 130-133)** — no subdomain field remains.

**Post-submit redirect (line 121, preserved from current):**

```typescript
router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
```

**Pattern source:** The existing `authClient` import pattern is used in `src/app/(auth)/verify-email/page.tsx:4` — `import { authClient } from '@api/client'`. The `authClient.signUp.email()` call follows the standard Better Auth client API.

---

### 8. `src/app/(platform)/signup/page.tsx` (page component — MODIFY)

**Analog:** `src/app/(platform)/signup/page.tsx` — collapse to 2 steps

**Current structure (lines 1-298) key patterns to copy:**

- `'use client'` directive (line 1)
- Imports from `@features/auth` barrel (line 4): `useSignupForm`, `SignupHeader`, `SignupFormSection`, `SignupCTA`
- `PageLayout` wrapper (line 51): `<PageLayout background="fieldstone">`
- `PlatformFooter` at bottom (line 295)
- Error banner pattern (lines 59-63):
  ```tsx
  {
    error && (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {error}
      </div>
    );
  }
  ```
- Form field pattern (lines 66-79):
  ```tsx
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">Label</label>
    <input
      type="text"
      {...register('fieldName')}
      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
    />
    {errors.fieldName && <p className="mt-1 text-sm text-red-600">{errors.fieldName.message}</p>}
  </div>
  ```

**Changes:**

1. Steps array (line 44-48) → `[{ num: 1, label: 'Your Information' }, { num: 2, label: 'Create Account' }]`
2. **Remove Step 1 (lines 54-151)** — community name, subdomain, plan selection
3. Old Step 2 (lines 153-220) → becomes new Step 1 with updated title/desc:
   ```tsx
   title = 'Create your account';
   description = 'Enter your details to get started with NetComplex';
   ```
4. Old Step 3 (lines 222-293) → becomes new Step 2, WITHOUT the summary card (lines 259-282 — displays community details that no longer exist)
5. `SignupCTA` `totalSteps` → 2

---

### 9. `src/app/(platform)/home/page.tsx` (page component — MODIFY to add auth gate)

**Analog #1 (auth pattern):** `src/app/api/platform/setup/route.ts:32-35`

```typescript
const session = await auth.api.getSession({ headers: request.headers });
if (!session) {
  return apiError('AUTH_REQUIRED', 'Authentication required', 401);
}
```

**Analog #2 (layout shell):** `src/app/(platform)/home/page.tsx` (current, lines 1-19)

```typescript
'use client';

import { HeroSection, MissionSection, FeaturesSection, CTASection } from '@features/marketing';
import { PlatformFooter, PlatformHeader } from '@features/platform';

export default function PlatformHomePage() {
  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main>
        <HeroSection />
        <MissionSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <PlatformFooter />
    </div>
  );
}
```

**Target pattern:** The page becomes a client component that:

1. Checks `authClient.useSession()` for authentication
2. If no session → redirect to `/sign-in`
3. If `session.user.tenantId !== null` → redirect to dashboard (they already have a community)
4. If `session.user.tenantId === null` → render the landing UI (two cards: demo + create community)

**Auth client import pattern (from `src/app/(auth)/verify-email/page.tsx:4`):**

```typescript
import { authClient } from '@api/client';
```

**Loading state:** Use `src/widgets/dashboard/ui/HomeLayer.tsx:601-608` pattern:

```tsx
if (loading) {
  return (
    <div>
      <ZoneSkeleton />
      <ZoneSkeleton />
      <ZoneSkeleton />
    </div>
  );
}
```

**Guard pattern (from `src/widgets/dashboard/ui/HomeLayer.tsx:613`):**

```typescript
{tenant?.id && <SetupProgressCard tenantId={tenant.id} />}
// Equivalent conditional rendering — only show landing cards when tenantId is null
```

---

### 10. `src/features/auth/ui/CommunitySetupForm.tsx` (NEW component)

**Analog:** `src/app/(platform)/signup/page.tsx:54-151` (current Step 1 — community details being removed from signup) + `src/features/auth/ui/SignupFormSection.tsx`

**Form section wrapper pattern (from SignupFormSection.tsx:1-26):**

```typescript
import { ReactNode } from 'react';
import { SectionLayout } from '@shared/ui';

interface SignupFormSectionProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function SignupFormSection({ children, title, description }: SignupFormSectionProps) {
  return (
    <SectionLayout size="lg" className="flex-1">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-bark mb-2">{title}</h2>
          {description && <p className="text-lg text-slate-600">{description}</p>}
        </div>
        {children}
      </div>
    </SectionLayout>
  );
}
```

**Extracted community fields (from signup/page.tsx:65-139):**

```tsx
// Community Name field (lines 66-79)
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">Community Name</label>
  <input type="text" {...register('communityName')} placeholder="e.g. Soralia Village HOA"
    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
  {errors.communityName && (<p className="mt-1 text-sm text-red-600">{errors.communityName.message}</p>)}
</div>

// Subdomain field (lines 80-99) — with .netbones.co.za suffix
<div className="flex items-center">
  <input type="text" {...register('subdomain')} onChange={e => handleSubdomainChange(e.target.value)}
    placeholder="soralia"
    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-r-none" />
  <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-slate-500">.netbones.co.za</span>
</div>

// Plan selector (lines 113-137) — radio cards with pricing data
```

**Submission pattern (new — calls `POST /api/platform/tenants` with auth):**

```typescript
const res = await fetch('/api/platform/tenants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, slug, plan }), // NO admin block — user already exists
  credentials: 'include', // ← send session cookie (now authenticated)
});
```

**Barrel export:** Add to `src/features/auth/ui/index.ts:4`:

```typescript
export * from './CommunitySetupForm';
```

---

### 11. `src/app/api/platform/tenants/route.ts` (API route — MODIFY)

**Analog (auth pattern):** `src/app/api/platform/setup/route.ts:32-35` + `src/app/api/platform/setup/missions/route.ts:34-37`

**Current state:** Public, unauthenticated POST. Creates user + tenant in one operation.

**Target state:** Authenticated POST. Only creates the tenant; user already exists.

**Auth guard pattern (from platform/setup/route.ts:31-35):**

```typescript
// Authenticate
const session = await auth.api.getSession({ headers: request.headers });
if (!session) {
  return apiError('AUTH_REQUIRED', 'Authentication required', 401);
}
```

**Zod body validation pattern (from platform/setup/missions/route.ts:20-24 + 34-49):**

```typescript
const patchBodySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  missionKey: z.string().min(1, 'missionKey is required'),
  isCompleted: z.boolean(),
});

// Parse & validate body
let body: unknown;
try {
  body = await request.json();
} catch {
  return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
}
const parsed = patchBodySchema.safeParse(body);
if (!parsed.success) {
  return apiValidationError(parsed.error.message);
}
```

**Imports pattern (from `src/app/api/dashboard/stats/route.ts:1-14`):**

```typescript
import {
  auth,
  db,
  tenants,
  users,
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiConflict,
  apiInternalError,
  withErrorHandler,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
```

**Changes to existing route:**

1. Add `auth` import to the `@api/server` barrel import
2. Add `withErrorHandler` wrapper (current route uses raw `export async function POST`)
3. Add session check after body validation, before any DB operations
4. **Remove Steps 1 & 2** (user creation via Better Auth `fetch` + user existence check — lines 56-102)
5. Replace with: `userId = session.user.id`
6. **Remove cleanup on failure (lines 147-151)** — no user to delete since user pre-exists
7. Remove `admin` fields from request interface → `SignupRequest` becomes: `{ name, slug, plan }`
8. Keep: slug uniqueness check, tenant creation, `userId` link + role assignment, `initTenantSetup()`

**SignupRequest changes (lines 20-31):**

```typescript
// OLD — includes user creation fields
interface SignupRequest {
  name: string;
  slug: string;
  plan: TierLevel;
  admin: { firstName; lastName; email; phone; password };
}

// NEW — tenant-only (user exists in session)
interface SignupRequest {
  name: string;
  slug: string;
  plan: TierLevel;
}
```

---

### 12. `src/app/api/v1/platform/tenants/route.ts` (shim — NO CHANGE)

**Analog:** `src/app/api/v1/platform/tenants/route.ts:5` — existing re-export

```typescript
// Re-export from canonical route location
export { POST } from '@/app/api/platform/tenants/route';
```

No changes needed. The re-export automatically picks up the modified handler from `src/app/api/platform/tenants/route.ts`.

---

### 13. `src/entities/tenant/schema.ts` (schema — MODIFY)

**Analog:** `src/entities/tenant/schema.ts:17-45` — current signupSchema

**Current `signupSchema` (lines 17-45):** Three-step schema — communityName, subdomain, plan, firstName, lastName, email, phone, password, confirmPassword.

**Target:** Split into two schemas:

**13a. Identity-only signup schema (replaces signupSchema for Phase 1):**

```typescript
export const identitySignupSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50).trim(),
    lastName: z.string().min(1, 'Last name is required').max(50).trim(),
    email: z.string().min(1, 'Email is required').email().toLowerCase(),
    phone: z.string().regex(phoneRegex).optional().or(z.literal('')),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
```

**13b. Community setup schema (for relocated wizard):**

```typescript
export const communitySetupSchema = z.object({
  communityName: z.string().min(1, 'Community name is required').max(100).trim(),
  subdomain: z
    .string()
    .min(1)
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  plan: z.enum(['core', 'foundation', 'pro-max']),
});
```

**Pattern source:** The existing schema uses `z.object()` + `.refine()` for password matching (lines 42-45). Zod field patterns (`.min()`, `.max()`, `.regex()`, `.optional()`, `.trim()`, `z.enum()`) are already established.

---

### 14. `src/entities/tenant/api/with-tenant.ts` (consumer audit — NO CHANGE EXPECTED)

**Analog:** `src/entities/tenant/api/with-tenant.ts:16-44` — existing resolution

**Audit findings (CONTEXT.md:67):** `withTenant()` resolves by header/slug/host only — never reads `user.tenantId`. Throws if unresolved. No changes needed.

**Key lines for audit reference (lines 16-43):**

```typescript
export async function withTenant(): Promise<{ tenantId: string; tenantSlug: string }> {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id');
  const tenantSlug = headersList.get('x-tenant-slug');
  if (tenantId && tenantSlug) return { tenantId, tenantSlug };
  // ... resolution by slug/domain ...
  throw new Error('Tenant not resolved');
}
```

---

### 15. `src/middleware.ts` (consumer audit — NO CHANGE EXPECTED)

**Analog:** `src/middleware.ts:98-108` — `isPlatformRoute` already includes `/home`

```typescript
// src/middleware.ts:98-108
function isPlatformRoute(pathname: string): boolean {
  return (
    pathname === '/home' || // ← Already listed
    pathname === '/about' ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/admin/platform') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  );
}
```

The `/home` route is already classified as a platform-plane route. Middleware routes platform-host requests to `/home` correctly (line 221-223). No changes needed.

---

## Shared Patterns

### Authentication (Better Auth session check)

**Source:** `src/app/api/platform/setup/route.ts:31-35`
**Apply to:** `src/app/api/platform/tenants/route.ts`, `src/app/(platform)/home/page.tsx`

```typescript
const session = await auth.api.getSession({ headers: request.headers });
if (!session) {
  return apiError('AUTH_REQUIRED', 'Authentication required', 401);
}
```

### Error handling wrapper (API routes)

**Source:** `src/app/api/platform/setup/route.ts:23` + `src/app/api/dashboard/stats/route.ts:32`
**Apply to:** `src/app/api/platform/tenants/route.ts` (currently uses raw `try/catch`)

```typescript
export const POST = withErrorHandler(async (request: Request) => {
  // handler body
});
```

### Zod validation (API routes with body)

**Source:** `src/app/api/platform/setup/missions/route.ts:32-49`
**Apply to:** `src/app/api/platform/tenants/route.ts` (new request shape)

```typescript
const bodySchema = z.object({
  /* ... */
});
export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError('AUTH_REQUIRED', 'Authentication required', 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.message);
  // ... handler logic ...
});
```

### Form field pattern (React Hook Form + Zod)

**Source:** `src/app/(platform)/signup/page.tsx:66-79`
**Apply to:** `src/features/auth/ui/CommunitySetupForm.tsx`, modified `src/app/(platform)/signup/page.tsx`

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">Label</label>
  <input
    type="text"
    {...register('fieldName')}
    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
  />
  {errors.fieldName && <p className="mt-1 text-sm text-red-600">{errors.fieldName.message}</p>}
</div>
```

### Error banner pattern

**Source:** `src/app/(platform)/signup/page.tsx:59-63`
**Apply to:** All UI surfaces in this phase

```tsx
{
  error && (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
      {error}
    </div>
  );
}
```

### Loading button with spinner

**Source:** `src/features/auth/ui/SignupCTA.tsx:44-67`
**Apply to:** `src/features/auth/ui/CommunitySetupForm.tsx` (provisioning submission)

```tsx
{
  loading ? (
    <span className="flex items-center">
      <svg
        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      Creating Community...
    </span>
  ) : (
    'Create Community'
  );
}
```

### Barrel export pattern (features)

**Source:** `src/features/auth/index.ts:1-3` + `src/features/auth/ui/index.ts:1-3`
**Apply to:** New `CommunitySetupForm` component

```typescript
// src/features/auth/ui/index.ts — add line:
export * from './CommunitySetupForm';
```

### Auth client import (client-side)

**Source:** `src/app/(auth)/verify-email/page.tsx:4`
**Apply to:** `src/features/auth/model/useSignupForm.ts` (new Better Auth direct call), `src/app/(platform)/home/page.tsx` (session check)

```typescript
import { authClient } from '@api/client';
```

### Plan selection (pricing fetch)

**Source:** `src/app/(platform)/signup/page.tsx:26-42`
**Apply to:** `src/features/auth/ui/CommunitySetupForm.tsx` (unchanged plan fetching logic)

```typescript
useEffect(() => {
  async function fetchPlans() {
    try {
      const response = await fetch('/api/pricing');
      if (response.ok) {
        const { data: body } = await response.json();
        setPlans(body.plans);
      }
    } catch (error) {
      log.error({}, 'Failed to fetch pricing plans', error);
    } finally {
      setPlansLoading(false);
    }
  }
  fetchPlans();
}, []);
```

### Slug uniqueness check (API)

**Source:** `src/app/api/platform/tenants/route.ts:44-53` (current)
**Apply to:** Modified `src/app/api/platform/tenants/route.ts` (unchanged)

```typescript
const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, body.slug)).limit(1);

if (existingTenant.length > 0) {
  return apiConflict('Subdomain is already taken');
}
```

## No Analog Found

All files have close analogs — no gaps.

## Consumer Audit Surfaces (Phase 0 done criteria)

Per ADVISORY-031 §10, the following surfaces must be audited:

| Surface                           | File                                                 | Lines      | Action                                                              |
| --------------------------------- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| RLSContext type                   | `src/shared/api/db.ts`                               | 13-18      | `tenantId: string` → `string \| null`                               |
| runWithRLS null guard             | `src/shared/api/db.ts`                               | 360-361    | Skip `set_config('app.tenant_id')` when null                        |
| getRLSContext                     | `src/shared/api/rls-context.ts`                      | 14-16      | `user.tenantId` auto-becomes `string \| null` after Drizzle regen   |
| databaseHook (user.create.before) | `src/shared/api/auth.ts`                             | 256        | `?? tenantConfig.defaultSlug` → `?? null`                           |
| email branding callbacks          | `src/shared/api/auth.ts`                             | 117, 87-93 | `rawUser.tenantId as string \| undefined` already handles undefined |
| withTenant()                      | `src/entities/tenant/api/with-tenant.ts`             | 16-43      | Never reads `user.tenantId` — no change needed                      |
| HomeLayer tenant guard            | `src/widgets/dashboard/ui/HomeLayer.tsx`             | 613        | Already null-safe: `tenant?.id &&`                                  |
| RLS policies                      | `prisma/migrations/20260618160000_add_rls_policies/` | —          | Audit for null-safe `current_setting('app.tenant_id')` usage        |

## Metadata

**Analog search scope:** `prisma/schema/`, `prisma/migrations/`, `src/db/schema/`, `src/shared/api/`, `src/features/auth/`, `src/app/(platform)/`, `src/app/api/`, `src/entities/tenant/`, `src/middleware.ts`, `src/widgets/dashboard/`
**Files scanned:** ~60 (migration files, auth config, API routes, UI components, schemas, middleware)
**Pattern extraction date:** 2026-07-09
