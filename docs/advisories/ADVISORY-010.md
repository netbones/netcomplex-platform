# ADVISORY-010: Supabase Connection Timeout — Better Auth Session Lookups Failing

**Status:** P0 — Active production incident
**Affects:** Every authenticated request (session validation is on the hot path of `getSessionAndRole()`)
**Numbering note:** Assumed next in sequence after ADVISORY-009. Renumber if a different advisory has since been filed.

---

## 1. Problem Statement

Better Auth's session validation query against the `session` table is failing with a nested connection error:

```
ERROR [Better Auth]: INTERNAL_SERVER_ERROR
[Error: Failed query: select "id", "tenantId", "expiresAt", "token", "createdAt",
"updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId",
"impersonatedBy" from "session" where "session"."token" = $1]
  [cause]: [Error: Connection terminated due to connection timeout]
    [cause]: [Error: Connection terminated unexpectedly]
```

The query itself is trivial — a single-row lookup by token, matching the `session` model in `prisma/schema.prisma` exactly. The failure is in the connection layer beneath the query, not the query logic. Because every protected route resolves session + role via `getSessionAndRole()`, this surfaces as platform-wide 500s for any authenticated resident, board member, committee member, or admin — not a single-feature outage.

This is the production manifestation of a risk already named in `HOLISTIC.md` under Systemic Risks: a single Drizzle connection with no pooling and no retry logic, where Supabase connection limits could be hit under load.

---

## 2. Root Cause Analysis (Ranked Hypotheses — Unconfirmed)

No access to the live `src/shared/api/db.ts`, `src/shared/api/auth.ts`, Vercel env vars, or the Supabase dashboard was available when drafting this advisory. The hypotheses below are ranked by likelihood given the error signature and known architecture; **Section 6 makes verification mandatory before any fix is applied.**

| #   | Hypothesis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Reasoning                                                                                                                                                                                | Confidence                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| H1  | `DATABASE_URL` points at Supabase's **direct** Postgres connection (port 5432) rather than the Supavisor pooler, and/or the client-side pool has no bounded `max`. Under serverless concurrency (Vercel), each cold/warm invocation can open its own physical connection, exceeding Supabase's project-level `max_connections` ceiling. New connection attempts then get reset by the server, which the driver surfaces as the nested "terminated unexpectedly" / "timeout" pair seen here. | Matches the exact error pattern most commonly reported for Vercel + Supabase + node-postgres/postgres-js without pooler config. Matches the pre-existing documented risk in HOLISTIC.md. | High                            |
| H2  | No retry/backoff around the DB call, so a transient blip (idle connection reaped by the pooler/Postgres, brief network hiccup) becomes a hard failure instead of self-healing on a second attempt.                                                                                                                                                                                                                                                                                          | Independently true regardless of H1 — also explicitly named as missing in HOLISTIC.md.                                                                                                   | High (as a contributing factor) |
| H3  | A pooled/warm connection went stale (idle past Supabase's or Supavisor's idle timeout) and was reused without a liveness check, so the first query on it throws "terminated unexpectedly."                                                                                                                                                                                                                                                                                                  | Common secondary cause in serverless + Postgres setups that reuse module-scope clients across warm invocations.                                                                          | Medium                          |
| H4  | Supabase-side incident, project resize, or regional network issue independent of our connection handling.                                                                                                                                                                                                                                                                                                                                                                                   | Possible but should be quickly ruled out via status page + dashboard graph before assuming application-side cause.                                                                       | Low                             |

---

## 3. Immediate Triage (Run Now — No Code Changes)

These are read-only and safe to run while diagnosis continues:

1. Supabase Dashboard → Database → Reports — check the connection-count graph for the incident window (08:49 UTC and surrounding). Compare peak concurrent connections against the project's connection limit.
2. Supabase Dashboard → Project Settings → Database → Connection Pooling — confirm whether the pooler is provisioned, and note its mode (transaction vs session) and port.
3. status.supabase.com — check for an open incident covering the timestamp window.
4. Vercel deployment/function logs — check for a concurrency spike, redeploy, or unusual traffic immediately before 08:49:32Z.

