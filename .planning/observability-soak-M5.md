# Observability Decision Document — M5b Soak

> **Stack:** Pino + PostHog
> **Scope:** Decision document for the 7-day production soak (M5b Launch, Phase 45)
> **Status:** Ratified by Plan 44-02
> **Last updated:** 2026-06-08

---

## §1 Decision Summary

**Chosen stack: Pino (existing server-side logging) + PostHog (client-side analytics, session recording, error tracking).**

- **Pino** remains the server-side structured logging source of truth — `apiLogger`, `dbLogger`, `authLogger`, `uploadLogger` child loggers with `withTiming`/`createLogContext`/`getRequestId` request correlation. No migration needed.
- **PostHog** replaces Sentry + `@vercel/otel` as the client-side observability surface — autocapture for clicks/navigation/form interactions, session recordings for UX debugging, error tracking via PostHog Issues/Errors tab, and pageview analytics via `PostHogPageView` component.
- **Sentry + @vercel/otel** was the original recommendation from `44-RESEARCH.md` §3 but was rejected in favour of PostHog because: (a) all-in-one platform — analytics + session recording + feature flags in one SDK, (b) simpler setup — no `@vercel/otel` / `@opentelemetry/api` complexity, no Sentry org provisioning, (c) autocapture means zero instrumentation code for basic interactions, (d) open-source friendly and cheaper at current scale.
- **Datadog APM** — rejected: Vercel + PostHog covers the same ground for less cost and no agent install.
- **Logtail / Better Stack / Axiom** — rejected: Vercel Logs (free) + Log Drains (Pro plan) is sufficient until traffic warrants; revisit at M6.
- **New Relic** — rejected: same reasoning; agent install on Vercel is non-trivial.
- **Grafana Cloud** — rejected: overkill for current scale; would require running our own OTel collector.

---

## §2 Capability Map

| Capability | Primary Tier | Secondary Tier | Status |
|---|---|---|---|
| Structured app logging | API/Backend | Frontend Server (SSR) | ✅ **Live** — Pino via `apiLogger`/`dbLogger`/`authLogger`/`uploadLogger` |
| Product analytics | Browser/Client | — | 🆕 **Added in this plan** — PostHog autocapture + pageviews |
| Session recording | Browser/Client | — | 🆕 **Added in this plan** — PostHog Replays with privacy masking |
| Real User Monitoring | Browser/Client | CDN/Edge (Vercel) | ✅ **Live** — Vercel Web Vitals (free on all plans) |
| Alerting & on-call | CDN/Edge (Vercel) | PostHog dashboard | 🆕 **Added in this plan** — alert threshold definitions + on-call escalation |
| Error tracking | Browser/Client | API/Backend | 🆕 **Added in this plan** — PostHog Issues/Errors tab for client errors; Vercel Monitoring for server 5xx |

---

## §3 Standard Stack

| Library | Version (pinned) | Purpose | Where installed / used |
|---|---|---|---|
| `pino` | 10.3.1 | Structured server-side logging | `src/shared/lib/logger.ts` (apiLogger, dbLogger, authLogger, uploadLogger) |
| `posthog-js` | 1.382.0 | Client-side analytics + session recording + error tracking | Loaded from npm bundle via `src/instrumentation-client.ts` (not CDN) |
| `@posthog/next` | 0.4.82 | PostHog React Server Component provider + pageview tracking | `src/app/layout.tsx` (PostHogProvider + PostHogPageView) |

Note: `posthog-js` is loaded from the npm bundle via `instrumentation-client.ts`, not a CDN script tag. This eliminates the CDN supply-chain risk and ensures the SDK is bundled with the application.

---

## §4 Architecture Pattern: Pino + PostHog

The observability stack has two layers:

### Layer 1: Server-side structured logging (Pino — unchanged)

Pino continues to log structured JSON from API routes, auth flows, database operations, and upload handlers. The existing `withTiming` wrapper (in `src/shared/api/observability.ts`) captures request duration for each API call. The `createLogContext` helper attaches `requestId`, `tenantId`, `actorId`, and `route` to every log line. The middleware (`src/middleware.ts`) sets an `x-request-id` header on every request, which flows through to Pino logs for correlation. No changes needed — this layer is already live.

### Layer 2: Client-side analytics + session recording (PostHog — new)

