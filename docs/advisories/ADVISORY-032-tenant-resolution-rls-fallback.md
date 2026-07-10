# ADVISORY-032: Tenant-Resolution Header-Propagation Failure + RLS Fail-Open Fallback

> **Status:** Phases 1–4 complete · Phase 5–6 pending (staging regression + deploy verification)
> **Scope:** `src/middleware.ts`, `src/entities/tenant/api/with-tenant.ts`, `src/entities/tenant/api/base.ts`, `src/shared/api/db.ts`
> **Relationship to other work:** Decoupled from ADR-027 (Request-Scope Engine) and ADR-028 (Gate Engine), both still `Proposed`. This advisory does not require, and is not blocked by, either engine. It should ship first.
> **Origin:** opencode `/architect` review (BOTTLE_REPORT.md, issues #3, #7, #8, #9), escalated after source verification below.
> **Verification basis:** Phase 0 repo discovery (2026-07-10) confirmed all three defects from source. Empirical curl test on staging deferred until preview deploy is available.

---

## 1. Problem Statement

Two independent, source-confirmed defects in the request → tenant-resolution pipeline, which compound into a structural risk rather than two isolated bugs.

**A. Middleware header forwarding is broken.** `middleware.ts` constructs `NextResponse.next()` once, at the top of the function, before any header mutation. Every subsequent `request.headers.set(...)` (for `x-request-id`, `x-pathname`, `x-locale`, `x-plane`, `x-tenant-slug`) and `response.headers.set(...)` call never reconstructs the response via the documented `NextResponse.next({ request: { headers } })` pattern. Per Next.js's documented middleware semantics, mutating `request.headers` directly has no effect on what the downstream Route Handler sees — only `NextResponse.next({ request: { headers } })` forwards modified request headers. This file never does that.

Consequence, traced into `with-tenant.ts`:

- `x-tenant-id` is never set anywhere in `middleware.ts` — the doc-comment in `with-tenant.ts` ("middleware sets both") is simply wrong.
- `x-tenant-slug`, though computed correctly from `host` inside middleware, never reaches the route handler. `withTenant()` therefore always falls through to `getTenantBySlug(tenantSlug || localTenantSlug)` with `tenantSlug` undefined — i.e. it always resolves `LOCAL_TENANT_SLUG` (defaults to `'soralia'`), **regardless of the actual host/subdomain the request arrived on.** The `getTenantByDomain(host)` fallback, which would correctly resolve a second tenant, is unreachable because the `'soralia'` lookup succeeds first.
- **Practical effect:** the moment a second tenant (e.g. Solaris Heights) serves live traffic, every ordinary request to it is likely to silently resolve to Soralia's `tenantId` instead of its own. This requires no attacker — it's the default behavior of the current code.

**B. The same forwarding gap makes the client-supplied header authoritative when present.** `middleware.ts`'s CORS config explicitly allows `x-tenant-slug` in `Access-Control-Allow-Headers` for 5+ allowlisted origins (including the Android app URL and admin dashboard URL). Because middleware's own computed value never overwrites it downstream, if a client from an allowed origin sends `x-tenant-slug: <any-slug>` on a fetch call, `withTenant()` reads and trusts that value directly — with **zero cross-check** against the authenticated session's actual `tenantId`.

**C. `runWithRLS` fails open.** `db.ts:346-368`:

```ts
try {
  await tx.execute(sql`SET LOCAL ROLE app_user`);
  await tx.execute(sql`SET LOCAL search_path TO public`);
} catch {
  log.warn(
    {},
    'RLS role switch failed — proceeding without app_user role. RLS policies NOT enforced.'
  );
}
```

If the role switch throws for any reason (dropped role, stale grants, drifted migration), the transaction proceeds under the pool's normal connection role — the **owner** role per ADR-019's own correction note, not `app_user` — meaning every RLS policy scoped `TO app_user` silently stops applying for that transaction. No exception, no alert beyond a log line.

---

## 2. Root Cause Analysis

| Defect                     | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A (header forwarding)      | `middleware.ts` never uses the `NextResponse.next({ request: { headers } })` forwarding pattern. `response = NextResponse.next()` is fixed at function top; all later `request.headers.set()` calls mutate a `Headers` object whose mutations are discarded by the time a response is actually returned. This is a well-documented Next.js gotcha, not an obscure edge case.                                                                                                                                                                                                                                                                |
| B (trust in client header) | Secondary to A. Once A is fixed, middleware's own `inferredTenantSlug` unconditionally overwrites `x-tenant-slug` on every tenant-plane and localhost branch before forwarding — so fixing A closes most of B as a side effect. The exception: the **platform-plane branch explicitly does not set tenant headers at all** ("No tenant headers are set" — comment in the code), relying on the convention that platform routes call `withTenantOptional()` instead of `withTenant()`. That's a discipline-based guarantee, not a structural one — worth closing with an explicit cross-check rather than leaving single-mechanism reliance. |
| C (RLS fail-open)          | A deliberate availability-over-isolation choice (never break a request due to a role-switch hiccup) with the polarity backwards for a confidentiality-critical fallback. Policy choice, not oversight — but wrong for a table isolation mechanism.                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 3. Options Table

### For A + B (tenant resolution)

| Option                                                 | Description                                                                                                                                     | Pros                                                                                                                                                       | Cons                                                                                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **O1. Fix forwarding only**                            | Reconstruct `NextResponse.next({ request: { headers } })` at every return point                                                                 | Minimal diff; restores intended design; closes B as a side effect on tenant/localhost branches                                                             | Platform-plane branch still has no header at all — relies on route-author discipline (`withTenant` vs `withTenantOptional`)                                                |
| **O2. O1 + remove client's ability to set the header** | O1, plus drop `x-tenant-slug` (and `x-tenant-id`) from `Access-Control-Allow-Headers`                                                           | Removes the CORS attack surface entirely — no legitimate client-side reason to set this header once middleware computes it authoritatively server-side     | Requires confirming (discovery phase) that no current consumer legitimately depends on setting it client-side                                                              |
| **O3. O2 + session cross-check (defense in depth)**    | O2, plus cross-check resolved `tenantId` against `session.user.tenantId` whenever a session exists; reject on mismatch unless `isPlatformAdmin` | Closes the platform-plane gap and any future branch that forgets to overwrite the header; matches ADR-027's C2 in spirit without requiring the full engine | Slightly more surface (one more DB/session read) — but this is exactly the redundant lookup ADR-027 targets long-term; here it's one narrow addition, not a rearchitecture |

**Recommendation: O3.** It's the only option that doesn't leave a single point of failure (middleware always overwriting correctly) as the sole guarantee.

### For C (RLS fallback)

| Option                         | Description                                               | Pros                                                         | Cons                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1. Fail closed (rethrow)**  | Replace `catch { log.warn(...) }` with a rethrow          | RLS-gated tables can no longer be silently unprotected       | If `app_user` role is currently broken in any environment, this surfaces as hard failures on ~10 routes instead of silent bypass — which is the point, but needs staging verification first |
| **P2. Fail closed + alerting** | P1 + a loud error-level log / alert hook (not just throw) | Operational visibility into the failure mode, not just a 500 | Slightly more code; no real downside                                                                                                                                                        |

**Recommendation: P2.**

---

## 4. Architecture Before / After

**Before:**

```
Client → middleware (computes x-tenant-slug from host, sets on request+response — neither propagates)
       → Route Handler → withTenant() reads headers() → sees whatever the CLIENT sent (or nothing)
       → falls through to getTenantBySlug('soralia') always, OR trusts client-sent slug directly
       → no cross-check against session.user.tenantId
```

**After:**

```
Client → middleware (computes x-tenant-slug from host, forwards via NextResponse.next({request:{headers}}))
       → Route Handler → withTenant() reads headers() → sees middleware's authoritative, host-derived value
       → cross-checks against session.user.tenantId when a session exists → TENANT_MISMATCH on conflict
       → x-tenant-slug removed from CORS-allowed request headers (no client-side path to set it at all)
```

---

## 5. Pre-Execution Discovery Checklist

Run before any code changes. This closes gaps I cannot verify from the three files alone.

```bash
# 1. Confirm no other file already reconstructs NextResponse.next({request:{headers}}) elsewhere (avoid duplicate logic)
grep -rn "NextResponse.next(" src/middleware.ts src/app/**/*.ts 2>/dev/null

# 2. Enumerate every consumer of x-tenant-slug / x-tenant-id to know what else reads these headers
grep -rn "x-tenant-slug\|x-tenant-id" src/ --include="*.ts" --include="*.tsx"

# 3. Confirm which routes call withTenant() vs withTenantOptional() — platform routes MUST be on the latter
grep -rln "withTenant()" src/app/api | grep -v "withTenantOptional"
grep -rn "withTenant\b" src/app/(platform)/ src/app/api/**/platform/** 2>/dev/null

# 4. Check whether session/auth utilities already expose a cross-checkable tenantId claim
grep -rn "tenantId" src/shared/api/auth-utils.ts src/shared/api/rls-context.ts 2>/dev/null

# 5. Confirm current RLS route count and identify all runWithRLS call sites (should be ~10 per report)
grep -rln "runWithRLS(" src/app/api

# 6. Confirm no legitimate client currently sets x-tenant-slug on purpose (mobile app, admin dashboard, e2e tests)
grep -rn "x-tenant-slug" e2e/ scripts/ docs/ 2>/dev/null

# 7. EMPIRICAL VERIFICATION (do this on a preview/staging deploy, not prod) — confirms the header-forwarding
#    theory before touching anything:
curl -sS -H "Host: solaris.co.za" https://<preview-url>/api/health -v 2>&1 | grep -i "x-tenant"
curl -sS -H "Host: soralia.org"   https://<preview-url>/api/health -v 2>&1 | grep -i "x-tenant"
# Compare: if both report the same tenant identity downstream (e.g. via a temporary debug echo route
# that logs headers().get('x-tenant-slug') server-side), the theory is confirmed.
```

**G0 gate:** ~~Do not proceed past discovery until you've confirmed (a) whether Solaris Heights or any second tenant is currently live, and (b) the empirical curl test result.~~

**G0/G1 resolved (2026-07-10):** ADVISORY-032 numbering confirmed. No second tenant is serving live production traffic yet (Solaris Heights exists in seed data only). Phase 1 ships at normal cadence, not as an emergency hotfix. Empirical curl test remains pending staging deploy.

---

## 5a. Phase 0 Discovery Findings (2026-07-10)

Repo-wide discovery completed. All three defects **confirmed from source**.

### §5.1 — Header forwarding

- **Zero** uses of `NextResponse.next({ request: { headers } })` anywhere in `src/` before Phase 1 draft.
- `middleware.ts` called `NextResponse.next()` once at function top; all `request.headers.set()` mutations were discarded downstream.
- `x-tenant-id` is never set in middleware; `with-tenant.ts` doc-comment claiming "middleware sets both" was incorrect.

### §5.2 — Header consumers

| File                           | Role                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `middleware.ts`                | Computes and sets `x-tenant-slug` (response only, pre-fix)        |
| `with-tenant.ts`               | Primary API resolver (~150 route files)                           |
| `base.ts` (`getCurrentTenant`) | Layout resolver — **different order than `withTenant()` pre-fix** |
| `trpc/server.ts`               | Reads headers; falls back to `users.tenantId` from DB             |
| `auth/signup/route.ts`         | Uses `getTenantByDomain(host)` directly — bypasses `withTenant()` |

**Split-brain risk (pre-fix):** `getCurrentTenantImpl()` resolved **host domain first**; `withTenant()` resolved `LOCAL_TENANT_SLUG` (`soralia`) **before** `getTenantByDomain()`. A request to `solaris.co.za` could show correct Solaris branding in layouts while every `withTenant()` API call resolved to Soralia.

**Phase 1 alignment:** Extract `resolveTenantFromRequestHeaders()` in `base.ts` and route both `getCurrentTenant()` and `withTenant()` through it.

### §5.3 — `withTenant()` vs `withTenantOptional()` on platform routes

- `src/app/(platform)/` — no `withTenant` usage.
- `src/app/api/**/platform/**` — **one dual-auth route** calls `withTenant()` as tenant-scoped fallback: `admin/platform/billing/invoices/[id]/pdf/route.ts`. Intentional; should use `withTenantOptional()` or domain resolution when hit from platform domain post-fix.
- `withTenantOptional()` used in only 2 API routes (`settings/contact`, `v1/tenant/campaign`).

### §5.4 — Session `tenantId` for cross-check (Phase 3)

| Source                                  | `tenantId` available?                      |
| --------------------------------------- | ------------------------------------------ |
| `rls-context.ts` → `getRLSContext()`    | Yes — `user.tenantId` from DB              |
| `auth-utils.ts` → `getSessionAndRole()` | No — role only                             |
| `trpc/server.ts` → `createContext()`    | Yes — falls back to `users.tenantId`       |
| Better Auth (`auth.ts`)                 | `tenantId` is an `additionalField` on user |

### §5.5 — `runWithRLS` call sites

**10 route files** confirmed (matches advisory estimate). Fail-open `catch` at `db.ts:351-358` confirmed.

### §5.6 — Client `x-tenant-slug` usage

- `e2e/` (4 specs) — **no** client header usage.
- Production client/mobile code — **no matches**.
- ~60 API test files mock `headers()` return values (unaffected by CORS change).
- `auth/signup/route.ts` reads header as fallback after `getTenantByDomain(host)` — signup path partially mitigated independent of middleware.

### §5.7 — Empirical curl test

**Deferred.** `/api/health` does not echo tenant headers. Requires temporary debug echo route on staging preview. Run before production deploy (Phase 6).

---

## 6. Phased Execution Plan

| Phase | Action                                                                                                                                                                                                                                                                                                                 | Depends on                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **0** | Run discovery checklist (§5); document findings (§5a); empirical curl test on staging                                                                                                                                                                                                                                  | —                                                                                               |
| **1** | Fix `middleware.ts`: `forwardWithHeaders()` via `NextResponse.next({ request: { headers } })` on every pass-through return; strip client `x-tenant-slug`/`x-tenant-id` before setting authoritative values. Align `withTenant()` with `getCurrentTenant()` via shared `resolveTenantFromRequestHeaders()` in `base.ts` | Phase 0 findings reviewed                                                                       |
| **2** | Remove `x-tenant-slug` / `x-tenant-id` from `Access-Control-Allow-Headers` in `addCorsHeaders()`                                                                                                                                                                                                                       | Discovery confirms no legitimate client dependency (§5.6)                                       |
| **3** | Add session cross-check in `withTenant()` (or nearest call site with session access): reject `TENANT_MISMATCH` unless `isPlatformAdmin`                                                                                                                                                                                | Phase 1 shipped; discovery §5.4 confirms available session tenantId claim                       |
| **4** | Flip `db.ts` `runWithRLS` fallback to fail-closed + alert (P2)                                                                                                                                                                                                                                                         | Staging verification that `app_user` role switch currently succeeds in every target environment |
| **5** | Regression: verify each known tenant subdomain resolves to its own distinct `tenantId`; verify RLS routes still pass in staging with fail-closed polarity                                                                                                                                                              | Phases 1–4                                                                                      |
| **6** | Deploy; re-run the empirical curl test from Phase 0 against production; confirm distinct tenant resolution                                                                                                                                                                                                             | Phase 5 green                                                                                   |

---

## 7. Risk Register

| Risk                                                                                                                                                                  | Mitigation                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Header-forwarding fix interacts unexpectedly with locale-cookie logic or CORS preflight handling                                                                      | Full route regression across representative API routes before merge                                                |
| Platform-plane branch still sets no tenant headers; a platform route mistakenly calling `withTenant()` instead of `withTenantOptional()` behaves differently post-fix | Discovery §5.3 found one intentional dual-auth route (`admin/platform/billing/invoices/[id]/pdf`); verify post-fix |
| Flipping RLS to fail-closed surfaces a _currently masked_ `app_user` role/grant problem in some environment                                                           | Staging verification (Phase 0 environment-by-environment) before Phase 4 touches production                        |
| Removing `x-tenant-slug` from CORS-allowed headers breaks an undiscovered legitimate client dependency                                                                | Discovery §5.6 must be exhaustive; ship Phase 2 one release after Phase 1, watch logs                              |
| Split-brain between layout (`getCurrentTenant`) and API (`withTenant`) resolution orders                                                                              | Phase 1 extracts shared `resolveTenantFromRequestHeaders()` — both paths use identical order                       |
| This advisory is based on 3 files, not the live repo — other consumers not yet identified may depend on current (broken) behavior                                     | Phase 0 discovery (§5a) completed; no unknown production consumers found                                           |

---

## 8. Done Criteria

- [x] Discovery checklist (§5) completed and findings documented in §5a
- [ ] Empirical curl test on staging (§5.7) — deferred until preview deploy
- [x] `middleware.ts` forwards headers via `NextResponse.next({ request: { headers } })` on every pass-through return; strips client tenant headers before authoritative set
- [x] `withTenant()` aligned with `getCurrentTenant()` via `resolveTenantFromRequestHeaders()` in `base.ts`
- [ ] Confirmed via debug echo that route handler receives middleware's computed `x-tenant-slug` (staging)
- [x] `x-tenant-slug` / `x-tenant-id` removed from `Access-Control-Allow-Headers` (Phase 2, 2026-07-10)
- [x] Session-vs-resolved-tenant cross-check added in `withTenant()`; `TenantMismatchError` + unit test (Phase 3, 2026-07-10)
- [x] `db.ts` `runWithRLS` fails closed + error-level alert on role-switch failure (Phase 4, 2026-07-10)
- [ ] All current RLS routes green in staging under fail-closed polarity (G3 — before production)
- [ ] Regression suite confirms distinct, correct tenant resolution across all currently-live tenants
- [ ] This advisory logged as independent of, and not gating on, ADR-027/ADR-028

---

## 9. Decision Gates

- **G0** — ~~DavDev confirms advisory numbering~~ **PASSED (2026-07-10):** ADVISORY-032 confirmed.
- **G1** — ~~Second tenant live in production?~~ **PASSED (2026-07-10):** No second tenant live yet. Normal-cadence patch, not emergency hotfix.
- **G2** — ~~DavDev reviews Phase 0 findings before Phase 1 code.~~ **PASSED (2026-07-10):** Findings in §5a reviewed; Phase 1 drafted.
- **G3** — Before Phase 4 (RLS fail-closed) ships to production, DavDev confirms staging verified `app_user` role switch succeeds in every target environment.
- **G4** — ~~DavDev sign-off before Phase 2 removes `x-tenant-slug` from CORS-allowed headers~~ **PASSED (2026-07-10):** Discovery §5.6 confirmed no production client dependency; Phase 2 shipped.