---

## 4. Options Considered

| Option | Description                                                                                                                                                               | Decision                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | Migrate `DATABASE_URL` to Supabase's Supavisor **transaction-mode** pooler (typically port 6543) — designed for high-concurrency, short-lived serverless connections      | **Adopted**                                                                                                                                 |
| B      | Migrate to **session-mode** pooler instead — supports session-level features (prepared statements, multi-statement `SET`) but offers less connection multiplexing benefit | Rejected as primary fix; revisit only if Phase 1 discovery shows `runWithRLS()` depends on session-level state outside a single transaction |
| C      | Keep direct connection, just bound the client-side pool (`max: 1-2`)                                                                                                      | Partial mitigation only — doesn't fix the underlying ceiling risk if traffic grows; complementary to A, not a replacement                   |
| D      | Add retry/backoff wrapper around the hot-path DB call for transient connection errors                                                                                     | **Adopted**, complementary to A                                                                                                             |
| E      | Add structured logging/metric on connection errors (Pino + PostHog) so recurrence is visible, not silent                                                                  | **Adopted**, complementary to A and D                                                                                                       |

**Decision:** Combine A + D + E. The pooler migration addresses the connection-ceiling root cause; the retry wrapper absorbs the transient blips that will still occur even on a correctly pooled connection; the observability layer prevents this from going unnoticed if it recurs.

---

## 5. Architecture (Before / After)

**Before:**

```
Vercel Function (per invocation)
        |
        v
  new/reused pg connection, unbounded pool
        |
        v
  Supabase DIRECT Postgres connection (port 5432)
  max_connections ceiling shared across ALL app traffic
  -> ceiling hit under load -> "Connection terminated unexpectedly"
```

**After:**

```
Vercel Function
        |
        v
  Singleton Drizzle client (module scope), max: 1-2, bounded idle/connect timeouts
        |
        v
  Supabase Supavisor pooler (transaction mode, port 6543)
        |
        v
  Supabase Postgres — connections multiplexed, ceiling protected
        |
  [retry/backoff wrapper around hot-path session query: 2 attempts, short exponential backoff]
        |
  [Pino structured log + PostHog event on any connection-layer error, tenantId/PII scrubbed]
```

---

## 6. Pre-Execution Checklist (Mandatory Discovery — Agent Must Not Skip)

The agent must complete and report back on every item below before making any change. Do not infer — verify.

- [ ] ⏳ Print the current `DATABASE_URL` host/port pattern (password masked) from the Vercel Production environment:

  ```bash
  echo "$DATABASE_URL" | sed -E 's#(:)[^:@]+(@)#\1****\2#'
  ```

  Confirm: direct host (`db.<project>.supabase.co:5432`) vs pooler host (`...pooler.supabase.com`).

- [ ] ⏳ Paste the client/pool instantiation block from `src/shared/api/db.ts` (look for `postgres(`, `new Pool(`, or `drizzle(` calls and any `max` / `idleTimeoutMillis` / `connectionTimeoutMillis` config).

  ```bash
  sed -n '1,80p' src/shared/api/db.ts
  ```

- [ ] Search for any other Postgres client/pool instantiation outside `db.ts` — multiple independent pools would compound the exhaustion risk:

  ```bash
  grep -rn "new Pool(\|postgres(\|createPool(" src --include="*.ts" | grep -v "shared/api/db.ts"
  ```

- [ ] Confirm how Better Auth's database adapter is wired — does it reuse the shared Drizzle singleton, or open its own connection?

  ```bash
  sed -n '1,120p' src/shared/api/auth.ts
  ```

