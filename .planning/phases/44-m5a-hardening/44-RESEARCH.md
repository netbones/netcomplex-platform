# Phase 44: M5a Hardening & Launch Readiness — Research

**Researched:** 2026-06-07
**Domain:** Multi-tenant Next.js + Preact launch readiness (observability, debt closure, audit remediation, supply-chain hygiene)
**Confidence:** MEDIUM-HIGH for 44-02/44-03 deep dives; MEDIUM for 44-04 through 44-07; LOW for 44-08+ ordering

## 1. Executive Summary

Phase 44 is the hardening window between M4 Production-Ready and M5 Platform Launch. Its job is to close 15 distinct debt items (5 architecture-audit findings + 4 M4.5 follow-ups + 1 FSD-debt cluster + 1 pnpm-advisory batch + 4 sharp-edged bug fixes) and to stand up a launch-grade observability stack that the M5 team can bet on. Phase 44-01 (Steiger FSD baseline, 582 violations, 8 clusters) is **shipped**; this research is forward-looking at 44-02 through 44-08+.

The single most important architectural decision is the **observability stack shape for 44-02**. The codebase already has a deliberate Pino + structured-logging layer (`apiLogger`/`dbLogger`/`authLogger`/`uploadLogger` in `src/shared/lib/logger.ts`, plus `withTiming`/`createLogContext`/`getRequestId` in `src/shared/api/observability.ts`). The recommendation is to **extend, not replace** that foundation: keep Pino as the application-tracing source of truth, add **Sentry** for error/exception capture and transaction tracing, and add **`@vercel/otel`** for framework-aware OTel propagation. Vercel Observability (Web Vitals + Analytics) is free on all plans and gives p75 web-vitals for free; we should not pay for what Vercel already gives us.

The 14 audit/M4.5/advisories work items are not all equal. A **rough effort-ordered ranking** (lowest ROI first) is: pnpm advisories `nn39` (mostly dev-only paths, downgrade P1 → P3) → M4.5 follow-ups (mostly typing/nullability cleanups, low risk) → audit wave A/B/C (architecture debt, medium risk) → FSD debt cluster remediation (highest mechanical churn, highest regression risk). The 582 FSD violations in baseline are dominated by **one cluster** (`qjpa`, 461 findings, 79% of all debt) — an `@api/*` alias barrel-sidestep. This cluster is auto-fixable with a single ESLint rule change, so it can be retired almost free; the other 7 clusters need careful human review.

**Recommended execution order:** 44-07 (pnpm reclassification, hours) → 44-06 (M4.5 follow-ups, days) → 44-02 (observability, ~1 week) → 44-03 (audit wave A) → 44-04 (audit wave B) → 44-05 (audit wave C) → 44-08+ (FSD debt, ROI-ordered). This puts the cheap, low-risk, high-confidence work first to clear the deck for the architectural work, and runs the highest-risk FSD remediation last when the codebase has the most test coverage and observability signal.

## 2. Project Constraints (from AGENTS.md + 44-CONTEXT.md)

### 2.1 Locked Decisions (from `44-CONTEXT.md`)

These are **not negotiable** — research validates execution, not alternatives:

- **15 BD issues feed this phase** in three groups: 5 architecture-audit (`fpc`, `1eh`, `1ei`, `5u2`, `qig`/`9xr`/`2z4`/`r13u`) + 4 M4.5 follow-ups (`tc4`, `mls9`, `n0rh`, `cs5`) + 1 FSD debt cluster + 1 pnpm advisories cluster (`nn39`).
- **Phase 44-01 (Steiger baseline) is shipped.** All future plans build on 582-violation baseline; do not propose re-scanning.
- **Conflict C3 RESOLVED 2026-06-04.** Do not reopen.
- **Conflict C4 (mobile-only flows) DEFERRED to Phase 47.** Do not touch.
- **Audit source: `docs/cleaner_react_architecture.md`** — the 5 issues from that document are the wave A/B/C inputs.
- **FSD debt from 44-01 baseline**: 8 sub-issues mapping to the 8 violation clusters in `44-01-baseline-report.txt` and `44-01-SUMMARY.md`.
- **Phase 47 (dWallet) is the work-in-progress** and the audit/Bug-fix triaging owner — Phase 44 hands off clean signals to Phase 47, not landed code that crosses boundaries.

