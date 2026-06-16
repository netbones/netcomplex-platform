# ADVISORY-011: Confirmed Root Cause — DATABASE_URL / DIRECT_URL Precedence Bug in `db.ts`

**Status:** P0 — Production incident, root cause identified from source
**Supersedes:** Hypothesis H1 in ADVISORY-010 (now confirmed at the code level, pending one env-var check)
**Files reviewed:** `src/shared/api/db.ts`, `src/shared/api/auth.ts`

---

## 1. Problem Statement

ADVISORY-010 raised connection-pool exhaustion as the leading hypothesis for the Better Auth session-lookup timeouts. With the actual `db.ts` source available, the mechanism is now visible directly in code rather than inferred.

---

## 2. Root Cause (Confirmed in Code)

`getDb()` in `db.ts`:

```ts
const envUrl = ENV.DIRECT_URL || ENV.DATABASE_URL;
```

This prefers `DIRECT_URL` over `DATABASE_URL`. Under the standard Supabase/Prisma convention:

- `DATABASE_URL` — the pooled connection (Supavisor/pgbouncer), intended for application runtime traffic.
- `DIRECT_URL` — the unpooled direct connection, intended only for migration tooling.

`prisma/schema.prisma`'s datasource block only references `env("DATABASE_URL")` — it has no `directUrl` field — meaning `DIRECT_URL` is not consumed by Prisma at all in this project. The only consumer of `DIRECT_URL` is this fallback chain in `db.ts`. If `DIRECT_URL` is set in the Vercel environment (very likely, since it's the default variable Supabase's setup screens provision alongside `DATABASE_URL`), the application's entire runtime connection pool — including every Better Auth session lookup — is silently using the **direct, unpooled** endpoint instead of the pooled one.

The pool-sizing comment directly above `POOL_CONFIG` explicitly assumes pooling is active:

> "10 is safe for Supabase's pgbouncer transaction-mode pooler (each Node.js process is independent; the pooler multiplexes across processes)"

