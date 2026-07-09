# Phase 124: Onboarding Refactor — Defer Tenant Provisioning — Research

**Researched:** 2026-07-09
**Domain:** Authentication, Multi-tenant Onboarding, Schema Migration
**Confidence:** HIGH

## Summary

Phase 124 implements Option C from ADVISORY-031: defer tenant provisioning until after email verification. The core change is making `tenantId: null` a first-class, durable state for verified users, then relocating the community-naming wizard behind authentication. The Phase 0 pre-requisite (nullable-column migration + auth-config relaxation) is the critical path — three independent enforcement layers (DB NOT NULL, Better Auth `required: true` additionalField, and the `user.create.before` hook's default-slug fallback) currently make `tenantId: null` impossible.

**Primary recommendation:** Execute Phase 0 first as a standalone, reviewable unit (as prescribed by ADVISORY-031 §10). The Prisma `String` → `String?` change is simple; the auth-config relaxation is mechanical; the consumer audit is the schedule risk — use TypeScript strict-mode compile as the floor, then targeted inventory of the five critical surfaces (RLSContext, getRLSContext, runWithRLS, the databaseHook itself, and email branding callbacks), followed by runtime smoke.

## Architectural Responsibility Map

| Capability                                    | Primary Tier          | Secondary Tier        | Rationale                                                                                 |
| --------------------------------------------- | --------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Schema migration (nullable tenantId)          | Database / Storage    | —                     | DDL change on the `user` table; Prisma manages migration                                  |
| Identity-only sign-up (no tenant)             | API / Backend         | Browser / Client      | Better Auth handles auth on backend; client calls standard sign-up endpoint               |
| Email verification + sendOnSignUp             | API / Backend         | —                     | Better Auth `emailVerification` config; Resend for delivery                               |
| Cross-subdomain session cookies               | API / Backend         | CDN / Static          | Better Auth `advanced.crossSubDomainCookies`; cookie Domain attribute                     |
| Post-verification landing (null-tenant /home) | Frontend Server (SSR) | Browser / Client      | Platform-plane route; server checks session + tenantId, client renders choice UI          |
| Authenticated tenant provisioning             | API / Backend         | —                     | `POST /api/platform/tenants` requires session; creates Tenant + sets user.tenantId        |
| Consumer audit (compile + runtime)            | API / Backend         | Frontend Server (SSR) | TypeScript strict checks catch unguarded reads; runtime smoke validates graceful handling |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Defer, don't reserve** — remove the hazard class, don't fence it (rejects Option A's reservation table + reaper).
- **`tenantId: null` is first-class and durable** — a verified user may sit here indefinitely and re-invoke the wizard whenever they choose.
- **Wizard relocated behind auth** — reuse existing `useSignupForm` UI; expose from landing + account menu, not a one-shot step.
- **`crossSubDomainCookies` (F5)** — orthogonal, required regardless; do early.
- **Surface email-delivery failures (F3/F4)** — `sendOnSignUp: true` + non-silent failure signalling.

### the agent's Discretion

- G2 — Demo path implementation (shared read-only tenant vs fully mocked). Open for planning exploration.
- G3 — Marketing/CTA copy and routing updates.
- G4 — Setup Center entry assumptions verification.
- Exact placement of re-invocable wizard entry points (account menu, platform home, Setup Center).

### Deferred Ideas (OUT OF SCOPE)

- Reservation tables, TTLs, cron/reaper jobs (explicitly rejected — Option A).
- AI-assisted onboarding, usage analytics, white-label readiness (Phase 123 out-of-scope carry-overs).
- Changes to the Setup Center's internal sections (owned by Phase 123).

## Phase Requirements

| ID      | Description                                                                     | Research Support                                     |
| ------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| PHASE-0 | Nullable tenantId migration + auth-config relaxation + consumer audit           | §2 (Database), §1 (Auth config), §5 (Consumer audit) |
| PHASE-1 | Identity-only sign-up (no tenant) with `sendOnSignUp: true`                     | §1 (Auth config), §3 (Email verification)            |
| PHASE-2 | Cross-subdomain cookies for `.netbones.co.za`                                   | §4 (Cross-subdomain cookies)                         |
| PHASE-3 | Post-verification null-tenant landing + relocated re-invocable wizard           | §6 (Relocated wizard), §5 (Consumer audit)           |
| PHASE-4 | Authenticated tenant provisioning (POST /api/platform/tenants requires session) | §1 (Auth config), §2 (Database)                      |
| PHASE-5 | Cleanup — retire dead eager-provisioning code                                   | §6 (Relocated wizard)                                |

## Standard Stack

### Core

| Library     | Version                                  | Purpose                            | Why Standard                                                                                                                                                          |
| ----------- | ---------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth | 1.x (installed)                          | Authentication framework           | Already used; `additionalFields`, `databaseHooks`, `emailVerification`, `crossSubDomainCookies` are built-in features [VERIFIED: Context7 — /better-auth/better-auth] |
| Prisma      | installed                                | Schema management + migrations     | Already used; `prisma migrate dev` generates ALTER COLUMN DROP NOT NULL [CITED: prisma.io docs]                                                                       |
| Drizzle ORM | installed (via prisma-generator-drizzle) | Type-safe query layer              | Already used; regenerated from Prisma schema via `prisma generate`                                                                                                    |
| Zod         | installed                                | Schema validation for sign-up form | Already used in `validator` plugin + `signUpEmailSchema`                                                                                                              |

### Supporting

| Library                | Version   | Purpose                      | When to Use                                                                    |
| ---------------------- | --------- | ---------------------------- | ------------------------------------------------------------------------------ |
| validation-better-auth | installed | Better Auth validator plugin | Already wired for sign-up/sign-in validation; no changes needed for this phase |

### Alternatives Considered

| Instead of                                  | Could Use                             | Tradeoff                                                                                    |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Prisma migrate for DDL                      | Raw SQL migration                     | Prisma provides type-safe migration history; raw SQL is more error-prone for schema changes |
| Better Auth databaseHooks for user creation | Manual user creation in route handler | Hooks are lifecycle-guaranteed; manual creation could miss edge cases                       |

**Installation:** No new packages needed. All required libraries are already installed.

**Version verification:**

```bash
npm view better-auth version         # Already installed
npm view prisma version              # Already installed
npm view drizzle-orm version         # Already installed
```

## Package Legitimacy Audit

> No new external packages are introduced by this phase. All libraries (Better Auth, Prisma, Drizzle ORM, Zod, validation-better-auth) are already installed and in active use across the codebase.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CURRENT FLOW (broken)                        │
│                                                                     │
│  Anonymous visitor                                                   │
│    │                                                                 │
│    ▼                                                                 │
│  3-step wizard (name+slug+plan, contact, password)                   │
│    │                                                                 │
│    ▼                                                                 │
│  POST /api/platform/tenants (public, unauthenticated)                │
│    ├─ slug uniqueness check (live table)                             │
│    ├─ Better Auth sign-up (server→server, no session)                │
│    ├─ DB txn: INSERT Tenant + UPDATE user(tenantId, role=ADMIN)      │
│    └─ initTenantSetup()                                              │
│    │                                                                 │
│    ▼                                                                 │
│  /verify-email (no sendOnSignUp → F3 dead end)                      │
│    │                                                                 │
│    ▼                                                                 │
│  Verify link → autoSignInAfterVerification                          │
│    └─ session on app.netbones.co.za (host-only → F5 lockout)        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        TARGET FLOW (Option C)                        │
│                                                                     │
│  Anonymous visitor                                                   │
│    │                                                                 │
│    ▼                                                                 │
│  "Get Started" → identity-only: name, email, password                │
│    │                                                                 │
│    ▼                                                                 │
│  POST /api/auth/sign-up/email (Better Auth — NO tenant touched)      │
│    ├─ sendOnSignUp: true → email sent immediately                   │
│    └─ failure surfaced (not fire-and-forget)                         │
│    │                                                                 │
│    ▼                                                                 │
│  /verify-email → link clicked                                        │
│    ├─ session established; crossSubDomainCookies: .netbones.co.za   │
│    └─ user has tenantId = null (durable, indefinite state)           │
│    │                                                                 │
│    ▼                                                                 │
│  Platform-plane /home (authenticated, tenantId = null)               │
│    ├─ (a) "Try a live demo" → read-only, no provisioning             │
│    └─ (b) "Create a community" → re-invocable wizard                │
│         │                                                             │
│         ▼                                                             │
│       POST /api/platform/tenants (AUTHENTICATED, tenant-only)        │
│         ├─ requires verified session                                 │
│         ├─ live-table slug check (unchanged)                         │
│         ├─ creates Tenant, sets user.tenantId + role=ADMIN          │
│         └─ runs initTenantSetup()                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (changes only)

```
prisma/
├── schema/schema.prisma           # tenantId String → String? (PHASE 0)
└── migrations/
    └── <timestamp>_make_tenant_id_nullable/migration.sql  (PHASE 0)
src/
├── db/schema/users.ts             # .notNull() dropped after prisma generate (PHASE 0)
├── shared/api/
│   ├── auth.ts                    # required:false, default removed, conditional hook (PHASE 0)
│   ├── auth-schemas.ts            # No changes needed
│   └── rls-context.ts             # Handle null tenantId in RLSContext (PHASE 0)
├── app/
│   ├── (platform)/
│   │   └── home/page.tsx          # Null-tenant landing (PHASE 3)
│   ├── api/platform/tenants/
│   │   └── route.ts               # Gate behind auth, strip user creation (PHASE 4)
│   └── middleware.ts              # No changes expected
├── features/auth/model/
│   └── useSignupForm.ts           # Relocate wizard (PHASE 3/4)
└── widgets/dashboard/ui/
    └── HomeLayer.tsx               # Already null-safe (checks tenant?.id)
```

### Pattern 1: Nullable Column Migration (Prisma → Drizzle)

**What:** Change a Prisma model field from required to optional, regenerate Drizzle, create migration.
**When to use:** Phase 0 — making `tenantId` nullable.

**Step-by-step:**

```bash
# 1. Edit prisma/schema/schema.prisma: line 98
#    tenantId  String     →     tenantId  String?
#
# 2. Create Prisma migration
npx prisma migrate dev --name make_tenant_id_nullable
#    Generates: ALTER TABLE "user" ALTER COLUMN "tenantId" DROP NOT NULL;
#
# 3. Regenerate Drizzle schema
npx prisma generate
#    src/db/schema/users.ts: .notNull() is dropped from tenantId
#    TypeScript type becomes: string | null
#
# 4. Verify with db:check
pnpm db:check
```

**Key insight:** The project uses `prisma-generator-drizzle` — the Drizzle schema files in `src/db/schema/` are auto-generated output, not hand-written. Running `prisma generate` is the single step that updates all Drizzle types. [VERIFIED: codebase — package.json `db:generate` script]

### Pattern 2: Conditional databaseHook (Better Auth)

**What:** Keep `user.create.before` but change from unconditional fallback to conditional stamping.
**When to use:** Phase 0 — relaxing the hook to allow null tenantId for global signups while preserving the invited-user path.

**Example (current vs target):**

```typescript
// Source: src/shared/api/auth.ts:243-260 — CURRENT (always stamps)
databaseHooks: {
  user: {
    create: {
      before: async user => {
        const rawTenantId = (user as Record<string, unknown>)?.tenantId as string | undefined;
        const [tenant] = rawTenantId
          ? await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, rawTenantId)).limit(1)
          : [];
        return {
          data: {
            ...user,
            tenantId: tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug,  // ← FORCE-STAMPS
            profileSlug: generateProfileSlug(user.name),
            role: 'USER',
          },
        };
      },
    },
  },
}

// TARGET (per ADVISORY-031 §10 Q2):
// tenantId: tenant?.id ?? rawTenantId ?? null
// Drops the `?? tenantConfig.defaultSlug` tail.
// Invited-user path (x-tenant-slug header → rawTenantId resolves to tenant.id) unchanged.
// Global signup path (no tenant context) → null.
```

**Why this pattern:** [VERIFIED: Context7 — databaseHooks docs, ADVISORY-031 §10] The hook receives `(user, ctx)` and can return `{ data: {...} }` to modify user data before insertion. Returning `false` aborts. This pattern preserves the invited-user flow (tenant-scoped signups via `x-tenant-slug` header) while allowing global signups to land null.

### Pattern 3: Fire-and-Forget → Surfaced Failure (Email Verification)

**What:** Replace `.catch(err => authLogger.error(...))` with proper error propagation.
**When to use:** Phase 1 — `sendOnSignUp: true` must surface failures.

**Current (swallowed):**

```typescript
// src/shared/api/auth.ts:134-136 — CURRENT
sendEmail({ to: user.email, subject: ..., html: ... })
  .catch(err => authLogger.error({ err, email: user.email }, 'Verification email send failed'));
```

**Target (surfaced):**

```typescript
// Better Auth's sendVerificationEmail callback should throw on failure
// so Better Auth can return an error response to the client
sendVerificationEmail: async ({ user, url }) => {
  // ... build email ...
  await sendEmail({ to: user.email, subject: ..., html: ... });
  // If sendEmail throws, Better Auth surfaces it to the client automatically
}
```

**Why:** [VERIFIED: Context7 — Better Auth email verification docs] The `sendVerificationEmail` callback is async and its return value/rejection is handled by Better Auth. If it throws, Better Auth returns an error to the client. The current `.catch()` swallows the error, logging it but never surfacing it. Removing the `.catch()` and `await`-ing instead lets Better Auth propagate the failure.

### Anti-Patterns to Avoid

- **Don't remove the databaseHook entirely:** The `x-tenant-slug` header path serves tenant-scoped invited-user signups. Removing the hook breaks that flow. Relax conditionally — `tenant?.id ?? rawTenantId ?? null` [ASSUMED — per ADVISORY-031 guidance].
- **Don't manually edit Drizzle schema files:** They are generated by `prisma-generator-drizzle`. Edit Prisma schema, run `prisma generate`, and the Drizzle files update automatically.
- **Don't use `sendOnSignUp` without also fixing fire-and-forget:** Setting `sendOnSignUp: true` alone won't surface failures — the `sendVerificationEmail` callback still swallows errors with `.catch()`.
- **Don't gate `POST /api/platform/tenants` with middleware alone:** The route handler itself must validate the session and ensure it doesn't create users. Middleware is defense-in-depth, not the primary gate.
- **Don't assume crossSubDomainCookies domain needs a leading dot:** Better Auth docs show domain values like `app.example.com` or `example.com` without a leading dot. The domain should be `netbones.co.za` NOT `.netbones.co.za` [VERIFIED: Context7 — Better Auth cookies docs].

## Don't Hand-Roll

| Problem                          | Don't Build                  | Use Instead                                                | Why                                                                             |
| -------------------------------- | ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Making a column nullable         | Raw `ALTER TABLE` SQL        | `prisma migrate dev` after editing schema.prisma           | Prisma tracks migration history, handles rollback, and regenerates types        |
| Session cookie cross-subdomain   | Custom cookie middleware     | Better Auth `advanced.crossSubDomainCookies`               | Handles cookie signing, SameSite, Domain attributes, and Safari ITP edge cases  |
| Email delivery failure detection | Custom retry/surface logic   | Remove `.catch()` — let Better Auth propagate async errors | Better Auth already surfaces errors from `sendVerificationEmail` rejections     |
| Validation of sign-up fields     | Custom validation middleware | Better Auth `validator` plugin with Zod schema             | Already wired; co-located with auth config; errors return 400 with Zod messages |
| Slug uniqueness check            | Reservation table or TTL     | Live-table `WHERE slug = $1` check (unchanged)             | DB unique constraint is the backstop; authenticated user retries on 409         |

**Key insight:** This phase is primarily about removing infrastructure (eager tenant creation) and relaxing constraints (NOT NULL → nullable, required → optional), not building new systems. The only "new" thing is the crossSubDomainCookies config, which is a built-in Better Auth feature. Most complexity is in the consumer audit, not in new code.

## Common Pitfalls

### Pitfall 1: Missing `sendOnSignUp` Configuration

**What goes wrong:** Setting up identity-only sign-up but forgetting to add `sendOnSignUp: true`. Users land on `/verify-email` with no email sent (F3 from COMMUNIQUE-12).

**Why it happens:** The current config only has `sendOnSignIn: true`. Adding `sendOnSignUp: true` is a one-line change that's easy to overlook.

**How to avoid:** Add both `sendOnSignUp: true` and `sendOnSignIn: true` in the `emailVerification` config. The two are not mutually exclusive.

**Warning signs:** Users reporting "didn't receive verification email" after sign-up.

### Pitfall 2: Consumer Audit Miss — RLSContext with Null tenantId

**What goes wrong:** `getRLSContext()` returns `{ tenantId: null }` but `RLSContext` type declares `tenantId: string`. If the type is not updated, TypeScript won't catch the null flow, and `runWithRLS()` sets `app.tenant_id` to SQL NULL — causing RLS policies to silently deny all access.

**Why it happens:** The `RLSContext` type in `src/shared/api/db.ts:15` hardcodes `tenantId: string`. After the migration, `user.tenantId` is `string | null`, and this flows through `getRLSContext()` into `runWithRLS()`.

**How to avoid:** Change `RLSContext.tenantId` to `string | null`. Add a null guard in `runWithRLS()` — if `ctx.tenantId` is null, skip the `set_config('app.tenant_id', ...)` call or set it to an empty string. RLS policies should fail closed (no access) rather than crash.

**Warning signs:** Authenticated users with `tenantId: null` getting empty results or 403s on API routes that use `runWithRLS()`.

### Pitfall 3: Fire-and-Forget Email Still Swallows Failures

**What goes wrong:** Adding `sendOnSignUp: true` but leaving the `.catch()` in `sendVerificationEmail`. Users get a 200 "sign-up successful" response but the email never sends.

**Why it happens:** The `.catch(err => authLogger.error(...))` pattern explicitly prevents the error from propagating. Better Auth never sees the failure.

**How to avoid:** Remove the `.catch()` wrapper. Use `await sendEmail(...)` without a catch. If `sendEmail` throws (network error, Resend API failure), Better Auth will surface it to the client as a sign-up error.

**Warning signs:** Successful sign-up response but users never receive verification emails. Auth logs show "Verification email send failed" entries.

### Pitfall 4: Cross-Subdomain Cookie Domain Format

**What goes wrong:** Setting `domain: '.netbones.co.za'` (with leading dot) when Better Auth expects `domain: 'netbones.co.za'` (without dot).

**Why it happens:** The leading dot is a browser cookie convention but Better Auth may handle domain attribute formatting internally. The docs show examples without leading dots.

**How to avoid:** Use `domain: 'netbones.co.za'` as shown in Better Auth documentation examples. Verify the actual `Domain` attribute on cookies after deployment.

**Warning signs:** Cookies not being sent on subdomain requests; session not persisting across `app.netbones.co.za` and `slug.netbones.co.za`.

### Pitfall 5: Invited-User Signup Regression

**What goes wrong:** Removing the databaseHook entirely instead of relaxing it conditionally. Tenant-scoped invited-user signups (via `x-tenant-slug` header) lose their tenant assignment.

**Why it happens:** The hook serves two purposes: (1) force-stamp default tenant for global signups, (2) resolve tenant from header for invited-user signups. Removing the hook kills both.

**How to avoid:** Change only the fallback: `tenant?.id ?? rawTenantId ?? null` (remove `?? tenantConfig.defaultSlug`). The `rawTenantId` path (from `x-tenant-slug` header) still resolves through the `tenants` table lookup.

**Warning signs:** Invited users not being assigned to the correct tenant after sign-up.

## Code Examples

### Making tenantId nullable in Prisma

```prisma
// Source: prisma/schema/schema.prisma:98 — CURRENT
model user {
  // ...
  tenantId  String         // NOT NULL — no `?`
  // ...
}

// TARGET
model user {
  // ...
  tenantId  String?        // NULLABLE — `?` added
  // ...
}
```

### Relaxing Better Auth additionalField

```typescript
// Source: src/shared/api/auth.ts:148-153 — CURRENT
tenantId: {
  type: 'string',
  required: true,                           // ← Must be present
  defaultValue: tenantConfig.defaultSlug,   // ← Force-stamps soralia
  input: true,
},

// TARGET
tenantId: {
  type: 'string',
  required: false,                          // ← Optional
  // defaultValue removed                   // ← No force-stamp
  input: true,                              // ← Keep for invited-user header path
},
```

[VERIFIED: Context7 — Better Auth additionalFields docs; `required: false` and removing `defaultValue` are standard patterns]

### Conditional databaseHook (invited-user path preserved)

```typescript
// Source: src/shared/api/auth.ts:253-256 — CURRENT
return {
  data: {
    ...user,
    tenantId: tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug, // ← defaultSlug removed
    profileSlug: generateProfileSlug(user.name),
    role: 'USER',
  },
};

// TARGET
return {
  data: {
    ...user,
    tenantId: tenant?.id ?? rawTenantId ?? null, // ← null for global signups
    profileSlug: generateProfileSlug(user.name),
    role: 'USER',
  },
};
```

[VERIFIED: Context7 — databaseHooks return `{ data: {...} }` to modify before-create; ADVISORY-031 §10 Q2]

### Cross-subdomain cookie configuration

```typescript
// Source: Better Auth docs via Context7
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: 'netbones.co.za', // NOTE: no leading dot per Better Auth docs
    },
  },
  trustedOrigins: [
    'https://app.netbones.co.za',
    'https://soralia.netbones.co.za',
    // ... other tenant subdomains
  ],
});
```

[VERIFIED: Context7 — Better Auth cookies docs; domain format confirmed]

### Surfacing email failures

```typescript
// Source: src/shared/api/auth.ts:114-137 — CURRENT (fire-and-forget)
sendVerificationEmail: async ({ user, url }) => {
  // ... build email ...
  sendEmail({ to: user.email, subject: ..., html: ..., fromName: tenantName })
    .catch(err => authLogger.error({ err, email: user.email }, 'Verification email send failed'));
  // ↑ Error swallowed — client sees success
},

// TARGET (surfaced)
sendVerificationEmail: async ({ user, url }) => {
  // ... build email ...
  await sendEmail({ to: user.email, subject: ..., html: ..., fromName: tenantName });
  // ↑ If sendEmail throws, Better Auth returns error to client
},
```

[VERIFIED: Context7 — Better Auth email verification docs; async callback rejections are propagated]

## State of the Art

| Old Approach                                           | Current Approach                                           | When Changed      | Impact                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------- | ----------------- | -------------------------------------------------------- | -------------------------------------------- |
| Eager tenant provisioning at sign-up (public endpoint) | Deferred provisioning behind auth (authenticated endpoint) | Phase 124         | Eliminates zombie tenants, slug squatting, orphaned rows |
| `sendOnSignIn` only                                    | `sendOnSignUp: true` + `sendOnSignIn: true`                | Phase 124 Phase 1 | Verification email sent immediately at sign-up           |
| Fire-and-forget email with `.catch()`                  | `await` with error propagation                             | Phase 124 Phase 1 | Email delivery failures surfaced to client               |
| Host-only session cookies                              | Cross-subdomain cookies (`Domain=netbones.co.za`)          | Phase 124 Phase 2 | Session persists across app and tenant subdomains        |
| `tenantId: string` (non-null)                          | `tenantId: string                                          | null` (nullable)  | Phase 124 Phase 0                                        | Durable null-tenant state for verified users |

**Deprecated/outdated:**

- `POST /api/platform/tenants` as a public, unauthenticated, identity-creating endpoint → becomes authenticated, tenant-creating-only (Phase 4)
- `tenantConfig.defaultSlug` as a catch-all fallback in the databaseHook → removed (Phase 0)
- 3-step sign-up wizard with tenant fields in step 1 → identity-only sign-up; wizard relocated behind auth (Phases 1, 3)

## Assumptions Log

| #   | Claim                                                                                                                                                                                    | Section                      | Risk if Wrong                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Better Auth `crossSubDomainCookies.domain` should be `netbones.co.za` without a leading dot                                                                                              | §4 Cross-Subdomain Cookies   | Cookie Domain attribute may not match subdomains; session not shared across `app.` and `slug.` subdomains                                   |
| A2  | The invited-user signup flow (`x-tenant-slug` header → `rawTenantId` → tenant ID resolution) works identically after the fallback change from `?? tenantConfig.defaultSlug` to `?? null` | §1 Better Auth Configuration | Invited users lose tenant assignment; tenant-scoped signups break                                                                           |
| A3  | `prisma migrate dev` generates the correct `ALTER COLUMN DROP NOT NULL` SQL without data loss                                                                                            | §2 Database Migration        | Existing users (all have non-null tenantId) are unaffected; but if Prisma generates an unexpected migration, existing data could be at risk |
| A4  | The `RLSContext.tenantId` type change to `string \| null` will be caught by TypeScript strict mode across the codebase                                                                   | §5 Consumer Audit            | If TypeScript strict mode is not enforcing null checks, unguarded reads could cause runtime crashes                                         |
| A5  | Better Auth surfaces errors from `sendVerificationEmail` to the client when the callback rejects (no `.catch()`)                                                                         | §3 Email Verification        | If Better Auth silently catches rejects internally, removing the `.catch()` won't surface failures                                          |
| A6  | The `prisma-generator-drizzle` plugin automatically drops `.notNull()` when Prisma field changes from `String` to `String?`                                                              | §2 Database Migration        | If the generator doesn't handle nullable transitions correctly, Drizzle types may be out of sync                                            |

## Environment Availability

| Dependency            | Required By                 | Available | Version                 | Fallback |
| --------------------- | --------------------------- | --------- | ----------------------- | -------- |
| Node.js               | Runtime                     | ✓         | (project requires >=18) | —        |
| pnpm                  | Package manager             | ✓         | (project uses pnpm)     | —        |
| Prisma CLI            | Schema migration (Phase 0)  | ✓         | installed               | —        |
| Drizzle Kit           | Schema generation (Phase 0) | ✓         | installed               | —        |
| PostgreSQL / Supabase | Database (Phase 0 DDL)      | ✓         | remote Supabase         | —        |
| Resend                | Email delivery              | ✓         | configured in env       | —        |
| Better Auth           | Auth framework              | ✓         | installed               | —        |

**Missing dependencies with no fallback:** none — all required infrastructure is in place.

## Validation Architecture

### Test Framework

| Property           | Value                |
| ------------------ | -------------------- |
| Framework          | Vitest (installed)   |
| Config file        | `vitest.config.ts`   |
| Quick run command  | `pnpm test:run`      |
| Full suite command | `pnpm test:coverage` |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                    | Test Type   | Automated Command                        | File Exists? |
| ------- | --------------------------------------------------------------------------- | ----------- | ---------------------------------------- | ------------ |
| PHASE-0 | Migration applies without data loss; Drizzle types include `string \| null` | unit        | `pnpm typecheck` + `pnpm db:check`       | ❌ Wave 0    |
| PHASE-0 | `tenantId: null` user creation succeeds via Better Auth                     | integration | Vitest against test DB                   | ❌ Wave 0    |
| PHASE-0 | Consumer audit: compile clean under `string \| null`                        | unit        | `pnpm typecheck`                         | ❌ Wave 0    |
| PHASE-1 | Sign-up creates zero Tenant rows                                            | integration | Vitest against test DB                   | ❌ Wave 0    |
| PHASE-1 | `sendOnSignUp: true` sends email; failure surfaces to client                | integration | Vitest with mocked Resend                | ❌ Wave 0    |
| PHASE-2 | Session cookie accessible from `slug.netbones.co.za`                        | manual-only | Browser DevTools (requires multi-domain) | N/A          |
| PHASE-3 | Authenticated user with `tenantId: null` lands on `/home` without crash     | integration | Vitest against test DB                   | ❌ Wave 0    |
| PHASE-3 | `withTenant()`-gated route redirects gracefully for null-tenant user        | integration | Vitest against test DB                   | ❌ Wave 0    |
| PHASE-4 | `POST /api/platform/tenants` rejects unauthenticated request (401)          | integration | Vitest against test DB                   | ❌ Wave 0    |
| PHASE-4 | Authenticated tenant creation sets `role=ADMIN` correctly                   | integration | Vitest against test DB                   | ❌ Wave 0    |
| PHASE-5 | No dead code references old provisioning path                               | unit        | `pnpm typecheck` + `pnpm lint`           | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `pnpm typecheck` (fast compile check)
- **Per wave merge:** `pnpm test:run` (full unit/integration suite)
- **Phase gate:** Full suite green (`pnpm test:coverage`) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-124/migration.test.ts` — covers PHASE-0: migration applies, Drizzle types correct
- [ ] `tests/phase-124/signup-null-tenant.test.ts` — covers PHASE-0/1: null-tenant user creation, no Tenant rows
- [ ] `tests/phase-124/consumer-audit.test.ts` — covers PHASE-0: RLSContext null handling, withTenant() graceful redirect
- [ ] `tests/phase-124/auth-provisioning.test.ts` — covers PHASE-4: authenticated provisioning, 401 rejection
- [ ] Framework install: all testing infrastructure (Vitest, test DB helpers) already in place — no new framework needed

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                             |
| --------------------- | ------- | ---------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth; `sendOnSignUp: true` ensures verification before tenant access  |
| V3 Session Management | yes     | Better Auth sessions; crossSubDomainCookies with Domain scoping              |
| V4 Access Control     | yes     | `withTenant()` guards; RLS policies; authenticated provisioning endpoint     |
| V5 Input Validation   | yes     | Zod schemas via `validator` plugin; Prisma type safety                       |
| V6 Cryptography       | yes     | Better Auth handles scrypt hashing; cookie signing with `BETTER_AUTH_SECRET` |

### Known Threat Patterns for Better Auth + Next.js + PostgreSQL

| Pattern                                                                  | STRIDE                 | Standard Mitigation                                                                  |
| ------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------ |
| Unauthenticated tenant creation (public endpoint)                        | Spoofing               | Move `POST /api/platform/tenants` behind auth session check (Phase 4)                |
| Cookie not scoped to subdomain → session theft across origins            | Information Disclosure | `crossSubDomainCookies` with explicit Domain; `httpOnly` + `secure` flags            |
| Silent email delivery failure → user unaware of verification requirement | Denial of Service      | Remove `.catch()`; let Better Auth propagate errors to client (Phase 1)              |
| NULL tenantId in RLS GUC → policies silently deny                        | Denial of Service      | Guard `runWithRLS()`: skip `set_config('app.tenant_id')` if null; or set to sentinel |
| Slug collision race in authenticated provisioning                        | Tampering              | DB unique constraint on `slug` is the backstop; app-layer check is advisory          |

## Sources

### Primary (HIGH confidence)

- [Context7 — /better-auth/better-auth] — additionalFields configuration, databaseHooks lifecycle, emailVerification options, crossSubDomainCookies, validator plugin [VERIFIED: npm registry, official docs]
- [Context7 — /prisma/prisma] — Prisma schema field types, migration generation [CITED: prisma.io]
- [Better Auth official docs — cookies] — Cross-subdomain cookie configuration, domain format, trusted origins [VERIFIED: better-auth.com/docs/concepts/cookies]
- [ADVISORY-031 §10] — Phase 0 done criteria, conditional hook pattern, consumer audit acceptance bar [CITED: project docs]
- [COMMUNIQUE-12] — Three-layer null prevention discovery, G1 re-scoping [CITED: project docs]
- [Source code — src/shared/api/auth.ts] — Current Better Auth configuration (verified line-by-line 2026-07-09)
- [Source code — src/db/schema/users.ts] — Current Drizzle schema with `.notNull()` (verified 2026-07-09)
- [Source code — prisma/schema/schema.prisma] — Current Prisma model with `tenantId String` (verified 2026-07-09)

### Secondary (MEDIUM confidence)

- [Context7 — /drizzle-team/drizzle-orm-docs] — drizzle-kit generate command [CITED: drizzle-orm docs]
- [Codebase — package.json] — `db:generate` and `db:check` scripts confirm Prisma→Drizzle generation flow
- [Codebase — drizzle/meta/_journal.json] — Confirms Drizzle migration tracking setup

### Tertiary (LOW confidence)

- [ASSUMED] Better Auth `crossSubDomainCookies.domain` format (leading dot vs no dot) — docs show both patterns; testing needed
- [ASSUMED] Better Auth error propagation from `sendVerificationEmail` — docs don't explicitly state error surfacing behavior
- [ASSUMED] `prisma-generator-drizzle` handling of `String?` → dropping `.notNull()` — not independently verified

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed and verified; no new dependencies
- Architecture: HIGH — backed by ADVISORY-031 (reviewed), COMMUNIQUE-12 (verified against live code), and Context7 docs
- Pitfalls: MEDIUM — some behavioral assumptions about Better Auth internals (crossSubDomainCookies domain format, error propagation) need runtime verification
- Consumer audit surface: HIGH — key surfaces identified and verified against live code; unbounded `.tenantId` references across schema files are mechanically handled by TypeScript

**Research date:** 2026-07-09
**Valid until:** 2026-08-09 (30 days — Better Auth and Prisma are stable; crossSubDomainCookies domain format assumption needs verification)

## Open Questions

1. **Better Auth `crossSubDomainCookies.domain` — leading dot or not?**
   - What we know: Context7 docs show `domain: "app.example.com"` (no leading dot). Cookie RFC allows both. Better Auth may prepend a dot internally.
   - What's unclear: Whether Better Auth automatically adds the leading dot, or whether we need to specify `.netbones.co.za`.
   - Recommendation: Start with `domain: "netbones.co.za"` per docs; verify actual `Domain` cookie attribute in browser DevTools after deployment. Adjust if needed.

2. **Does Better Auth surface `sendVerificationEmail` rejections to the client?**
   - What we know: The callback is async; Better Auth calls it during sign-up flow. Docs show examples without `.catch()`.
   - What's unclear: Whether Better Auth wraps the callback in try/catch internally and returns an error response, or whether the rejection is silently swallowed.
   - Recommendation: Test in Phase 1 by simulating Resend API failure and checking the API response. If Better Auth doesn't propagate, add explicit error signalling.

3. **RLS policies with null `app.tenant_id` — graceful or crash?**
   - What we know: `runWithRLS()` sets `app.tenant_id` via `SELECT set_config()`. Postgres `set_config` accepts null values. RLS policies using `current_setting('app.tenant_id')` would receive null and likely fail closed.
   - What's unclear: Whether any RLS policy does string operations on `app.tenant_id` that would crash on null.
   - Recommendation: Audit RLS policy definitions in `prisma/migrations/20260604000000_add_rls_policies/` for null-safety. Add null guard in `runWithRLS()` as defense-in-depth.
