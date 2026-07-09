# Phase 124: Onboarding Refactor — Defer Tenant Provisioning — Context

**Source:** ADVISORY-031 — Onboarding Refactor: Defer Tenant Provisioning Until Post-Verification (Option C — "defer, don't reserve"). Supersedes the ADVISORY-030 draft; §10 is the formal response to COMMUNIQUE-12.
**BD issue:** soralia-village-bawf (P1, GSD-escalated)
**Related:** soralia-village-zbvq (401 hotfix — committed `2707e9b6`), soralia-village-0jh1 (Phase 123 Setup Center)
**Milestone:** M4 Production-Ready / M5 Anchor Tenant Launch (confirm placement at roadmap)
**Priority:** High
**Depends on:** Phase 123 (Setup Center) — **complete**. This phase picks up the signup/registration change that Phase 123 explicitly deferred (see `123-CONTEXT.md` Out of Scope).

> **✅ Prerequisite satisfied (2026-07-09):** `phase-123-setup-center` is **merged into
> `dev`**. The 401 hotfix (`2707e9b6`) and the analysis docs (`ONBOARDING_REFACTOR.md`,
> `docs/advisories/ADVISORY-031.md`) are now on `dev`. Open the Phase 124 worktree off `dev`.

## Current State (the gap)

`Get Started → /signup` provisions a live tenant + subdomain **before** the user's email
is verified, via a public, unauthenticated `POST /api/platform/tenants` that creates the
user _and_ the tenant server-to-server (no browser session). If verification never
completes, the result is an orphaned, slug-squatting, inaccessible tenant.

Six failure modes (from `ONBOARDING_REFACTOR.md`, verified in discovery 2026-07-08):

- **F1** Tenant + slug created at signup, before verification → zombie tenants.
- **F2** Slug uniqueness checked against the live table only, no expiry/cleanup → permanent squatting.
- **F3** No `sendOnSignUp` (only `sendOnSignIn: true`) → user lands on `/verify-email` with no email sent.
- **F4** Verification email send is fire-and-forget `.catch` → silent delivery failure.
- **F5** Verify/auto-sign-in completes on `app.netbones.co.za`; cookie is host-only (no `crossSubDomainCookies`) → owner locked out of `slug.netbones.co.za`.
- **F6** Re-submitting the same signup hits 409 → no self-service recovery.

## Target Architecture (Option C — defer, don't reserve)

No tenant, slug, subdomain, or reservation of any kind exists until the user is a
**verified identity**. The community-naming wizard is **relocated, not deleted** — the same
UI is re-served behind auth and made re-invocable on demand.

```
Anonymous visitor
  → "Get Started" → identity-only step: name, email, password
  → POST /api/auth/sign-up/email (Better Auth standard — NO tenant touched)
      → sendOnSignUp: true — verification email sent immediately, failures surfaced
  → /verify-email → link clicked
      → session established; crossSubDomainCookies scoped to .netbones.co.za
      → user has tenantId = null — a durable, valid, INDEFINITE state
  → platform-plane landing (/home) with a non-blocking choice, NO EXPIRY:
      (a) "Try a live demo"        (gate G2 — read-only tenant vs fully mocked)
      (b) "Create a community"     → invokes the relocated wizard (name/slug/plan)
  → POST /api/platform/tenants — now AUTHENTICATED, tenant-only (no user creation):
      requires verified session; live-table slug check unchanged;
      creates Tenant, sets user.tenantId + role=ADMIN, runs initTenantSetup().
      No orphan risk — worst case is a 409 the signed-in user retries.
```

Key structural change: **`POST /api/platform/tenants` moves from public + identity-creating
→ authenticated + tenant-creating-only.** No new tables, TTLs, or reaper jobs.

## Key Design Decisions