- [ ] ⏳ Confirm `runWithRLS()` in `db.ts` sets RLS context (`SET LOCAL` or equivalent) strictly within a single transaction per call, with no reliance on session-level state surviving across separate `db.query()` calls. This determines whether transaction-mode pooling is safe to adopt without breaking RLS.

  ```bash
  grep -n "runWithRLS\|SET LOCAL\|getRLSContext" src/shared/api/db.ts
  ```

- [ ] Pull the Supabase connection-count graph for the incident window (manual — dashboard screenshot or export) and record peak concurrent connections vs. the project's connection limit.

- [ ] ⏳ Check status.supabase.com for the incident timestamp window.

- [ ] **STOP AND ESCALATE to DavDev** if discovery shows the pooler is already correctly configured, the pool is already bounded, the connection-count graph shows comfortable headroom, AND status.supabase.com shows no incident. That combination falsifies H1–H4 as currently ranked and requires fresh diagnosis before any Phase 1 change is made.

---

## 7. Phased Execution Plan

### Phase 1 — Pooler Migration (only if discovery confirms a direct connection or unbounded pool)

1. Obtain the Supavisor transaction-mode pooler connection string from Supabase Dashboard → Connection Pooling.
2. Update `DATABASE_URL` (or introduce a dedicated `POOLED_DATABASE_URL` if the codebase needs to keep a direct URL for migrations) in Vercel env vars for Production and Preview.
3. In `src/shared/api/db.ts`, set explicit, conservative pool config for serverless: `max: 1` (or 2 if discovery shows concurrent in-flight queries per invocation), tuned `idle_timeout`, and a `connect_timeout` safely below the Vercel function timeout.
4. Confirm `runWithRLS()` still passes its existing test suite against the pooled connection in staging before promoting to production.
5. Deploy during a lower-traffic window; verify connection-count graph drops and stabilizes well under the project ceiling post-deploy.

### Phase 2 — Retry/Backoff Wrapper

1. Wrap the DB query executor (or at minimum, the Better Auth adapter's session lookup) with a bounded retry: 2 attempts, exponential backoff (~100ms, ~300ms), triggered only on transient connection-layer errors (`ECONNRESET`, "Connection terminated unexpectedly", "Connection terminated due to connection timeout") — never on query/logic errors.
2. Ensure retries don't loop indefinitely; after exhausting attempts, surface the original error so it isn't silently swallowed.

### Phase 3 — Observability

1. Emit a Pino structured log entry and a PostHog custom event (e.g. `db.connection_error`) on every retry and on final failure.
2. Apply the existing `beforeSend` scrubbing rule (tenantId + user PII) already standing for POPIA compliance to this new event.

---

## 8. Risk Register

| Risk                                                                                                                                               | Likelihood | Impact | Mitigation                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Transaction-mode pooling breaks RLS context if any code path holds session-level state across multiple separate queries instead of one transaction | Medium     | High   | Explicit discovery task (Section 6) audits `runWithRLS()` before Phase 1; verify against staging test suite first |
| Bounding pool `max` to 1 introduces queuing/latency if a single invocation legitimately needs concurrent queries                                   | Low        | Medium | Monitor p95 latency post-change; raise to 2 if needed, still well within serverless-safe range                    |
| Retry wrapper masks a genuine sustained outage by retrying into it                                                                                 | Low        | Medium | Hard cap at 2 attempts with short backoff; surface failure clearly after exhaustion rather than looping           |
| Connection string/env var change requires a deploy and brief rollover                                                                              | Low        | Low    | Deploy in a low-traffic window; Vercel performs rolling deploys                                                   |

---

## 9. Done Criteria

- [ ] ⏳ Zero new "Connection terminated" errors in Pino/Vercel logs over 24h of normal production traffic post-fix
- [ ] ⏳ Supabase connection-count graph stays comfortably under the project ceiling during peak hours
- [ ] ⏳ PostHog shows no (or near-zero) `db.connection_error` events post-deploy
- [ ] ⏳ `runWithRLS()` test suite passes against the pooled connection
- [ ] ⏳ DavDev sign-off on staging verification before production cutover