PostHog is initialised **before React hydration** via `src/instrumentation-client.ts` (Next.js 15.3+ lightweight pattern). The `instrumentation-client.ts` hook runs in the browser during the pre-hydration phase, so PostHog can capture events from the very first render:

```typescript
// src/instrumentation-client.ts
import { posthog } from 'posthog-js'

export function register() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest',
      defaults: '2026-01-30',
      capture_pageview: false, // handled by PostHogPageView component
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '*',
      },
    })
  }
}
```

**Critical integration rule:** `defaults: '2026-01-30'` enables `external_scripts_inject_target: 'head'` which avoids SSR hydration errors where PostHog tries to inject `<script>` tags during server-side rendering. Without this setting, PostHog would attempt DOM manipulation during SSR, causing `window is not defined` errors.

**Pageview tracking** is handled by the `PostHogPageView` client component (from `@posthog/next`), placed inside `<Suspense fallback={null}>` in the root layout. This component uses `useSearchParams()` and `usePathname()` from Next.js to fire `$pageview` events on every client-side navigation.

**Reverse proxy:** Events are sent to `api_host: '/ingest'` (same-origin path), which Next.js rewrites to `NEXT_PUBLIC_POSTHOG_HOST` via `next.config.mjs`. This avoids ad-blocker interference and keeps event payloads on the same origin.

---

## §5 PII Scrubbing Rules

### PostHog autocapture (client-side)

| Rule | Implementation | Scope |
|---|---|---|
| Mask all input values | `maskAllInputs: true` in `posthog.init()` | All `<input>`, `<textarea>`, `<select>` elements — values are captured as `***` |
| Mask all text by default | `maskTextSelector: '*'` in `posthog.init()` | All text content is masked — nothing recorded unless explicitly opted in |
| Opt in to text capture | Add `.ph-capture` CSS class | Elements whose text should be visible in replays (e.g., button labels you want to track clicks on) |
| Never record | Add `.ph-no-capture` CSS class | Elements that should never appear in recordings (e.g., chat message areas, email displays, property addresses) |
| Mask specific element | Add `.ph-mask` CSS class | Elements whose content should be blurred in recordings |
| Ignore input | Add `.ph-ignore-input` CSS class | Inputs whose interaction should not be captured as autocapture events |

**Implementation plan:**
- `maskAllInputs: true` and `maskTextSelector: '*'` are set at init time in `instrumentation-client.ts` — these are the defaults for all elements.
- After deployment, review session replays during the soak to verify masking is working as expected.
- Add `.ph-no-capture` to sensitive UI elements (chat message containers, property address displays, user email displays) as needed during the soak — this is a CSS-only change, no code push needed.

### Pino server-side (existing)

Pino logs are structured JSON and already exclude sensitive data at the application level. The following fields are explicitly redacted from Pino log output by convention:

- `req.headers.authorization` — bearer tokens
- `req.headers.cookie` — session cookies
- `user.email` — user email addresses
- `property.address` — property addresses

Note: Pino does NOT transmit client-side analytics — only server-side structured logs. Client-side analytics flow through PostHog and are governed by the PostHog masking rules above.

---

## §6 Soak Signal Set

| Signal | SLO target | Alert threshold | On-call action | Measured at |
|---|---|---|---|---|
| Server p75 TTFB | < 1.2s | > 1.2s for 5 min | Check Vercel Analytics for cold start; check DB warm | Vercel Web Vitals |
| Server error rate | < 1% | > 1% for 5 min | Check Vercel Monitoring 5xx | Vercel Monitoring |
| Client JS error rate | < 0.5% | > 0.5% for 5 min | Check PostHog — Issues / Errors tab, filter by `env: production` | PostHog Errors |
| Real-user p75 LCP | < 4s | > 4s for 5 min | Check the route in Vercel Analytics; look for slow widget | Vercel Web Vitals + PostHog Web Vitals |
| Pino error log rate | < 5/sec | > 5/sec for 5 min | Check Vercel Logs; find the most-frequent error message | Vercel Logs query |
| Chat delivery | > 99% in 3s | < 99% for 5 min | Check Supabase Realtime status; check `/api/messages` route latency | Custom event via `withTiming` |
| PostHog event backlog | < 100 unprocessed | > 100 for 10 min | Check PostHog Project Settings → Data Pipeline → Events; flush backlog | PostHog dashboard |

---

## §7 Soak Start/Stop/Abort Criteria

### Start criteria

