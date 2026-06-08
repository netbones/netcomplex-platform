# Operational Runbook — M5b Soak Observability

> **Stack:** Pino + PostHog
> **Audience:** M5b launch team (on-call rotation)
> **Decision doc:** `../.planning/observability-soak-M5.md`
> **Last updated:** 2026-06-08

---

## §1 Overview

This runbook covers the 7-day M5b production soak observability stack. There are three observability surfaces:

- **PostHog** — Product analytics, error tracking (Issues/Errors tab), session recordings (Replays), and client-side pageview analytics.
- **Vercel** — Web Vitals (LCP, TTFB, CLS), server error rate (Monitoring tab), structured Pino logs (Logs tab).
- **Pino** — Server-side structured JSON logging via `apiLogger` / `dbLogger` / `authLogger` / `uploadLogger` with request correlation via `requestId`.

The strategic rationale for the stack is documented in `.planning/observability-soak-M5.md` (decision document). This runbook is the on-the-job reference — keep it open during the soak.

---

## §2 PostHog Dashboard Tour

### Access

Navigate to your PostHog project dashboard (e.g., `https://eu.posthog.com/project/<id>`). You need a PostHog account with at least `Viewer` role for the project.

### Daily checks during the soak

- **Dashboard tab:** Favourite the "Soak Signal Set" metric tiles (custom-created from the §6 signal set). Check the 24h trend for errors, pageviews, and event volume first thing each day.
- **Insights tab:** Run a pageview trend for the last 24h (filter by `env: production`). Run an autocapture event count trend. Check the error trend — a spike above 0.5% triggers the P1 alert.
- **Replays tab:** Watch 1–2 session recordings per day. Verify `maskAllInputs` and `maskTextSelector` are working — you should see masked text (`***`) and blurred inputs. If you see readable PII, file a BD issue to add `.ph-no-capture` to the offending UI elements.
- **Persons & Groups tab:** Verify person profiles are being created. You should see person profiles with `tenantId` as a person property (if available). Profiles should NOT contain email addresses, property addresses, or chat message text.
- **Data Management → Events tab:** Check event volume. PostHog free tier includes 1 million events/month. If the soak generates more, consider upgrading the plan.

### Things to watch for

- **Zero events:** If PostHog shows no events after deployment, check that `instrumentation-client.ts` is loading (open browser DevTools → Network tab → filter by `posthog` or `/ingest`).
- **PII visible in replays:** If you see readable text in session recordings, the masking config may not be applying. Verify `maskTextSelector: '*'` is present in `posthog.init()`. Add `.ph-no-capture` CSS class to the offending elements.
- **High event volume:** Autocapture fires events on every click and form interaction. If the event volume exceeds PostHog plan limits, you can reduce it by setting `autocapture: false` in `instrumentation-client.ts` or by adding `.ph-no-capture` to high-frequency elements.

---

## §3 Vercel Monitoring + Web Vitals Tour

### Access

Navigate to your Vercel project dashboard → Project (e.g., `soralia-village`) → Analytics / Logs / Monitoring tabs.

### Daily checks during the soak

- **Analytics tab → Web Vitals:** Check p75 LCP, TTFB, and CLS for the last 24h. Compare against the SLO targets in the decision doc §6. A sustained p75 TTFB above 1.2s triggers the P1 alert.
- **Logs tab:** Query Pino JSON lines. Use the cheatsheet in §4 below for common queries. Filter by `component: "api"` for API route logs, `component: "auth"` for auth route logs. Check for any `level:error` entries.
- **Monitoring tab:** Check 5xx error rate per route. A rate above 1% sustained for 5 minutes triggers the P1 alert. The 5xx breakdown by route helps you identify which endpoint is failing.

---

## §4 Pino Log Query Cheatsheet

All Pino logs are available in Vercel Logs as structured JSON. Each log line includes a `component` field set by the child logger (`api`, `database`, `auth`, `upload`). Use these queries in the Vercel Logs search bar:

| Scenario | Query | Expected output |
|---|---|---|
| All errors in the last hour | `level:error @timestamp:>now-1h` | List of error-level log entries with stack traces |
| All API requests for tenant X in last 15 min | `component:api tenantId:X @timestamp:>now-15m` | API route calls for that tenant (includes `route` and `method` fields) |
| All auth failures | `component:auth level:warn message:"auth failed"` | Failed login attempts, expired sessions, etc. |
| All slow requests (>1s) for chat | `component:api duration:>1000 route:"/api/messages"` | Slow chat API requests with duration in ms |
| Correlate a request by ID | `requestId:<uuid>` | All log entries (api + database + auth) for that specific request |
| Upload errors | `component:upload level:error` | Failed file uploads with error details |
| Slow database queries | `component:database duration:>500` | Database queries taking over 500ms |

The `requestId` field is set by `src/middleware.ts` (`x-request-id` header) and propagated through `createLogContext` in `src/shared/api/observability.ts`.

---

## §5 Reading a Slow Request (worked example)

### Scenario

A resident reports that sending a chat message takes 5+ seconds. You need to diagnose why.

### Step 1: Find the slow request in Pino logs

Query Vercel Logs:

```
component:api route:"/api/messages" duration:>1000
```

You see a log line like:

```json
{
  "level": 30,
  "time": 1718000000000,
  "component": "api",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "route": "/api/messages",
  "duration": "5200ms",
  "tenantId": "soralia",
  "actorId": "user_abc123",
  "msg": "API request"
}
```

