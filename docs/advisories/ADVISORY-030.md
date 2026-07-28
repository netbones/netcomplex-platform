---
title: ADVISORY-030 — Onboarding Refactor: Defer Tenant Provisioning Until Post-Verification
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-030 — Onboarding Refactor: Defer Tenant Provisioning Until Post-Verification

> **⚠️ SUPERSEDED (2026-07-09) by [ADVISORY-031](./ADVISORY-031.md).** This was the
> earlier draft of the onboarding-refactor advisory, saved under provisional numbering.
> The confirmed, canonical record is ADVISORY-031, which incorporates the COMMUNIQUE-12
> response (re-scoped Gate G1, new Phase 0). Retained for history only — do not cite this
> file for planning. All active references now point to ADVISORY-031.

**Status:** Advisory — execution blocked on decision gates below.
**Supersedes/extends:** `ONBOARDING_REFACTOR.md` (uploaded draft, "Option A — reserve-then-commit").
**Context:** Phase 123 (Setup Center). Related bd: `soralia-village-zbvq` (401 hotfix),
`soralia-village-0jh1` (Setup Center).
**Decision authority:** DavDev has expressed a directional preference (see §3) for
**Option C — defer, don't reserve**. This advisory formalizes that direction into an
agent-ready plan. Gates below still require explicit sign-off before execution.

---

## 1. Problem Statement