That assumption is what's silently violated. Each warm Vercel function instance opens up to `max: 10` connections; against a direct endpoint, each of those is a real 1:1 Postgres backend connection, not a multiplexed one. Across enough concurrent serverless instances, this exceeds Supabase's actual `max_connections` ceiling — producing exactly the nested error seen: outer "Connection terminated due to connection timeout" (client-side pool/connect timeout firing) wrapping inner "Connection terminated unexpectedly" (the physical socket being reset, consistent with either the server-side connection ceiling rejecting/dropping the connection, or Supabase's direct-connection idle/lifetime limits reaping it).

This differs from the previously-resolved BD issue `03kz` (Phase 48), whose symptom was the literal string "timeout exceeded when trying to connect" — a client-side pool-checkout serialization issue caused by `max: 1`. That fix (raising to `max: 10`) was correct for that specific symptom, but it was layered on top of this pre-existing precedence bug, which only manifests as a hard ceiling problem once concurrent traffic grows enough to multiply `10 × (concurrent warm instances)` past Supabase's real connection limit — consistent with this surfacing now rather than immediately after the `03kz` fix.

**Confidence:** High, but not yet 100% — see Section 5, item 1. The one remaining unknown is the actual value of `DATABASE_URL` in production. If it is also a direct (unpooled) string rather than the Supavisor/pgbouncer pooled one, swapping precedence alone will not resolve the incident; the pooled connection string would need to be fetched from the Supabase dashboard first.

---

## 3. Other Findings From Code Review

| Finding                                            | Severity                                                | Notes                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Single pool source confirmed                       | — (resolves a discovery item from ADVISORY-010)         | `auth.ts` passes the shared `db` singleton into `drizzleAdapter()` — Better Auth does not open its own connection. No duplicate-pool risk.                                                                                                                                                                               |
| `runWithRLS()` is transaction-pooling-safe         | — (resolves a risk item from ADVISORY-010)              | All RLS context (`SET LOCAL ROLE`, `set_config(..., true)`) is scoped to a single transaction. This is exactly the correct pattern for Supavisor/pgbouncer transaction mode — no architecture change needed here.                                                                                                        |
| `sslmode=require` rewritten to `sslmode=no-verify` | Medium (security hardening, not blocking this incident) | Disables TLS certificate verification entirely. `prod-ca-2021.crt` exists unused at the repo root — almost certainly Supabase's CA bundle. Recommend switching to `ssl: { ca: fs.readFileSync('prod-ca-2021.crt'), rejectUnauthorized: true }` as a follow-up, tracked separately from this incident.                    |
| `ETIMEDOUT` "Failed to proxy" log                  | Low priority, likely unrelated                          | Appears in local `next dev` compile output, not the timestamped production log. Query shape (`ip=0&_=<ts>&ver=...&compression=gzip-js`) resembles a client-side analytics/feature-flag SDK beacon, not a Postgres call. Recommend confirming separately whether this also appears in production before opening a ticket. |

---

## 4. The Fix

```ts
// src/shared/api/db.ts — getDb()

// BEFORE (bug — DIRECT_URL wins if both are set, silently bypassing the pooler):
const envUrl = ENV.DIRECT_URL || ENV.DATABASE_URL;

// AFTER (fix — pooled connection is preferred; DIRECT_URL is a last-resort fallback only):
const envUrl = ENV.DATABASE_URL || ENV.DIRECT_URL;
```

Recommended hardening alongside the precedence fix — log loudly if the fallback path is ever taken, so this can't silently regress:

```ts
function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const pooledUrl = ENV.DATABASE_URL;
  const directUrl = ENV.DIRECT_URL;

  if (!pooledUrl && !directUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL is not set');
  }

  if (!pooledUrl) {
    dbLogger.warn(
      'DATABASE_URL is not set — falling back to DIRECT_URL (unpooled). ' +
        'This bypasses Supavisor/pgbouncer and will exhaust the connection ' +
        'ceiling under serverless concurrency. Set DATABASE_URL to the pooled connection string.'
    );
  }

  const envUrl = pooledUrl || directUrl!;
  const connectionString = envUrl.replace('sslmode=require', 'sslmode=no-verify');
  const pool = new Pool({ connectionString, ...POOL_CONFIG });

  dbInstance = drizzle(pool, { schema: dbSchema });

  return dbInstance;
}
```

(`dbLogger` — use the existing Pino logger pattern from `src/shared/api/observability.ts`, scoped appropriately.)

---

## 5. Pre-Execution Checklist (Mandatory)

1. **Confirm what `DATABASE_URL` and `DIRECT_URL` actually point to in Vercel Production env vars** before deploying the swap:

   ```bash
   echo "DATABASE_URL: $(echo "$DATABASE_URL" | sed -E 's#(:)[^:@]+(@)#\1****\2#')"
   echo "DIRECT_URL:   $(echo "$DIRECT_URL" | sed -E 's#(:)[^:@]+(@)#\1****\2#')"
   ```

   Expected good state: `DATABASE_URL` shows a pooler host (typically containing `pooler.supabase.com`, port `6543` for transaction mode) and `DIRECT_URL` shows the direct host (`db.<project>.supabase.co`, port `5432`).

   **If `DATABASE_URL` is ALSO a direct connection string** — the precedence swap alone will not fix the incident. Obtain the Supavisor transaction-mode pooled connection string from Supabase Dashboard → Database → Connection Pooling, and set it as `DATABASE_URL` before proceeding.

2. Confirm Supavisor's configured "Pool Size" / max client connections in the Supabase dashboard comfortably covers `10 × (max concurrent warm Vercel instances)`. Adjust upward in the dashboard if needed rather than lowering the app's `max: 10`.

3. **STOP AND ESCALATE to DavDev** if step 1 shows both env vars pointing at the same direct host, or if no pooler is provisioned at all on the Supabase project — that requires a dashboard-side setup step before any code change will help.

---

## 6. Phased Execution Plan

### Phase 1 — Precedence Fix (the actual incident fix)

1. Apply the diff in Section 4 to `src/shared/api/db.ts`.
2. Deploy to staging first; verify a session-dependent route (e.g., `/api/dashboard/stats`) succeeds repeatedly under light concurrent load.
3. Promote to production during a lower-traffic window.
4. Watch the Supabase connection-count graph for the following hour; confirm it stays well under the project ceiling instead of spiking.

### Phase 2 — Retry/Backoff Wrapper (carried over from ADVISORY-010, still recommended)

1. Wrap the hot-path session/db call with a bounded retry (2 attempts, short exponential backoff) for transient connection-layer errors only (`ECONNRESET`, "Connection terminated unexpectedly", "Connection terminated due to connection timeout"). This absorbs the residual transient blips that occur even on a correctly pooled connection.

### Phase 3 — Observability (carried over from ADVISORY-010, still recommended)

1. Emit a Pino log + PostHog event on any connection-layer error or retry, scrubbed per the existing `beforeSend` POPIA rule.

### Phase 4 — Follow-up, non-blocking

1. Replace the `sslmode=no-verify` rewrite with proper CA verification using `prod-ca-2021.crt`. File as its own BD issue rather than bundling into this incident.

---

## 7. Risk Register

| Risk                                                                                                           | Likelihood | Impact | Mitigation                                                                                                                |
| -------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` is also a direct (unpooled) string, so the swap alone doesn't fix the incident                  | Medium     | High   | Mandatory Section 5 check before deploying; escalate if confirmed                                                         |
| Supavisor pool size in the Supabase dashboard is too small for `10 × concurrent instances` even after the swap | Low–Medium | Medium | Section 5 item 2 — verify and raise dashboard pool size if needed                                                         |
| RLS breakage under transaction-mode pooling                                                                    | Resolved   | —      | Confirmed safe from code review — `runWithRLS()` uses transaction-scoped `SET LOCAL` / `set_config(..., true)` throughout |
| Retry wrapper (Phase 2) masks a genuine sustained outage                                                       | Low        | Medium | Hard cap at 2 attempts, short backoff, surface failure after exhaustion                                                   |

---

## 8. Done Criteria

- [ ] `DATABASE_URL` confirmed to be the Supavisor/pgbouncer pooled connection string in production
- [ ] Precedence fix deployed; zero new "Connection terminated" errors over 24h of normal production traffic
- [ ] Supabase connection-count graph stays comfortably under the project ceiling during peak hours
- [ ] Retry/backoff and observability (Phases 2–3) landed
- [ ] Separate BD issue filed for the `sslmode=no-verify` → proper CA verification follow-up
- [ ] DavDev sign-off on staging verification before/after production cutover