The `duration: "5200ms"` field (set by `withTiming` in `src/shared/api/observability.ts`) shows this request took 5.2 seconds.

### Step 2: Correlate by requestId

Query with the `requestId` to find related logs:

```
requestId:a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

You see a database log line:

```json
{
  "level": 30,
  "time": 1718000000500,
  "component": "database",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "duration": "4800ms",
  "msg": "INSERT into messages"
}
```

The database query took 4.8s of the 5.2s total. This points to a database bottleneck.

### Step 3: Action

- Check Supabase Realtime status (are there any reported incidents at status.supabase.com?).
- Check if the `messages` table has the expected indexes (verify in Supabase SQL editor).
- If the database is healthy, check for connection pool exhaustion (increase `pool_timeout` or add more connections).

---

## §6 Common Alerts and Their Runbook Links

| Alert (from decision doc §6) | First thing to check |
|---|---|
| **Server p75 TTFB > 1.2s for 5 min** | Open Vercel Analytics → Web Vitals. Check if the increase is global or route-specific. If route-specific, inspect that route's handler for expensive operations. |
| **Server error rate > 1% for 5 min** | Open Vercel Monitoring → 5xx breakdown by route. Identify the failing route. Check recent deployments — did a deploy correlate with the error spike? |
| **Client JS error rate > 0.5% for 5 min** | Open PostHog → Issues / Errors tab. Filter by `env: production`. Sort by frequency. The top error is likely a regression from the latest deploy. |
| **Real-user p75 LCP > 4s for 5 min** | Open Vercel Analytics → Web Vitals → LCP breakdown by route. Check if a specific page has a slow LCP. Large images or unoptimized components are common causes. |
| **Pino error log rate > 5/sec for 5 min** | Open Vercel Logs. Query `level:error @timestamp:>now-5m`. Group by `route` to find the source. |
| **Chat delivery < 99% in 3s** | Check Supabase Realtime status dashboard. Check `/api/messages` route latency in Vercel Analytics. |
| **PostHog event backlog > 100** | Open PostHog → Project Settings → Data Pipeline → Events. Click "Flush backlog". If backlog persists, check PostHog status page. |

---

## §7 Soak Abort Procedure

Follow these steps if an abort criterion is met (defined in decision doc §7).

1. **Trigger:** Abort criterion met (e.g., P0 incident, >2 P1 incidents in 24h, SLO alert at 2x threshold for 30 min).
2. **Page the rotation owner:** Use PagerDuty to escalate to the on-call rotation owner via SMS/phone.
3. **Open incident in Slack:** Post in `#m5-soak` with:
   - `[ABORT]` prefix in the message
   - The abort criterion that was met
   - Current signal values
   - A link to the relevant PostHog dashboard or Vercel chart
4. **Post the abort reason:** In the same Slack thread, describe the root cause (even if not fully diagnosed yet) and which system is affected.
5. **Run the rollback procedure:** Follow the rollback steps in `.planning/MILESTONES.md` M4.5 — Stabilization section. This typically involves reverting to the last known-good deployment.
6. **File a BD issue:** Create a BD issue documenting the root cause, the abort decision, and the remediation steps needed before the next soak attempt.
7. **Notify the Phase 44 owner:** Inform the Phase 44/45 lead that the soak was aborted and what the path forward is.

---

## §8 Local Development

### Pino pretty-printing

Pino outputs structured JSON by default. For human-readable logs in local development, pipe through `pino-pretty`:

```bash
pnpm dev | pnpm exec pino-pretty
```

This works because `next.config.mjs` has `serverExternalPackages: ['pino']`, which tells Next.js to bundle pino as an external Node module rather than bundling it with the client. Without this, `pino-pretty`'s worker-thread transport would fail at runtime with "Cannot find module lib/worker.js".

### PostHog in development

By default, PostHog events are captured to the project's PostHog instance even during local development. To avoid polluting production analytics data:

- **Option A:** Unset `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` in your local `.env.local`. PostHog will not initialise without a project key, and `instrumentation-client.ts` gracefully skips init when `typeof window === 'undefined'` or when the key is missing.
- **Option B:** Set `NEXT_PUBLIC_POSTHOG_HOST` to a local proxy URL (e.g., `http://localhost:3000/ingest`) and run a local PostHog instance or mock server. This is only needed if you're testing PostHog-specific behaviour.
- **Option C:** Set `autocapture: false` locally and enable it only when testing analytics.

---

## §9 Maintenance Windows

During planned maintenance (e.g., database migration, deployment of a new phase):

1. **Silence PostHog alert rules** — In PostHog → Alerts, mute the soak-related alerts for the expected maintenance duration.
2. **Silence Vercel log alerts** — In Vercel → Monitoring → Alerts, mute soak-related alerts.
3. **Document the window** in Slack `#m5-soak` with the start time, end time, and purpose.
4. **Re-enable alerts** immediately after maintenance completes. Verify the signal set is green before declaring the window closed.

---

## §10 References

| Reference | Purpose |
|---|---|
| `.planning/observability-soak-M5.md` | Decision document — stack rationale, signal set, start/stop/abort criteria |
| `.planning/MILESTONES.md` (M4.5) | Soak criteria, rollback procedure |
| `src/instrumentation-client.ts` | PostHog init file — used for debugging init issues |
| `src/shared/lib/logger.ts` | Pino child loggers (api, database, auth, upload) |
| `src/shared/api/observability.ts` | `withTiming`, `createLogContext`, `getRequestId` helpers |
| `src/middleware.ts` | `x-request-id` header generation for request correlation |