The sign-up wizard collects community name, subdomain, and plan **before** the user's
email is verified, and provisions a live `Tenant` row + `user.tenantId` + `role=ADMIN`
immediately, server-to-server, with no browser session. If the user never completes
email verification (typo'd email, spam filter, abandoned flow), the result is:

- A permanently live `Tenant` row with `active: true` and a squatted `slug` that can
  never be reclaimed (no expiry, no cleanup path).
- An unverified `user` row tied to that tenant as `ADMIN`.
- Compute and storage spent (tenant row, `initTenantSetup()` side effects — missions,
  default settings) for an identity that was never confirmed to exist.

Independently, even users who **do** verify are sometimes locked out afterward because
the verification/auto-sign-in flow completes on `app.netbones.co.za` while the tenant
lives at `slug.netbones.co.za`, and cookies are host-only (no `crossSubDomainCookies`).

## 2. Root Cause Analysis

The uploaded draft (`ONBOARDING_REFACTOR.md`) correctly identifies six failure modes
(F1–F6) and proposes **Option A**: keep the eager collection-then-provisioning shape of
the wizard, but soften it with a `pending_tenant_signup` reservation table, a TTL, and a
materialization step inside Better Auth's `afterEmailVerification` hook, cleaned up by an
hourly reaper.

That fixes the symptom (zombie live rows) but not the root cause: **the wizard asks for
and briefly allocates a resource (tenant identity/subdomain) before there is a verified
identity to own it.** Option A is real infrastructure — new table, new migration, new
cron job, new hook logic with its own race conditions — built entirely in service of
making early collection _safe_, rather than asking whether early collection is
_necessary_.

DavDev's directive: it isn't necessary. The "type your community name and subdomain up
front" step functions as an elevator-pitch / commitment device, but that marginal
activation benefit doesn't justify the standing compute, migration surface, and
operational burden (reaper job, TTL tuning, orphaned-user cleanup) of maintaining a
reservation system indefinitely. Better to remove the hazard class entirely: **no tenant,
no subdomain, and no slug reservation of any kind exists until the user is a verified
identity.** Post-verification, the user is not immediately pushed to name a community —
they're given a choice (demo, or Setup Center) with no forced conclusion.

## 3. Options Considered

| Option                                                | Shape                                                                                                                                                                                                                                                                                    | Verdict                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A — Reserve-then-commit** (original draft)          | Keep upfront naming step; add `pending_tenant_signup` TTL table; materialize tenant in `afterEmailVerification` hook; hourly reaper                                                                                                                                                      | Solves zombie-row/slug-squat symptom but adds a new table, a new background job, and hook-race handling — permanent infrastructure to fence a hazard that didn't need to exist                                                                               |
| **B — Pending tenant with lifecycle state**           | Eager creation kept; `active:false` until verified; reap stale rows                                                                                                                                                                                                                      | Rejected in original draft — zombie rows live in the production `Tenant` table; risk of `active:false` tenants leaking into `withTenant()`/`getTenantByDomain()` resolution paths                                                                            |
| **C — Defer entirely (RECOMMENDED, DavDev-directed)** | Step 1 of sign-up is identity only (email + password). Verify email first. No tenant, no slug, no subdomain exists until after verification. Post-verification, authenticated user chooses: demo, or Setup Center (which is where community naming/subdomain selection actually happens) | Eliminates F1, F2, F3, F4, and F6 as a side effect of removing the hazard, not by fencing it. No new table, no reaper, no TTL, no hook-race window. Tenant creation becomes an ordinary authenticated mutation instead of a public unauthenticated endpoint. |

**F5 (cross-subdomain cookies) is orthogonal and required under every option** — once a
tenant subdomain exists at all, the owner's session needs to follow them there.

## 4. Architecture

### Before (current)

```
Anonymous visitor
  → 3-step wizard (name+slug+plan, contact, password)
  → POST /api/platform/tenants (public, unauthenticated)
      → slug uniqueness check (live table only)
      → email uniqueness check
      → Better Auth sign-up (server→server, no session)
      → DB txn: INSERT Tenant(active:true) + UPDATE user(tenantId, role=ADMIN)
      → initTenantSetup()
  → redirect /verify-email
      → (no sendOnSignUp — dead end for many users)
  → verify link clicked → autoSignInAfterVerification
      → session cookie set on app.netbones.co.za (host-only)
      → tenant lives at slug.netbones.co.za → session doesn't reach it
```

### After (Option C)

```
Anonymous visitor
  → "Get Started" → identity-only step: name, email, password
  → POST /api/auth/sign-up/email (Better Auth, standard — no tenant touched)
      → sendOnSignUp: true — verification email sent immediately, failure surfaced
  → redirect /verify-email
  → verify link clicked
      → session established, crossSubDomainCookies scoped to .netbones.co.za
      → user has NO tenantId yet — this is an expected, valid, stable state
  → redirect to /platform/home (or equivalent authenticated landing)
      → Presented with a real choice, no forced path, NO EXPIRY:
          (a) "Try a live demo" — read-only demo tenant, no provisioning
          (b) "Create a community" — invokes the ORIGINAL wizard UI (name,
              subdomain, plan), now running as an authenticated mutation
      → tenantId: null is a durable, indefinite state — a verified user can
        leave and come back next week and re-invoke the wizard from account
        menu / platform home at any time. Nothing forces resolution.
      → POST /api/platform/tenants now requires a session; slug check still
        against the live table only (no reservation concept needed — a signed-in
        user submitting a slug either gets it or gets a 409 and picks another,
        with no orphan risk because there's no unverified identity involved)
```

Key structural change: **`POST /api/platform/tenants` moves from a public,
unauthenticated, identity-creating endpoint to an authenticated, tenant-creating-only
endpoint.** It stops being responsible for creating users at all. **The community-naming
wizard (subdomain, plan, community name step) is not deleted — it's relocated.** The same
UI/component is reused, just re-served behind auth and made re-invocable on demand rather
than a one-shot step in the anonymous sign-up flow.

## 5. Pre-Execution Discovery Checklist

Run these before drafting any code changes. Do not assume the draft's line-number
citations are current — verify against the live files first (per standing schema-drift
practice).

```bash
# Confirm current wizard step order and what fields step 1 actually collects
grep -n "communityName\|subdomain\|plan" src/features/auth/model/useSignupForm.ts

# Confirm current provisioning route responsibilities
sed -n '1,160p' src/app/api/platform/tenants/route.ts

# Confirm current Better Auth email verification config
grep -n "sendOnSignUp\|sendOnSignIn\|autoSignInAfterVerification\|afterEmailVerification\|crossSubDomainCookies" src/shared/api/auth.ts

# Confirm whether any other caller relies on POST /api/platform/tenants being public/unauthenticated
grep -rn "api/platform/tenants" src/ --include="*.ts" --include="*.tsx"

# Confirm entry points that currently link straight to the 3-step wizard
grep -rln "/signup" src/features/platform/ui/ src/features/marketing/ui/

# Confirm whether a "demo tenant" concept already exists anywhere (avoid reinventing)
grep -rin "demo" src/entities/tenant/ src/app/\(platform\)/ docs/architecture/ 2>/dev/null

# Confirm Setup Center's current entry conditions (does it already assume tenantId exists?)
grep -rn "tenantId" src/app/\(tenant\)/dashboard/ 2>/dev/null | grep -i setup

# Confirm withTenant()/getTenantByDomain() behavior for a user with no tenantId
grep -n "tenantId" src/entities/tenant/api/with-tenant.ts
```

## 6. Phased Execution Plan

**Phase 1 — Identity-only sign-up (no tenant involved)**

- Collapse the 3-step wizard's step 1 to name + email + password only. Community
  name/subdomain/plan fields removed from this flow entirely.
- `POST /api/platform/tenants` is removed from the sign-up path. Replace with
  standard Better Auth `sign-up/email` call.
- Set `emailVerification.sendOnSignUp: true` in `src/shared/api/auth.ts`. Surface
  send failures to the client (non-201 response or explicit `emailQueued: false`)
  rather than the current fire-and-forget `.catch`.

**Phase 2 — Cross-subdomain session (F5, do regardless of anything else)**

- `advanced.crossSubDomainCookies = { enabled: true, domain: '.netbones.co.za' }`.
- Confirm this doesn't regress any existing single-tenant session assumptions
  elsewhere (check `getTenantByDomain`, middleware tenant resolution).

**Phase 3 — Post-verification landing choice**

- New authenticated landing route (or reuse an existing platform-home route) that
  checks `user.tenantId === null` and presents two non-blocking options: demo, or
  "Create a community" (which invokes the existing wizard component). No
  auto-redirect, no forced next step, **no expiry on the null-tenant state** — a
  verified user can sit here indefinitely and re-invoke the wizard whenever they
  choose, not just once at first landing.
- The wizard itself (community name / subdomain / plan step) is **relocated, not
  rebuilt**: same `useSignupForm`-equivalent UI, re-served behind auth, exposed
  both from this landing screen and from an ongoing entry point (account menu /
  platform home) so it remains invocable on demand after the fact, not
  single-use.
- Demo path: read-only/sandboxed experience, no `Tenant` row created. Needs a
  decision (gate G2 below) on whether this is a shared static demo tenant or a
  fully mocked UI with no backend tenant at all.

**Phase 4 — Authenticated tenant provisioning**

- `POST /api/platform/tenants` reinstated as an authenticated-only endpoint:
  requires session, takes community name/subdomain/plan, does the live-table slug
  uniqueness check (unchanged logic, just gated behind auth), creates the
  `Tenant` row, sets `user.tenantId`/`role=ADMIN`, runs `initTenantSetup()`.
  Because the user is already verified, there is no orphan/zombie risk — worst
  case is a 409 on slug collision, which the user can immediately retry.

**Phase 5 — Cleanup**

- Remove any dead code tied to the old eager-provisioning path.
- No reaper job, no TTL table, no reservation logic — nothing to add here, only
  to retire.

## 7. Risk Register

| Risk                                                                                                                              | Severity          | Mitigation                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing marketing pages (Hero, Pricing, PlatformHeader CTAs) link into the old 3-step wizard assuming it collects tenant info    | Medium            | Discovery checklist §5 greps all CTA entry points; update copy/props before removing fields                                                                          |
| Users expect to "claim" a subdomain immediately and may feel friction being asked to verify first                                 | Low–Medium        | Product/UX call, not an architectural blocker — DavDev has weighed this trade-off explicitly and prefers removing the hazard over preserving the elevator-pitch hook |
| A user with `tenantId: null` reaching authenticated areas that assume a tenant context (dashboard widgets, `withTenant()` guards) | High if unhandled | This is a genuinely new valid state in the identity model and must be explicitly gated — see G1                                                                      |
| Demo path (if backed by a real shared tenant) could become a de facto free multi-tenant sandbox with write access                 | Medium            | Gate G2 — decide read-only vs. fully mocked before building                                                                                                          |
| Slug collision race between two authenticated users submitting the same subdomain simultaneously in Phase 4                       | Low               | Same as today's live-table check; DB unique constraint on `slug` is the actual backstop regardless of app-layer check timing                                         |

## 8. Done Criteria

- [ ] ⏭️ SUPERSEDED: Sign-up collects only name/email/password; no tenant/slug fields in that flow
- [ ] ⏭️ SUPERSEDED: `sendOnSignUp: true`; verification email delivery failures are surfaced, not silently swallowed
- [ ] ⏭️ SUPERSEDED: `crossSubDomainCookies` enabled and verified working across `slug.netbones.co.za`
- [ ] ⏭️ SUPERSEDED: A verified user with `tenantId: null` lands on a non-blocking choice screen (demo / create-a-community) — no forced redirect, no expiry
- [ ] ⏭️ SUPERSEDED: The community-naming wizard is re-invocable on demand (account menu / platform home), not a one-shot post-verification step
- [ ] ⏭️ SUPERSEDED: `POST /api/platform/tenants` requires authentication and no longer creates users
- [ ] ⏭️ SUPERSEDED: No new tables, TTLs, or cron/reaper jobs introduced
- [ ] ⏭️ SUPERSEDED: Test: sign-up creates zero `Tenant` rows
- [ ] ⏭️ SUPERSEDED: Test: authenticated tenant creation succeeds and sets `role=ADMIN` correctly
- [ ] ⏭️ SUPERSEDED: Test: unverified users cannot reach tenant creation at all (route requires verified session)
- [ ] ⏭️ SUPERSEDED: Test: user with `tenantId: null` does not break any `withTenant()`-gated route (either redirected gracefully or route explicitly allows null-tenant state)

## 9. Decision Gates

- **G0 — Confirmed direction: defer, don't reserve.** DavDev has directed Option C
  over Option A. This gate is considered **resolved** by DavDev's explicit statement
  in this session ("avoid the hazard altogether... no rush to conclude"). Recorded
  here for the register; no further sign-off needed unless reversed.

- **G1 — `tenantId: null` as a first-class, indefinite user state.** Every
  route/guard currently assuming a verified user always has a `tenantId` (dashboard
  widgets, `canAccess()`, `withTenant()`) needs an explicit decision: does it
  redirect null-tenant users to the choice screen, or does it need to tolerate the
  state directly? Because this state is now durable (not just a few seconds mid-flow
  — a user may legitimately stay here for weeks, re-invoking the wizard whenever
  they choose), this decision carries more weight than in the original single-shot
  design. **Must be resolved before Phase 3 execution** — this is exactly the kind
  of "surfaces to DavDev, not inferred by the agent" decision per standing gate
  practice.

- **G2 — Demo path implementation.** Shared live sandbox tenant (real `Tenant` row,
  read-only enforced at the API layer) vs. fully client-side mocked experience with
  no backend tenant at all. Affects scope of Phase 3 materially. **Blocks Phase 3
  start.**

- **G3 — Marketing/CTA copy and routing.** "Get Started" buttons currently imply
  immediate community creation. Copy and destination need alignment with the new
  flow before Phase 1 ships, or the UX will read as broken ("where did my
  subdomain field go?"). **Blocks Phase 1 ship, not Phase 1 build.**

- **G4 — Setup Center entry assumptions.** Confirm Setup Center (bd
  `soralia-village-0jh1`) doesn't currently assume it's entered immediately after
  tenant creation in the same request lifecycle (e.g., relying on freshly-set
  session claims that Phase 4's authenticated-mutation shape might not populate
  identically). **Must be checked before Phase 4 execution** — discovery checklist
  item on Setup Center entry conditions covers this.