### 2.2 the agent's Discretion (from `44-CONTEXT.md`)

These are research-and-recommend, not locked:

- **Whether to split FSD debt across 44-08, 44-09, 44-10** or collapse to 44-08 + a single cleanup wave. Recommendation: split per cluster, see §10.
- **Whether monitoring work happens in 44-02 only or in 44-02 + 44-02b (soak window)**. Recommendation: 44-02 ships the stack; assume 1-week soak inside 44-02 (no separate plan).
- **Whether M4.5 follow-ups ship as one plan or four** — recommendation: one plan (44-06) with four task clusters, easier to milestone.

### 2.3 Deferred Ideas (OUT OF SCOPE)

- Mobile-only UX work (C4) → Phase 47.
- Second tenant, multi-instance, plugins, event sourcing → M6+.
- Production data migration scripts not already in `prisma/migrations/` or `drizzle/`.

## 3. Plan 44-02 — Monitoring & Observability Stack

### 3.1 Capability Map

| Capability             | Primary Tier      | Secondary Tier        | Rationale                                                                  |
| ---------------------- | ----------------- | --------------------- | -------------------------------------------------------------------------- |
| Structured app logging | API/Backend       | Frontend Server (SSR) | Pino already lives in API routes via `withTiming`; client logs are noise   |
| Exception capture      | Browser/Client    | API/Backend           | `@sentry/nextjs` ships both runtimes via single SDK; errors come from both |
| Performance tracing    | API/Backend       | CDN/Edge (Vercel)     | `@vercel/otel` captures framework spans; Sentry samples 10% for traces     |
| Real User Monitoring   | Browser/Client    | —                     | Vercel Web Vitals is built-in; Sentry Session Replay is the upgrade path   |
| Alerting & on-call     | CDN/Edge (Vercel) | —                     | Vercel Monitoring + Sentry Alerts + PagerDuty webhook                      |
| Log aggregation        | API/Backend       | —                     | Vercel Logs (free) → Log Drains (Pro plan) for long-term retention         |

### 3.2 Standard Stack

| Library                      | Version           | Purpose                         | Confidence                                                                |
| ---------------------------- | ----------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `pino`                       | 9.7.0 (installed) | Structured app logging          | HIGH — already in repo, working                                           |
| `@sentry/nextjs`             | 10.51.0 (latest)  | Exception + transaction capture | HIGH — official Sentry SDK for Next.js 14/15/16                           |
| `@vercel/otel`               | 1.x (latest)      | OpenTelemetry framework spans   | HIGH — official Vercel package, replaces `@opentelemetry/api` boilerplate |
| `@opentelemetry/api`         | 1.9.x             | OTel trace API (peer dep)       | HIGH — required by `@vercel/otel`                                         |
| `@sentry/opentelemetry-node` | 8.x               | Sentry-OTel bridge (optional)   | MEDIUM — only needed if we want Sentry to consume `@vercel/otel` spans    |

**Not recommended:**

- **Datadog APM** — Vercel + Sentry covers the same ground for less cost and no agent install.
- **Logtail / Better Stack / Axiom** — Vercel Logs (free) + Log Drains (Pro plan) is sufficient until traffic warrants; revisit at M6.
- **New Relic** — same reasoning; agent install on Vercel is non-trivial.
- **Grafana Cloud** — overkill for current scale; would require running our own OTel collector.

### 3.3 Architecture Pattern: Pino + Sentry + `@vercel/otel` Co-existence

The most important integration rule: **set `skipOpenTelemetrySetup: true` in `Sentry.init()`** when using `@vercel/otel`, otherwise both SDKs try to register global OTel providers and the second one wins (silently breaking instrumentation for the other).

```typescript
// instrumentation.ts (project root, Next.js 16)
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% sample — Sentry's perf tier
  profilesSampleRate: 0.1,
  skipOpenTelemetrySetup: true, // CRITICAL: let @vercel/otel own the provider
  environment: process.env.VERCEL_ENV ?? 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  beforeSendTransaction(event) {
    // Tag multi-tenant traces
    const host = event.request?.headers?.host;
    if (host) event.tags = { ...event.tags, host };
    return event;
  },
});
```

```typescript
// instrumentation.ts (continued) — register @vercel/otel after Sentry
import { registerOTel } from '@vercel/otel';

export function otelRegister() {
  registerOTel({ serviceName: 'soralia-web' });
}
```