- **Defer, don't reserve** — remove the hazard class, don't fence it (rejects Option A's reservation table + reaper).
- **`tenantId: null` is first-class and durable** — a verified user may sit here indefinitely and re-invoke the wizard whenever they choose.
- **Wizard relocated behind auth** — reuse existing `useSignupForm` UI; expose from landing + account menu, not a one-shot step.
- **`crossSubDomainCookies` (F5)** — orthogonal, required regardless; do early.
- **Surface email-delivery failures (F3/F4)** — `sendOnSignUp: true` + non-silent failure signalling.

## Discovery Findings (2026-07-08, verified against live files)

- **Blast radius is small:** only `src/features/auth/model/useSignupForm.ts:89` calls `POST /api/platform/tenants` in production (plus a `api/v1/platform/tenants` re-export shim and a doc-comment). Safe to gate behind auth.
- **`withTenant()` resolves by header/slug/host only** (`src/entities/tenant/api/with-tenant.ts`) — never reads `user.tenantId`; throws if unresolved. The null-tenant landing **must be a platform-plane route** (`/home`), not a `(tenant)` route.
- **No demo-tenant concept exists** anywhere → G2 is greenfield.
- **Dashboard already guards on tenant presence** — `HomeLayer.tsx:613` renders `SetupProgressCard` only when `tenant?.id` exists.
- **🔴 BLOCKING SURPRISE (expands G1):** `tenantId: null` is currently **impossible**:
  - `src/db/schema/users.ts:6` → `tenantId: text('tenantId').notNull()` (DB NOT NULL)
  - `src/shared/api/auth.ts:148-152` → additionalField `tenantId` is `required: true`, `defaultValue: tenantConfig.defaultSlug`
  - `src/shared/api/auth.ts:256` → `databaseHooks.user.create.before` forces `tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug`

  G1 therefore requires a **nullable-column migration** (Prisma → regenerate Drizzle) + `required:false` + removing the hook fallback + auditing every `.notNull()`-assuming consumer.

## Relevant Code Locations

| Area                                  | Files                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Signup wizard (relocate)              | `src/features/auth/model/useSignupForm.ts`, `src/app/(platform)/signup/page.tsx`                      |
| Provisioning route (gate behind auth) | `src/app/api/platform/tenants/route.ts` (+ `src/app/api/v1/platform/tenants/route.ts` shim)           |
| Auth config                           | `src/shared/api/auth.ts` (`emailVerification`, `advanced`, `user.additionalFields`, `databaseHooks`)  |
| Verify / sign-in UX                   | `src/app/(auth)/verify-email/page.tsx`, `src/app/(auth)/sign-in/page.tsx`                             |
| Tenant resolution                     | `src/entities/tenant/api/with-tenant.ts`, middleware (`src/middleware.ts`)                            |
| User / tenant schema                  | `src/db/schema/users.ts`, `src/db/schema/tenants.ts`, `prisma/schema.prisma`                          |
| CTA entry points (G3 copy)            | PlatformHeader ×2, HeroSection, PricingCards, PricingCTA, CTASection, features, about, PlatformFooter |
| Setup Center entry                    | `src/app/(tenant)/setup/page.tsx`, `src/widgets/dashboard/ui/HomeLayer.tsx`                           |

## Decision Gates (from ADVISORY-031 §9)

- **G0 — Direction (defer, don't reserve):** ✅ resolved by DavDev.
- **G1 — `tenantId: null` as durable state:** ✅ **re-scoped (ADVISORY-031 §10) from decision gate → migration work item.** Delivered by new **Phase 0** (nullable-column migration + `required:false`/default removal + conditional hook + bounded consumer audit). Blocks Phase 1 and Phase 3 until Phase 0 lands.
- **G2 — Demo path:** open — shared read-only live tenant vs fully client-mocked. Blocks Phase 3 start.
- **G3 — Marketing/CTA copy & routing:** open — "Get Started" implies instant community creation. Blocks Phase 1 _ship_.
- **G4 — Setup Center entry assumptions:** open — confirm no reliance on same-request-lifecycle session claims. Blocks Phase 4.

## Phased Execution Plan (summary — see ADVISORY-031 §6)

0. **(NEW — precedes Phase 1, ADVISORY-031 §10)** `tenantId` nullable: Prisma→Drizzle nullable migration, `additionalField` `required:false` + default removed, `user.create.before` hook → `tenant?.id ?? rawTenantId ?? null` (invited-user path unchanged), consumer audit (compile-clean under `string | null` + targeted inventory + runtime smoke). Unblocks G1.
1. Identity-only sign-up (no tenant); standard Better Auth sign-up; `sendOnSignUp: true` + surfaced failures. **Depends on Phase 0.**
2. `crossSubDomainCookies` for `.netbones.co.za` (F5 — do regardless).
3. Post-verification non-blocking landing (demo / create-a-community); relocated re-invocable wizard. **Depends on Phase 0; gated on G2.**
4. Authenticated tenant provisioning (`POST /api/platform/tenants` requires session, no user creation). **Gated on G4.**
5. Cleanup — retire dead eager-provisioning code. No reaper/TTL to add.

## Out of Scope

- Reservation tables, TTLs, cron/reaper jobs (explicitly rejected — that was Option A).
- AI-assisted onboarding, usage analytics, white-label readiness (Phase 123 out-of-scope carry-overs).
- Changes to the Setup Center's internal sections (owned by Phase 123).
