## Preparing for Multi-Tenant Production

This document captures the practical steps and guardrails required before NetComplex hosts more than the Soralia Village tenant.
Right now the platform is effectively **single-tenant (Soralia-only)** with a **multi-tenant-ready schema**.

---

## 1. Current State Snapshot

- **Database schema**
  - Most domain tables already have a required `tenantId` column.
  - Better Auth tables:
    - `user.tenantId` — **required** (non-null) and populated via `additionalFields` with a default of `"soralia"`.
    - `account.tenantId`, `session.tenantId`, `verification.tenantId` — **nullable** to match Better Auth’s default insert behaviour.
- **Auth configuration**
  - `auth.ts` sets:
    - `user.additionalFields.tenantId.defaultValue = "soralia"`.
  - There is **no runtime tenant resolution** wired into sign-up/sign-in yet (no subdomain-based or invite-based tenant assignment).
- **Runtime behaviour**
  - Every new user created via Better Auth is implicitly a **Soralia user**.
  - The platform behaves as single-tenant; multi-tenant isolation is present in the schema but not exercised.

Implication: this setup is acceptable for Soralia-only production, but **must change** before Tenant #2 is onboarded.

---

## 2. Risks of Keeping Soralia as Default Tenant

- **Incorrect tenant assignment**
  - Any future sign-up flow (for another community) would silently assign users to `tenantId = "soralia"` if the default remains.
  - This directly violates tenant isolation and makes data leaks more likely.
- **Email uniqueness issues**
  - `user.email` is globally unique; with everyone under Soralia, the same email cannot belong to different tenants.
  - Introducing a second tenant later without adjusting this leads to confusing “email already in use” errors.
- **False sense of multi-tenant readiness**
  - Code paths appear multi-tenant (because they accept `tenantId`), but only one tenant is actually used.
  - Bugs in tenant scoping (`WHERE tenantId = ...`) will not be discovered until a second tenant is added.
- **Analytics and billing distortion**
  - Usage, billing, and analytics are all effectively “per Soralia”.
  - Cutting over to true multi-tenant requires a clear boundary in time and configuration.

---

## 3. Required Changes Before Tenant #2

These are **blocking items** that must be completed before onboarding any non-Soralia tenant.

### 3.1 Remove the Soralia Default in Auth

- In `auth.ts`, update the `user.additionalFields.tenantId` configuration:
  - **Remove** `defaultValue: "soralia"`.
  - Keep `type: "string"` and `required: true`.
- After this change, `tenantId` must be supplied explicitly by one of the supported flows below.

### 3.2 Choose and Implement a Tenant Resolution Strategy

Pick at least one of the recommended approaches from `MULTI_TENANT_SIGNUP.md`:

- **Invite-based sign-up (recommended to start)**
  - Admins create invites that contain `tenantId`.
  - Sign-up form validates the invite and assigns `user.tenantId` from it.
- **Subdomain-based sign-up (for self-service later)**
  - Middleware resolves tenant from the host (e.g. `tenant1.netbones.co.za`).
  - Sign-up reads `x-tenant-id` from headers and passes it into `auth.api.signUpEmail`.

Whichever strategy is chosen:

- **Invariant:** no user is created without a resolved `tenantId`.
- Enforce this in:
  - API route handlers (reject requests where tenant cannot be resolved),
  - Better Auth database hooks, if necessary.

### 3.3 Validate Existing Soralia Data

Run a one-time audit/migration script that:

- Confirms that **all existing users really belong to Soralia**.
- Ensures `user.tenantId` and any tenant-scoped domain tables use a consistent Soralia tenant id (e.g. `"soralia-village"` or a UUID).
- Optionally normalises `"soralia"` to the canonical Soralia tenant id so code never special-cases that string.

This creates a clean baseline: “before this date, all data is Soralia; after this date, tenant resolution must be explicit.”

---

## 4. Guardrails for Ongoing Development

To prevent regressions as multi-tenant work continues:

- **Auth**
  - No new code path may call Better Auth `signUp`/`createUser` without a resolved `tenantId`.
  - Consider adding Better Auth `databaseHooks.user.create.before` to assert that `tenantId` is present and valid.
- **API routes**
  - All API handlers must:
    - Call `withTenant()` (or equivalent) as their first operation.
    - Use the returned `tenantId` in all Drizzle queries.
- **Schema**
  - Keep `user.tenantId` and tenant-scoped domain table `tenantId` columns **required**.
  - Keep `account` / `session` / `verification` `tenantId` nullable **until** we wire strict hooks for them, then optionally harden.
- **Testing**
  - Add tests/fake data that bootstraps at least two tenants in development.
  - Verify that cross-tenant access is impossible (both at the application layer and, later, via RLS).

---

## 5. Optional Future Hardening of Auth Tables

Once the platform runs happily with multiple tenants:

- Revisit Better Auth tables (`account`, `session`, `verification`):
  - Re-add `NOT NULL` constraints on `tenantId`.
  - Implement Better Auth `databaseHooks` to:
    - Look up the associated `user` for each created row.
    - Copy `user.tenantId` to the auth table row before insert.
- This gives an additional safety net so auth data also obeys tenant boundaries at the database level.

Until then, the current strategy is:

- **Single canonical anchor:** `user.tenantId` (required).
- **Adapter tables:** tolerate nullable `tenantId` while focusing on getting the core multi-tenant flows and enforcement right.