All 7 SLOs (from §6) must be green for a continuous 24-hour pre-soak verification period before the 7-day soak can officially begin. The pre-soak verification runs on the production deployment with production traffic. This ensures the observability stack itself is working — if PostHog isn't receiving events or Vercel Logs are empty, the soak signal set is blind.

### Stop criteria

The soak ends after 7 calendar days with all 7 SLOs green (no P0/P1 incidents during the entire soak period). At stop, the M5b launch team files a soak-complete report documenting:
- Observed signal values (p50/p95/p99 for server metrics)
- Any P2/P3 incidents encountered and their resolution
- PostHog event volume and plan usage
- Recommendations for adjustments before production launch

### Abort criteria

The soak is immediately aborted if any of the following occur:

| Criterion | Rationale |
|---|---|
| Any P0 incident | Data loss, auth bypass, or complete service outage — the system is not ready for production traffic |
| >2 P1 incidents in any 24h window | Reliability is degraded below acceptable level — fix root cause before retrying |
| Any SLO alert sustained at 2x threshold for 30 min | Signal suggests systemic degradation that isn't self-healing |

---

## §8 On-Call Escalation Path

During the 7-day soak, a rotating on-call engineer monitors the signal set and handles alerts:

| Tier | Response time | Escalation | Channel |
|---|---|---|---|
| P0 (service down / data loss) | Immediate | PagerDuty webhook → SMS to rotation owner | Slack `#m5-soak` + SMS |
| P1 (degraded / partial outage) | 5 min response | PagerDuty webhook → Slack `#m5-soak` | Slack `#m5-soak` |
| P2 (non-critical issue) | Next business day | GitHub issue tracking | GitHub / BD issue |

**Rotation owner:** TBD — to be filled before soak start by the Phase 44/45 team.

**Escalation policy:**
1. Alert fires → PagerDuty webhook posts to Slack `#m5-soak`.
2. If no acknowledgement within the response time, PagerDuty escalates to SMS / phone call to the rotation owner.
3. If rotation owner does not respond within 2x the response time, the backup on-call (Phase 44/45 lead) is notified.

---

## §9 M5b Hand-off

PostHog is the analytics surface for the 7-day M5b soak. The instrumentation shipped in this plan (Task 3: `instrumentation-client.ts`, Task 4: layout.tsx) is sufficient for the soak. There is no separate code plan after this for additional observability infrastructure.

If the team needs deeper features during or after the soak:
- **Group analytics (tenant-level aggregation):** Deferred — create a BD issue if tenant-level PostHog insights are needed during M5b.
- **Custom events on server-side actions:** Can be added via `posthog.capture()` in API routes — create a BD issue per use case.
- **Feature flags via PostHog:** `PostHogProvider bootstrapFlags` is wired, but no custom flags are defined yet — create a BD issue when a flag is needed.

---

## §10 Open Questions

| # | Question | Status |
|---|---|---|
| 1 | **PostHog reverse-proxy host:** `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` is confirmed as the correct PostHog cloud host. | ✅ **RATIFIED** — `https://eu.i.posthog.com` |
| 2 | **Session recording opt-in scope:** Session recordings should be enabled on **specific flows only** (not all pages). Default init remains `maskTextSelector: '*'` (privacy-safe by default). Opt-in per flow by adding `.ph-capture` to target elements when a specific flow needs recording. | ✅ **RATIFIED** — specific flows only |
| 3 | **Group analytics setup:** Tenant-level aggregation confirmed not needed for the M5b soak. | ✅ **DEFERRED** — revisit post-launch |

---

## §11 References

| Reference | Purpose |
|---|---|
| `44-RESEARCH.md` (§3) | Original observability deep dive (Sentry stack — superseded by this document) |
| `44-CONTEXT.md` | Phase 44 acceptance criterion: "monitoring infrastructure planning" |
| `44-UI-SPEC.md` (§D4) | UI design contract — D4 (Observability Surfaces) is superseded by this document |
| `.planning/MILESTONES.md` | Soak start/stop criteria, rollback procedure |
| `src/shared/lib/logger.ts` | Pino child loggers — `apiLogger`, `authLogger`, `dbLogger`, `uploadLogger` |
| `src/shared/api/observability.ts` | `withTiming`, `createLogContext`, `getRequestId` helpers |
| `src/middleware.ts` | `x-request-id` header generation for request correlation |