Pino stays untouched. Where it's worth wiring: in `apiLogger.info({...})` calls, also call `Sentry.addBreadcrumb({category: 'api', level: 'info', data: ctx})` so Sentry's event detail page shows the structured log context that Pino already produces. This is **additive**, not a rewrite.

### 3.4 Soak Signal Set (what we want to see green for 7 days before M5 launch)

| Signal                          | Source              | SLO target       | Alert            |
| ------------------------------- | ------------------- | ---------------- | ---------------- |
| Server p75 TTFB                 | Vercel Web Vitals   | < 800ms          | > 1.2s for 10min |
| Server error rate (5xx)         | Vercel Monitoring   | < 0.5%           | > 1% for 5min    |
| Client JS error rate            | Sentry              | < 0.1% sessions  | > 0.5% for 10min |
| Real User p75 LCP               | Vercel Web Vitals   | < 2.5s           | > 4s for 30min   |
| Pino error log rate             | Vercel Logs (query) | < 0.5/sec steady | > 5/sec for 2min |
| Chat message delivery           | Custom event        | > 99% < 3s       | > 2% timeout     |
| Sentry unresolved issue backlog | Sentry              | < 20 open        | > 50 open        |

### 3.5 Don't Hand-Roll

| Problem                    | Don't Build                   | Use Instead                                      | Why                                          |
| -------------------------- | ----------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Browser error stack traces | Custom `window.onerror`       | Sentry SDK                                       | Source maps, dedup, release tracking, replay |
| Server-side timing         | `performance.now()` scattered | `withTiming` (existing) + Sentry spans           | Aggregation, percentile views                |
| Frontend logging transport | Custom fetch to backend       | Sentry's transport                               | Compression, batching, retry, PII scrubbing  |
| OTel span context          | Manual `traceparent` headers  | `@vercel/otel` + `Sentry.propagateTraceHeader()` | Standard W3C Trace Context, no custom format |

### 3.6 Common Pitfalls

- **Forgetting `skipOpenTelemetrySetup`** → Sentry and `@vercel/otel` fight over the global provider; one of them goes silent. Symptom: traces appear in one tool but not the other. Fix: always set the flag.
- **Logging PII (email, phone, address) to Sentry** → GDPR violation. Mitigation: configure `sendDefaultPii: false` in `Sentry.init()` and add `beforeSend` scrubber for known fields (`user.email`, `body.content` for chat messages, etc.). Sentry's default server-side scrubbing covers most credit-card and password fields, not chat content.
- **Sourcemap upload misconfiguration** → stack traces show minified garbage. Fix: `withSentryConfig()` in `next.config.js` handles this when env vars are set; verify with a test error in staging.
- **Sampling at 100%** → bill explosion under load. Use 10% in production, 100% in staging.
- **Treating Vercel Analytics and Sentry as redundant** → they're complementary. Vercel = real-user p75 metrics (aggregate, no per-user debugging). Sentry = per-session issue tracking with breadcrumbs. Both are useful; cost is low.

### 3.7 Migration Path

This phase does **not** require migrating existing Pino call sites. The pattern is:

1. Install `@sentry/nextjs` and `@vercel/otel`.
2. Add `instrumentation.ts` and `sentry.{server,edge,client}.config.ts`.
3. Configure env vars (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`).
4. Wire `withTiming` to also push spans to Sentry (additive, ~20 lines in `src/shared/api/observability.ts`).
5. Add breadcrumb calls in 3-4 high-value logger sites (`apiLogger`, `authLogger`).
6. Document the runbook in `docs/STEERING/OBSERVABILITY.md` (new file, ~50 lines).

Effort: 3-5 dev days. Risk: low (additive).

### 3.8 Validation Architecture

| Test ID | Behavior                                                        | Test Type        | Command                   |
| ------- | --------------------------------------------------------------- | ---------------- | ------------------------- |
| OBS-01  | Sentry init runs without throwing in test env                   | unit             | `pnpm test:sentry-init`   |
| OBS-02  | `withTiming` returns a function that still works without Sentry | unit             | `pnpm test observability` |
| OBS-03  | `instrumentation.ts` exports `register` and `onRequestError`    | unit (type-only) | `pnpm typecheck`          |
| OBS-04  | No PII in Sentry breadcrumb payload                             | unit             | `pnpm test pii-scrub`     |

Wave 0 gaps: test file scaffolding for the four tests above (small, ~50 lines total).

## 4. Plan 44-03 — Architecture Audit Wave A (Property shape, helpers, shared HTTP, dead code)

Four BDs in this wave, all sourced from `docs/cleaner_react_architecture.md` and `docs/UBIQUITOUS_LANGUAGE.md` conflict register.

### 4.1 `qig` — Shared HTTP client extraction

**What:** The 5 audit pages mention a pattern of inline `fetch` + manual `try/catch` scattered across widgets. Extract to a shared `apiClient` in `src/shared/api/`.

**Architectural choice (A vs B vs C):**

| Option                       | Description                                                                                        | Pros                                                        | Cons                                                                    | Verdict                |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| A. Thin wrapper over `fetch` | Single `apiFetch<T>(url, init)` that handles JSON parse, error normalization, request-id injection | Minimal magic, easy to test, plays well with TanStack Query | Doesn't help with caching/dedup                                         | **Recommended**        |
| B. Full SDK (axios-style)    | Interceptors, transformers, retry logic                                                            | Feature-rich                                                | Massive bundle, fighting Next.js                                        | Rejected — too much    |
| C. Move to tRPC              | Type-safe RPC over fetch                                                                           | End-to-end types                                            | We already have tRPC per AGENTS.md; this is for the _external_ boundary | Rejected — wrong scope |

The right scope: **apiFetch is for third-party calls (Supabase REST, external APIs); tRPC handles internal.** Don't conflate.

**Pattern:**

```typescript
// src/shared/api/api-client.ts
import { getRequestId } from './observability';
import { apiError, type ApiError } from './api-response';

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': getRequestId(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      code: 'NETWORK_ERROR',
      message: res.statusText,
    }));
    throw err;
  }
  return res.json() as Promise<T>;
}
```

**Migration target:** The 4 production callsites that use `usePageFlags` (Header, SideDrawer, Footer, MobileSpaceBar) should switch from `useState` + `useEffect` + `fetch` to `useQuery({queryFn: () => apiFetch('/api/feature-gates')})`. This is a 2-for-1: closes `qig` _and_ completes the C2 (gating) migration.

### 4.2 `9xr` — Pure helpers / business logic re-exports

**What:** `src/entities/maintenance/permissions/index.ts` is a one-line re-export of `canManageRequests` from `@entities/tenant`. That's a barrel-sidestep. Either move `canManageRequests` to live in the maintenance entity, or expose it from `@entities/tenant`'s public API and stop importing through `@entities/maintenance/permissions`.

**Recommendation:** Move `canManageRequests` into the maintenance entity's `model/permissions.ts` (it is _about_ maintenance requests, not tenant identity). The tenant entity should not know about maintenance concerns — that's an upward dependency violation. Steiger `forbidden-imports` will catch this if any of the 7+ admin widgets that import from `@entities/tenant` accidentally import maintenance logic.

### 4.3 `2z4` — Property shape conflict (C1 in `UBIQUITOUS_LANGUAGE.md`)

**What:** The codebase has at least 2 conflicting "Property" shapes — one from the property/real-estate domain and one from the auth/identity `User.property` field. The audit and `UBIQUITOUS_LANGUAGE.md` agree: the latter is a misnomer.

**Recommendation:**

- Rename the auth/identity field `User.property` → `User.householdId` (or `User.primaryResidenceId`) — the field is "which home in the community this user belongs to", not a real-estate property record.
- DB migration: keep column name `property` (cheap to deprecate) but expose only the new name in the Drizzle schema; add a `deprecated` JSDoc tag.
- Update 12+ callsites that read `user.property` — see grep for `\.property\b` in `src/`.
- Drop the alternative "property" type alias that some files still import.

Effort: 1-2 dev days. Risk: medium (auth-critical). Recommend feature-flagged rollout if rollout safety matters.

### 4.4 `r13u` — Dead code / unused exports

**What:** Steiger baseline flags a small set of unused exports and dead slices. 3a3v cluster (12+ findings).

**Recommendation:** Don't try to be clever. Run `pnpm ts-prune` (or `knip`) to find unused exports, then delete in batches. Don't try to be 100% clean — 80% is fine for launch. Document the survivors in a "dead-code-known" comment so the next audit wave doesn't redo the work.

## 5. Plan 44-04 — Architecture Audit Wave B (Cross-cutting concerns)

Two BDs.

### 5.1 `fpc` — Cross-entity type fan-out

**What:** `src/entities/tenant/` exports types that are imported by 6+ other entities (admin, auth, user, content, announcements, maintenance). This is the `08st` cluster (9 findings). The root cause: tenant is the "anchor" entity that every other entity needs, but importing types across the FSD layers is a `forbidden-imports` violation.

**Recommendation:**

- Promote the shared types from `@entities/tenant` to `@shared/types` (or to the `model` segment of the importing entity with a `@shared/types` re-export).
- Specifically: `TenantId`, `TenantContext`, `WithTenant` should live in `@shared/types/tenant.ts` (no runtime code, just types). Entities can then import types without violating FSD layers.
- Runtime helpers (`withTenant`, `isModuleEnabled`, `useTenant`) stay in `@entities/tenant`.

This pattern: **types layer-up freely; runtime layer-up via public API only.** Document the rule.

### 5.2 `1eh` — Admin widget fan-in (26 findings in `nf5r` cluster)

**What:** `@entities/admin/` is imported by 20+ widgets in `@widgets/admin/`. The imports cross from `widgets` to `entities` (which is correct in FSD), but several of them reach for _internal_ modules of admin (not the public API). The fix is to consolidate admin's public API at `src/entities/admin/index.ts` and force all imports through it.

**Recommendation:**

- Audit `src/entities/admin/` for module surface. The current `index.ts` exposes: types, hooks, server actions, components.
- Tighten: components stay private (used internally by `model/`, exposed only via `lib/` adapters).
- Tighten Steiger: add a `no-restricted-imports` rule in `eslint.config.js` that blocks `@entities/admin/ui/*` from being imported by `widgets/`. Steiger `no-public-api-sidestep` will pick up the deeper violation.

## 6. Plan 44-05 — Architecture Audit Wave C (useQuery migration, dedup, terminology)

Four BDs.

### 6.1 `1ei` — Migrate `useState`+`useEffect`+`fetch` to TanStack Query

**What:** 10+ admin widgets use the legacy `useState` + `useEffect` + `fetch` pattern. Migrate to `useQuery`.

**Migration target:**

```typescript
// Before
const [data, setData] = useState<X | null>(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/x')
    .then(r => r.json())
    .then(d => {
      setData(d);
      setLoading(false);
    });
}, []);

// After
const { data, isLoading, error } = useQuery({
  queryKey: ['x'],
  queryFn: () => apiFetch<X>('/api/x'),
});
```

**Priority order:** Start with the 4 `usePageFlags` callsites (Header, SideDrawer, Footer, MobileSpaceBar) because they also close C2. Then admin widgets in `src/widgets/admin/ui/` (10 files identified).

### 6.2 `5u2` — Maintenance request dedup

**What:** Maintenance has duplicate request types and conflicting dedup logic between `request/list` and `request/stream` endpoints. Per `docs/cleaner_react_architecture.md`.

**Recommendation:** Consolidate to a single `MaintenanceRequest` type in `@entities/maintenance/model/types.ts`; have both endpoints return the same shape. The shape conflict is the "head" of a much longer chain — fixing it cleans up 3+ downstream components.

### 6.3 `brp` — `residencyType` → canonical term

**What:** `UBIQUITOUS_LANGUAGE.md` says `residencyType` is a legacy term. The canonical term is `occupancyType` (or whatever the glossary says — verify in `docs/STEERING/GLOSSARY.md`).

**Recommendation:** Grep `residencyType` across `src/`; rename in Drizzle schema (column rename migration), update all type imports, update tests. Don't break Drizzle relations — do the migration in two phases: (1) add new column, dual-write; (2) drop old column after soak.

### 6.4 `huo` — `occupantType` → `householdRole`

**What:** Same as `brp` for a different legacy term. Same approach: dual-column migration, deprecate old name in JSDoc, drop after soak.

## 7. Plan 44-06 — M4.5 Follow-ups

Four BDs, all low-risk cleanups from the M4.5 milestone retrospective. Recommended: ship as one plan with 4 task clusters, ~3-5 dev days total.

### 7.1 `tc4` — Toast unification cleanup

**What:** The M4.5 work landed toast unification but left a few stragglers (direct `toast()` calls bypassing the wrapper). Grep and consolidate.

**Validation:** `pnpm test:e2e -- toast` should not see any legacy toast patterns.

### 7.2 `mls9` — I18n hydration fix residue

**What:** The M4.5 hydration fix from Phase 42 may have left a few server/client boundary mismatches. Run a static check: `pnpm fsd:check` should report 0 new findings post-fix.

### 7.3 `n0rh` — Admin route consolidation residue

**What:** Phase 37 consolidated admin routes but a few legacy paths still exist as redirect shims. Delete the shims once we have confidence no traffic hits them (Vercel Analytics → 0 in last 30 days).

### 7.4 `cs5` — MyHomeSpace component split

**What:** `MyHomeSpace.tsx` is over the 200-line component limit (it's currently ~340 lines per AGENTS.md). Split into:

- `MyHomeSpace.tsx` (orchestrator, ≤80 lines)
- `MyHomeSpaceHeader.tsx`
- `MyHomeSpaceStats.tsx`
- `MyHomeSpaceActions.tsx`

This is the most mechanical of the four; lowest risk.

## 8. Plan 44-07 — pnpm Advisories Triage (`nn39`)

### 8.1 Audit Summary

`pnpm audit --json` reports 70 total advisories: 0 critical, **19 high**, 42 moderate, 9 low.

**Critical finding:** All 19 high-severity advisories are in **dev/build-time only paths**:

| Affected package           | Path                                           | Ships to prod?          |
| -------------------------- | ---------------------------------------------- | ----------------------- |
| `prisma-generator-drizzle` | `prisma generate`                              | No (codegen output)     |
| `@better-auth/cli`         | `pnpm auth:generate`                           | No (build-time codegen) |
| `@vitejs/plugin-react`     | Vite dev server (not used in production build) | No                      |

Plus 1 transitive (esbuild) via Vite plugin, also dev-only.

**Recommendation:** Reclassify `nn39` from P1 → P3 in BD. Add a `pnpm audit:prod` script that runs `pnpm audit --prod` to surface _only_ runtime-shipped vulnerabilities. Run weekly in CI. Document in `docs/STEERING/SECURITY.md` (new file, ~30 lines).

### 8.2 Why this is P3 not P1

- 0 critical, 0 runtime-shipped high.
- All findings are in build pipelines; an attacker exploiting one would already have CI write access.
- Pinning to patched versions is a follow-up but does not block M5 launch.

### 8.3 Caveats

- Re-validate when Next.js, Prisma, Better Auth, or Vite are upgraded — the dev-path may shift to runtime.
- The 42 moderate advisories include some _runtime_ paths (e.g., `cookie`, `tar`); these need a separate pass and may genuinely be P1. Recommend splitting `nn39` into `nn39-runtime` and `nn39-build` and re-triaging runtime ones.

## 9. Plan 44-08+ — FSD Debt Cluster Remediation

The 582-violation baseline breaks down into 8 clusters (per `44-01-SUMMARY.md`). ROI-ordered:

| Order | Cluster ID | Count   | Pattern                                                                     | Effort | Risk     | Approach                                                                              |
| ----- | ---------- | ------- | --------------------------------------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| 1     | `ohj8`     | 7       | Missing public API (`@entities/{content,user,announcements,auth}/index.ts`) | Hours  | Low      | Auto-fix: create 4 empty barrel files. Then run Steiger again.                        |
| 2     | `3qio`     | 1       | `src/widgets/pricing-app/` orphan                                           | Hours  | Low      | Delete or relocate to `@features/` (only if M5 actually needs it; check with product) |
| 3     | `s50y`     | 1       | `src/types/css.d.ts`                                                        | Hours  | Low      | Move to `src/shared/types/css.d.ts`                                                   |
| 4     | `3a3v`     | 12+     | Dead slices                                                                 | Days   | Low      | Run `ts-prune` + manual triage                                                        |
| 5     | `qjpa`     | **461** | `@api/*` alias barrel-sidestep                                              | Days   | **High** | (see §9.1)                                                                            |
| 6     | `znjo`     | 28      | `shared → entities` forbidden imports                                       | Days   | Medium   | Move shared-side types up to `@shared/types`                                          |
| 7     | `08st`     | 9       | Tenant type fan-out (covered by `fpc`)                                      | Days   | Medium   | Covered by 44-04 `fpc`                                                                |
| 8     | `nf5r`     | 26      | Admin widget fan-in (covered by `1eh`)                                      | Days   | Medium   | Covered by 44-04 `1eh`                                                                |

### 9.1 `qjpa` — The 461-Finding Cluster (the elephant)

This is **79% of all FSD debt.** Pattern: a `@api/*` path alias was created at some point and many files import deeply through it instead of using the slice's public API.

**Two viable approaches:**

| Approach                   | Description                                                                                                                           | Pros                                  | Cons                                                                                | Verdict                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| A. Codemod via jscodeshift | Write a transform that replaces `@api/foo/bar` with the canonical `@entities/foo` (or `@features/foo` depending on layer) import path | Mechanical, fast, auditable in one PR | Requires careful handling of name collisions; one bad transform = many broken files | **Recommended** — appropriate for the scale |
| B. ESLint autofix + manual | Add a `no-restricted-imports` rule that flags `@api/*` and run `--fix` to replace with the canonical path                             | Built into the existing toolchain     | Less precise; may need many iterations                                              | Backup if codemod fails                     |
| C. Accept the sidestep     | Move the `@api/*` alias to the public API allow-list in `steiger.config.js`                                                           | Zero code change                      | Codifies a violation; future debt growth                                            | Rejected — debt accumulation                |

**Rollout safety:**

- Ship the codemod as one PR.
- Run `pnpm typecheck`, `pnpm test`, `pnpm fsd:check`, `pnpm build` to validate.
- Run soak in staging for 24h.
- If green, mark cluster closed. If not, bisect by slice.

### 9.2 `znjo` — Shared-to-Entities Imports

**What:** 28 cases where `@shared/*` files import from `@entities/*`. This is the **reverse** of the canonical FSD flow (entities sit above shared; shared must not depend on entities).

**Fix shape:** Most of these are _types_ that were placed in `@shared/` but should be in `@entities/{X}/model/`. The runtime code that uses them already lives in entities, so the right move is to relocate the shared file into the relevant entity, then update imports to point at the entity's public API. Steiger will then be happy.

## 10. Recommended Execution Order

### 10.1 The plan, ordered

| Plan                            | BD sources                   | Effort estimate            | Risk                   | Dependencies                                        |
| ------------------------------- | ---------------------------- | -------------------------- | ---------------------- | --------------------------------------------------- |
| **44-07** pnpm reclass          | `nn39`                       | 1-2 dev days               | Low                    | None                                                |
| **44-06** M4.5 follow-ups       | `tc4`, `mls9`, `n0rh`, `cs5` | 3-5 dev days               | Low                    | None                                                |
| **44-02** Monitoring stack      | (new, no BD)                 | 5-8 dev days + 1-week soak | Low (additive)         | None                                                |
| **44-03** Audit wave A          | `qig`, `9xr`, `2z4`, `r13u`  | 5-7 dev days               | Medium (auth-critical) | None                                                |
| **44-04** Audit wave B          | `fpc`, `1eh`                 | 4-6 dev days               | Medium                 | 44-03 partial (`9xr` relocation)                    |
| **44-05** Audit wave C          | `1ei`, `5u2`, `brp`, `huo`   | 5-7 dev days               | Medium                 | 44-03 partial (api-client extracted)                |
| **44-08** FSD: easy wins        | `ohj8`, `3qio`, `s50y`       | 1-2 dev days               | Low                    | None                                                |
| **44-09** FSD: dead slices      | `3a3v`                       | 2-3 dev days               | Low                    | 44-08 (so we don't redo public API for dead slices) |
| **44-10** FSD: `qjpa` codemod   | `qjpa`                       | 5-7 dev days + soak        | **High**               | 44-02 (observability gives us confidence)           |
| **44-11** FSD: `znjo` + cleanup | `znjo` + residuals           | 4-6 dev days               | Medium                 | 44-10                                               |

**Total: ~37-58 dev days, ~8-12 calendar weeks at 1 dev** — feasible for an 8-week pre-launch window if we start with 44-07 + 44-06 immediately.

### 10.2 The reasoning

- **Cheap-first.** 44-07 and 44-06 are hours-to-days and clear BD backlog. Doing them first makes every subsequent plan's BD references cleaner.
- **Observability before architecture changes.** 44-02 ships first among the "real" plans. Why: the 44-10 `qjpa` codemod is the single highest-risk item in the phase; we want Sentry + `@vercel/otel` deployed _before_ we touch 461 files, so we have signal if something breaks.
- **Audit waves in increasing criticality.** Wave A has the auth-critical `2z4` (Property shape) — do it before the riskier FSD work. Wave C has the `useQuery` migration which is a quality-of-life improvement that the FSD work would benefit from.
- **FSD debt last.** Mechanical churn after the test coverage and observability are at their strongest. The 461-file codemod in 44-10 is the most likely to introduce a regression; we want every safety net in place first.

### 10.3 Open questions for discuss-phase

1. **Sentry org setup** — is the project already in a Sentry org, or do we need to create one? (This blocks 44-02 kickoff.)
2. **Vercel Pro plan timing** — Log Drains require Pro. If we're on Hobby, the soak signal set is reduced. (Impacts 44-02.)
3. **Phase 47 hand-off** — dWallet work is in progress; do any of the M4.5 follow-ups (`cs5` MyHomeSpace split) touch files Phase 47 is also editing? (Check the `dwallet-planning-build` branch.)
4. **Property rename (`2z4`) rollout safety** — is feature-flagged rollout worth the cost, or is the user base small enough to ship and revert? (Impacts 44-03 plan detail.)
5. **FSD codemod test strategy** — do we have sufficient test coverage to validate a 461-file codemod? If not, 44-10 needs a "land behind flag" sub-step.

## Sources

### Verified (HIGH confidence)

- `steiger.config.js` (project) — rule severities, sidestep allow-list
- `44-01-baseline-report.txt` (project) — 582 violation scan output
- `44-01-SUMMARY.md` (project) — cluster summary
- `44-CONTEXT.md` (project) — locked decisions, BD sources
- `src/shared/api/observability.ts` (project) — existing withTiming pattern
- `src/shared/lib/logger.ts` (project) — Pino configuration
- `src/shared/api/feature-gate.ts` (project) — feature-gate route pattern
- `pnpm audit --json` output (run 2026-06-07) — 70 advisories, 19 high, 0 runtime
- https://nextjs.org/docs/app/guides/open-telemetry — `@vercel/otel` recommended pattern
- https://docs.sentry.io/platforms/javascript/guides/nextjs/ — Next.js SDK setup
- https://sentry.io/cookbook/vercel-ai-sdk-otel-sentry — `skipOpenTelemetrySetup` pattern

### Cited (MEDIUM confidence)

- `docs/cleaner_react_architecture.md` (project) — source for 5 audit findings
- `docs/UBIQUITOUS_LANGUAGE.md` (project) — conflict register C1, C2
- Vercel Pricing page (announcement) — Vercel Observability free on all plans
- `@sentry/nextjs` 10.51.0 release notes — current version as of 2026-06
- `@vercel/otel` 1.x — current major (verify exact version in 44-02 kickoff)

### Assumed (LOW confidence — flag for validation)

- The exact 12 admin widgets that use `useState+useEffect+fetch` (count from grep, not full audit)
- The exact 28 `znjo` violations (count from baseline report, not individually inspected)
- The 12+ `3a3v` dead-slice findings (count from baseline report)
- Pino version 9.7.0 as currently installed (verify in `package.json`)

## Metadata

**Confidence breakdown:**

- Standard stack (Pino + Sentry + OTel): HIGH — verified via official docs
- Architecture (Pino + Sentry co-existence): HIGH — verified integration pattern
- Pitfalls (PII, sourcemaps, sampling): MEDIUM — based on official docs + project patterns
- 44-03 deep-dive (audit wave A): HIGH for `qig` and `9xr` (concrete code targets), MEDIUM for `2z4` (rename scope uncertain)
- 44-04 / 44-05 (audit waves B/C): MEDIUM — pattern-level recommendations, not deep-dive
- 44-06 (M4.5 follow-ups): MEDIUM — based on 44-CONTEXT.md descriptions
- 44-07 (pnpm reclass): HIGH — verified all 19 high advisories are dev-paths
- 44-08+ (FSD ordering): MEDIUM — ROI ranking is sound, exact effort estimates are approximate
- Execution order: MEDIUM — defensible but the user may prefer a different priority (e.g., do 44-10 codemod earlier to retire the biggest debt cluster)

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (30 days; Sentry/Next.js/Vercel move fast — re-validate version pins before each plan kickoff)
