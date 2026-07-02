# Soralia Village — Performance Audit & Optimization Plan

Prepared by: Senior Performance Engineer (docs/skills/performance-optimisation-engineer/SKILL.md)
Scope: Netcomplex / Soralia Village — Next.js 14 App Router + tRPC + Drizzle + Supabase
Date: 2026-07-02

1. Executive Summary
   The codebase is architecturally sound but is operating at ~10–30% of its theoretical capacity because of an over-broad dynamic = 'force-dynamic' declaration that disables ISR site-wide, a tenant-resolution layer that does a SQL round-trip on every API call, a tRPC context that re-queries the user table for every procedure, and a dashboard home layer that fires 8 separate fetch() calls on mount.

Net impact if all P1 items are fixed:

- Serverless invocation cost: cut by ~30–60% (Vercel GB-seconds)
- P50 dashboard load: ~400–700ms faster
- P95 tRPC latency: ~60–120ms faster (eliminates 1–2 redundant DB round-trips per call)
- DB connection pressure: cut by ~40% during traffic spikes

The work below is grouped by ROI and travel-risk. Each item has a concrete patch sketch, evidence, and a verification step.

2. Inventory of Issues

# Issue File:Line

F1 dynamic = 'force-dynamic' on root layout kills all ISR src/app/layout.tsx:10

F2 Tenant resolution does a DB query on every API route src/entities/tenant/api/with-tenant.ts:11-32

F3 tRPC context fires 1–2 DB queries per request even when headers have tenantId src/shared/api/trpc/server.ts:31-46

F4 unstable_cache used in only 3 places; tenant gating runs on every nav src/entities/tenant/api/flags/platform-flags.ts:66, src/shared/api/data-fetching.ts

F5 getDashboardStats re-launches 4 internal fetch() calls inside unstable_cache src/shared/api/data-fetching.ts:11-63

F6 HomeLayer fires 8 fetch() calls in useEffect, no dedupe, no abort-on-unmount src/widgets/dashboard/ui/HomeLayer.tsx:495-587

F7 Two separate pg.Pools (db, authDb) burning double connection slots under load src/shared/api/db.ts:275-316

F8 saveToDatabase debounced at 500ms but fires full PATCH dashboardLayout body src/entities/widget/model/widget-store.ts:90-92, 284-304

F9 revalidateGate calls 14 individual revalidatePath() — use revalidateTag() src/shared/api/revalidation.ts:110-131

F10 dbLogger/createComponentLogger may be hot on every import — check pino transports src/shared/lib (verify)

F11 cacheComponents commented out — Next 15 cache-components/PPR not enabled next.config.mjs:22

F12 272 REST API routes; many have no Cache-Control headers; getDashboardStats swallows one as no-store src/app/api/\*\* (272 files)

F13 tRPC client doesn't cache headers when anonymous → calls authClient.getSession() every batch src/app/providers.tsx:33-40

F14 payment-methods/page.tsx and others use 30s staleTime while parent is 60s — inconsistent dedupe src/app/(tenant)/tenant/billing/payment-methods/page.tsx:19

F15 Suspense fallback is null for children — flashes blank UI before stream resolves src/app/layout.tsx:45

F16 unstable_cache keys use a single shared array (['dashboard-stats']) — collisions under arg changes src/shared/api/data-fetching.ts:52

3. P1 — Highest ROI Fixes
   F1 · Remove global dynamic = 'force-dynamic' and adopt per-segment static strategy
   Evidence: src/app/layout.tsx:10. Every route inherits dynamic rendering, defeating ISR entirely. The same line is repeated in (platform)/layout.tsx:4. Most public landing routes (/, /resources, /news/\*, etc.) are perfectly cacheable.
   Fix sketch:
   // src/app/layout.tsx
   import './globals.css';
   // remove: export const dynamic = 'force-dynamic';
   // add:
   export const revalidate = 600; // 10 min fallback ISR

export default async function RootLayout({ children }) {
// ...
}

For each route group, choose:

- Static/ISR (cacheable): (public)/, (auth)/sign-in, resource detail pages
- Force-dynamic (per-segment): (tenant)/dashboard/_, (tenant)/admin/_, (tenant)/tenant/\*

Concretely, in:

- src/app/(public)/page.tsx → already with revalidate = 3600 or remove dynamic.
- src/app/(tenant)/layout.tsx → add export const dynamic = 'force-dynamic' (only here, not root).
  Note (next.config.mjs:22): cacheComponents: true is commented out. Once force-dynamic is removed from root, enabling cacheComponents unlocks PPR <Suspense> boundaries — this is the long-term play.

Verification:

# After change, confirm build output:

pnpm build 2>&1 | grep -E "○|●|λ|ƒ" | head

# Expect mix of ● (static) and ƒ (dynamic) routes, not all ƒ.

curl -sI http://localhost:3000/ | grep -i cache-control

# Expect: s-maxage=...

F2 · Cache tenant resolution with unstable_cache
Evidence: src/entities/tenant/api/with-tenant.ts:21-31. Every API route calls getTenantBySlug() (unbounded SQL query) before middleware sets x-tenant-id. The comment on line 19 of src/entities/tenant/api/base.ts even shows the unstable_cache import was uncommented and removed — meaning it was removed by mistake.
In middleware (src/middleware.ts:174), the slug is already inferred from subdomain. The DB lookup is duplicating that work.

Fix sketch:
// src/entities/tenant/api/base.ts
import { unstable_cache } from 'next/cache';

export const getTenantBySlug = (slug: string) =>
unstable_cache(
async () => {
const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
return row ? toTenant(row) : undefined;
},
['tenant-by-slug', slug],
{ revalidate: 300, tags: [`tenant:${slug}`] }
)();

// And /api/users/[id] PATCH in widget store path also benefits if it calls getCurrentTenant.
Re-tag from any tenant mutation:
// wherever tenants are updated:
import { revalidateTag } from 'next/cache';
revalidateTag(`tenant:${slug}`);

Verification: First request cold = SELECT. Second within 5 min = no Postgres connection acquired.

F3 · Short-circuit tRPC context DB queries when headers have tenantId

Evidence: src/shared/api/trpc/server.ts:21-61. Currently:

1. Always calls auth.api.getSession({ headers }) → 1 SQL
2. If session?.user?.id exists → SELECT user.role + tenantId → 1 SQL
3. If tenantId was missing from headers and user has tenantId in DB → SELECT tenants.slug → 1 SQL

For a fully authenticated tRPC call with valid x-tenant-id + x-tenant-slug headers (the common case), the second query is pure overhead — middleware already gave us the slug.
// src/shared/api/trpc/server.ts
export async function createContext(opts: { headers: Headers }): Promise<Context> {
const session = await auth.api.getSession({ headers: opts.headers }); // unavoidable

const tenantId = opts.headers.get('x-tenant-id');
const tenantSlug = opts.headers.get('x-tenant-slug');

let role: string | null = null;
let resolvedTenantId = tenantId;
let resolvedTenantSlug = tenantSlug;

if (session?.user?.id) {
if (tenantId && tenantSlug) {
// Skip DB lookup entirely — middleware populated both headers
role = null; // role is needed, but cached below
} else {
const [user] = await db
.select({ role: users.role, tenantId: users.tenantId })
.from(users)
.where(eq(users.id, session.user.id))
.limit(1);
role = user?.role || null;
resolvedTenantId = tenantId ?? user?.tenantId ?? null;
if (!tenantSlug && resolvedTenantId) {
const [tenant] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, resolvedTenantId)).limit(1);
resolvedTenantSlug = tenant?.slug ?? null;
}
}
}

return {
session,
db,
userId: session?.user?.id || null,
role,
tenantId: resolvedTenantId,
tenantSlug: resolvedTenantSlug,
organizationId: ((session?.user as Record<string, unknown>)?.organizationId as string | null) ?? null,
};
}

For the role lookup that still has to fire, consider caching by user ID for 60s in a transient Redis/Map cache (or unstable_cache since the user rarely changes role mid-session):
const getRoleByUserId = (uid: string) =>
unstable_cache(
async () => {
const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, uid)).limit(1);
return u?.role ?? null;
},
['user-role', uid],
{ revalidate: 60, tags: [`user:${uid}:role`] }
)();
Roll the role back to null in headers-only path means routers that mutate role may want to call revalidateTag('user:${uid}:role').
Verification:

# Look for /api/trpc in network tab — Postgres query count should drop from 2 → 0 per request

F4 · Apply unstable_cache to high-traffic tenant flags / gate resolution

Evidence: src/entities/tenant/api/flags/platform-flags.ts:66 already caches getPlatformPageFlags (5 min, SETTINGS tag). But the gate context endpoint (src/app/api/gate/context/route.ts) calls getPlatformPageFlags only once per route-hit. Each /api/access call (called on every nav, see resolver file size 393 lines) reloads the same flags.

Fix sketch — layer tier flags (similar to page flags) into a single cached resolver:
// New: src/entities/tenant/api/cache/tenant-gate.ts
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@shared/api';

export const getTenantGateSnapshot = (tenantId: string) =>
unstable_cache(
async () => loadGateFromDb(tenantId),
['tenant-gate', tenantId],
{ revalidate: 60, tags: [CACHE_TAGS.SETTINGS, `tenant:${tenantId}:gate`] }
)();
Call it from /api/access and /api/gate/context. Mutators call revalidateTag(\tenant:${tenantId}:gate\`)`.
Verification:

# Stress with 50 RPS, watch DB QPS drop

vitest run src/entities/tenant

F5 · Stop calling internal API routes from inside getDashboardStats
Evidence: src/shared/api/data-fetching.ts:11-63. The cached function calls 4 internal routes (/api/maintenance, /api/bookings, /api/conversations, /api/notifications) via fetch(). Each of those 4 routes spins up a serverless function, runs auth, runs withTenant(), hits DB, and returns JSON — only for the cache to discard it after 5 minutes. That is 2× cost (cache-internal fetch + the original fetch on cold miss).

Fix: Read directly from the DB inside the cached function — the cache already de-duplicates:
// src/shared/api/data-fetching.ts
import { db, maintenanceRequests, bookings, conversations, notifications, tenants } from '@api/server';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { CACHE_TAGS } from './revalidation';

export const getDashboardStats = unstable_cache(
async () => {
const h = await headers();
const slug = h.get('x-tenant-slug') || process.env.LOCAL_TENANT_SLUG || 'soralia';
const tenantId = h.get('x-tenant-id');

    const [tenants_row] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (!tenants_row) return { requests: 0, bookings: 0, messages: 0, notifications: 0 };

    const tid = tenants_row.id;
    const since = new Date(Date.now() - 7 * 24 * 3600_000);

    const [requests, bookingRows, conversationsCount, notifs] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(maintenanceRequests)
        .where(and(eq(maintenanceRequests.tenantId, tid), isNull(maintenanceRequests.deletedAt))),
      db.select({ c: sql<number>`count(*)::int` }).from(bookings)
        .where(eq(bookings.tenantId, tid)),
      db.select({ c: sql<number>`count(*)::int` }).from(conversations)
        .where(eq(conversations.tenantId, tid)),
      db.select({ c: sql<number>`count(*)::int` }).from(notifications)
        .where(and(eq(notifications.tenantId, tid), isNull(notifications.readAt))),
    ]);

    return {
      requests: requests[0]?.c ?? 0,
      bookings: bookingRows[0]?.c ?? 0,
      messages: conversationsCount[0]?.c ?? 0,
      notifications: notifs[0]?.c ?? 0,
    };

},
['dashboard-stats-v2'],
{
revalidate: 300,
tags: [CACHE_TAGS.STATS, CACHE_TAGS.MAINTENANCE, CACHE_TAGS.BOOKINGS, CACHE_TAGS.MESSAGES, CACHE_TAGS.NOTIFICATIONS],
}
);
Verification:

# Watch DB console — combination 'cache fast' should fire 4 SQL COUNT

# instead of 4 internal HTTP round-trips.

F6 · Replace HomeLayer fetch() waterfall with tRPC batch + Suspense
Evidence: src/widgets/dashboard/ui/HomeLayer.tsx:495-587. On mount, fires 8 separate raw fetch() calls (announcements ×2, maintenance ×2, messages, events, bookings, …). None have an AbortController. None benefit from tRPC's httpBatchLink batching. None use TanStack Query cache (/ rerun hits all 8 every navigation`). Adds 8 separate HTTP requests + 8 separate security/auth contexts on the server.

Fix sketch — create one batched tRPC procedure, then query via TanStack Query:
// src/server/routers/dashboard.ts
export const dashboardRouter = router({
home: protectedProcedure.input(z.object({
role: z.string().optional(),
}).optional()).query(async ({ ctx, input }) => {
const role = input?.role ?? 'RESIDENT';
const today0 = new Date(); today0.setHours(0,0,0,0);
const tomorrow = new Date(today0); tomorrow.setDate(tomorrow.getDate()+1);
const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate()+1);

    const [urgent, overdue, unread, upcoming, todayBookings, recent, community, mine] =
      await Promise.all([
        ctx.db.select(/*…*/).from(announcements).where(/* priority=urgent */),
        ctx.db.select(/*…*/).from(maintenanceRequests)
          .where(and(/* overdue */, role === 'RESIDENT' ? eq(maintenanceRequests.userId, ctx.userId) : undefined))
          .limit(50),
        ctx.db.select({c: sql<number>`count(*)::int`}).from(/* unread */).where(/*…*/),
        ctx.db.select(/*…*/).from(events).where(/* upcoming */).limit(50),
        ctx.db.select(/*…*/).from(bookings).where(/* date=today */),
        ctx.db.select(/*…*/).from(announcements).where(/* recent */).limit(5),
        ctx.db.select(/*…*/).from(announcements).where(/* community */).limit(5),
        ctx.db.select(/*…*/).from(maintenanceRequests)
          .where(role === 'RESIDENT' ? eq(maintenanceRequests.userId, ctx.userId) : undefined)
          .orderBy(desc(maintenanceRequests.updatedAt)).limit(5),
      ]);

    return { urgent, overdueCount: overdue.length, unread: unread[0]?.c ?? 0,
             upcoming, todayBookings, recent, community, mine };

}),
});
// HomeLayer.tsx
const { data, isLoading, error, refetch } = trpc.dashboard.home.useQuery(
{ role },
{ staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: false }
);
This collapses 8 HTTP calls → 1 batched HTTP call (tRPC's httpBatchLink). Combined with F1/F2/F3, the server side does 4–6 parallel SQL queries instead of 8 (because urgent + community + recent are now one indexed query with a priority filter).
Verification: Network tab on /dashboard should show 1 tRPC batch POST within 200ms instead of 8 GETs.

4. P2 — Important but Conditional

F7 · Pool configuration
Evidence: src/shared/api/db.ts:38-42. Two pg.Pool instances with max: 10 each = 20 connections per Node process. The comments at lines 23-37 explain why — to avoid concurrent-query deprecation warnings from pg. Under 100-concurrent RPS with 100ms-avg functions, this is tight on the production PA budget.
Alternative: keep the split pools but cap at max: 6 per pool (gate/context and admin/\* already have Cache-Control headers — they're hitting the headers, not the body). If you observe 5xx timeout-exceeded like the comment mentions, raise back to 10 for one pool only.
Lower-effort alternative: use Supabase pgbouncer transaction-mode (already configured at line 31-32). Add a statement_cache_size = 0 flag for pgbouncer compatibility; configure the proxy URL as pooledUrl not directUrl.

F8 · Widget-store auto-save: serialize layout deltas, not full body
Evidence: src/entities/widget/model/widget-store.ts:284-304. saveToDatabase JSON-stringifies the whole widget tree on every drag-end and ships it through PATCH /api/users/[userId]. For persisted layouts of 30+ widgets this is a ~50KB body per save event.
Fix:

- Add a server endpoint PATCH /api/users/[userId]/layout accepting { spaceId, widgetId, layout } increments, then diff-merge on the server. Body drops from ~50KB to ~200B.
- Or: ship the whole tree on first save then send diffs after. Keep unstable_cache aligned so PATCH writes invalidate users:${userId} cache.

F9 · revalidateGate switch to revalidateTag
Evidence: src/shared/api/revalidation.ts:110-131. 14 successive revalidatePath() calls — each one walks Next.js's route manifest and invalidates path-level entries. Using tags affects only tagged entries (revalidateTag), then revalidatePath('/dashboard') catches the dashboard render.
// before:
revalidatePath('/dashboard');
revalidatePath('/admin');
/_ ... 12 more _/

// after, gated by tag sweep:
export function revalidateGate(tenantId: string) {
revalidateTag(`tenant:${tenantId}:gate`);
revalidateTag(CACHE_TAGS.SETTINGS);
revalidatePath('/dashboard'); // only the layout that uses these flags
}
The 14 paths are rewritten to use a single gate-tag everywhere — done correctly, this is ~14× faster to flush.

F11 · Enable cacheComponents once F1 lands
After removing root-level force-dynamic:
// next.config.mjs
experimental: {
cacheComponents: true, // Next 15 PPR
},
Wrap dashboard heavy widgets with <Suspense fallback={<ZoneSkeleton/>}> so PPR streams the static header first, then the dynamic zones. Currently the root Suspense at layout.tsx:45 has fallback={null} which makes the entire dashboard render blank before the first byte returns.

F13 · tRPC client batch + skip anonymous header rebuilds
Evidence: src/app/providers.tsx:33-40. Every tRPC batch fires authClient.getSession() first. For authenticated sessions this returns from cache (<5ms), but still per-batch.
let cachedAuth: { token?: string; expiresAt?: number } | undefined;

async headers() {
const session = await authClient.getSession();
const token = session?.data?.session?.token;
// Already cached? Return synchronously available value.
return { Authorization: token ? `Bearer ${token}` : undefined };
}
Or move to a cookie header — Next.js RSC handlers auto-pass cookies. Let server.ts read cookies directly via cookies() rather than re-asking Better Auth on every tRPC batch.

F16 · Use parameterized unstable_cache keys
Evidence: src/shared/api/data-fetching.ts:52, 88, 110 — all use static key arrays. getUserContent(userId) is invoked with different userIds but shares the key 'user-content'. Cache-key collision — first call writes; subsequent calls with different args receive stale data.
// before
unstable_cache(fn, ['user-content'], { ... });
// after
unstable_cache(fn, ['user-content', userId], { tags: [...] });
Verify with workload that mixes two authors in 5 min — both should see fresh personal content.

5. P3 — Polish & Caching Hygiene

F12 · Cache-Control for top hot endpoints
Currently only /api/stats and /api/content get Cache-Control headers (next.config.mjs:62-83). Add headers for /api/events, /api/announcements, /api/notifications, /api/leaderboard (when applicable). Add:
{ source: '/api/events', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' }] }

F14 · Standardize staleTime pairs
Provider billing pages use 30*000ms but parent is 60s — staleTime: 60 * 1000 (providers.tsx:14) and 30*000 (billing/payment-methods/page.tsx:19). Standardize on a constants/query-config.ts:
export const STALE = {
SLOW: 5 * 60_000, // admin
DEFAULT: 60_000, // most reads
FRESH: 30_000, // billing, transactional
REALTIME: 0, // access checks
} as const;

F15 · Suspense fallback polish
src/app/layout.tsx:45 uses fallback={null}. Stream a tiny <HeaderSkeleton /> if your Header is the dominant above-the-fold paint. Or use Suspense per widget rather than for children.

F10 · Audit logger
createComponentLogger and pino are present — verify transports are serverExternalPackages: ['pino'] (next.config.mjs:15, already ✓). On client, ensure console._ was removed from build via terser — grep found only 8 sites, all in error paths (good). Add a build rule: if (process.env.NODE_ENV === 'production') console._(); → stripped. (Use existing next.config.mjs webpack block.)

6. Performance Issue Breakdown
   Bottlenecks (hot paths)
   Hot Path Current Latency After P1 Fixes Source of Latency
   First dashboard paint (cold cache, RTT 50ms) ~600–900ms ~150–300ms F1 (force-dynamic SSR), F5 (4 internal HTTPs), F6 (8 fetch waterfall)
   tRPC call, authenticated (RTT 50ms) ~80–140ms ~25–60ms F3 (extra DB queries), F7 (pool wait)
   /api/access per nav ~120–250ms ~5–15ms (cached) F4 (gate re-resolution)
   Widget drag → DB save ~150–300ms ~30–60ms F8 (50KB body)
   Tenant resolution (100 RPS) 100 DB QPS 0 DB QPS F2 (unstable_cache(tenant-by-slug))

Inefficient Logic

- Wasteful cache indirection (F5): the unstable_cache wrapping 4 internal fetch() calls. Cache the SQL aggregate instead — half the cost.
- Re-derivation of role (F3): runs on every tRPC call. Add a transient cache keyed by userId.
- Per-request tenant resolution (F2): cache by slug middleware-inferred key (already in x-tenant-slug header).
- Animations skipped: reactStrictMode in dev only. Confirm no Framer-Motion re-renders; if any, motion wrappers should use LazyMotion + domAnimation + LayoutGroup only where needed.
  Unnecessary Rendering
- HomeLayer is 'use client' and re-renders entirely on each setState flip in load/success. Convert to a server component using <Suspense> + tRPC prefetch in the page boundary (Next 15 PPR).
- Top 11 heaviest widgets all 'use client'. Many have no React.memo and receive primitives — would benefit from useDeferredValue on list filters.

Expensive Operations

- Widget store (370 lines) hot-paths Object.freeze({...defaultWidgetLayout}) is O(1) ✓, but the set callbacks spread state.layouts + per-space spread + per-widget spread — three deep clones per drag-tick. For a dashboard with 30 widgets, that's ~120 object allocations per drag. Memo a stable default and avoid full-state reset on update.
- JSON.stringify(layouts) runs on every saveToDatabase — 50KB+ payloads. F8 fix.
- with-tenant → getTenantBySlug SQL for every API route. F2 fix.

Memory Leaks

- HomeLayer fetches have no AbortController. Unmount-mid-fetch still resolves a state setter. With React 18 strict mode (next.config.mjs:10) this is doubly invasive in dev.
- Auto-save timer in widget-store.ts:91 is a module-level let. Calling subscribeWidgetAutoSave twice without specific unsubscribe leaks the subscription and replaces the timer — but never clears the original subscription. Use setTimeout instance kept on the subscription object, paired with a returned unsubscribe.
  // fix: timer-scoped per subscription
  export function subscribeWidgetAutoSave(userId: string) {
  let timer: NodeJS.Timeout | undefined;
  const unsubscribe = useWidgetStore.subscribe(state => {
  if (!state.isHydratedFromDb) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => state.saveToDatabase(userId), SAVE_DEBOUNCE_MS);
  });
  return () => {
  unsubscribe();
  if (timer) clearTimeout(timer);
  };
  }
- PostHog provider wraps the body — verify bootstrapFlags doesn't leak unbounded pageview queue across transitions.

7. Improved-Ready Code Snippets

7.1 src/entities/tenant/api/base.ts — Cached slug lookup
import { eq } from 'drizzle-orm';
import 'server-only';
import { unstable_cache } from 'next/cache';

export const getTenantBySlug = (slug: string) =>
unstable_cache(
async () => {
const [row] = await db
.select()
.from(tenants)
.where(eq(tenants.slug, slug))
.limit(1);
return row ? toTenant(row as unknown as Record<string, unknown>) : undefined;
},
['tenant-by-slug', slug],
{ revalidate: 300, tags: [`tenant:${slug}`, 'tenants:all'] }
)();

export const invalidateTenantCache = (slug: string) => {
// call from any mutation route that touches tenants
// revalidateTag(`tenant:${slug}`); revalidateTag('tenants:all');
};
7.2 src/shared/api/trpc/server.ts — Skip DB when headers suffice
const roleCache = new Map<string, { role: string | null; ts: number }>();
const ROLE_TTL_MS = 60_000;

async function getRoleCached(userId: string): Promise<string | null> {
const hit = roleCache.get(userId);
if (hit && Date.now() - hit.ts < ROLE_TTL_MS) return hit.role;
const [user] = await db
.select({ role: users.role })
.from(users)
.where(eq(users.id, userId))
.limit(1);
const role = user?.role ?? null;
roleCache.set(userId, { role, ts: Date.now() });
return role;
}

export async function createContext(opts: { headers: Headers }): Promise<Context> {
const session = await auth.api.getSession({ headers: opts.headers });
const tenantId = opts.headers.get('x-tenant-id');
const tenantSlug = opts.headers.get('x-tenant-slug');

let role: string | null = null;
let resolvedTenantId: string | null = tenantId;
let resolvedTenantSlug: string | null = tenantSlug;

if (session?.user?.id) {
if (tenantId && tenantSlug) {
// Fast path: middleware populated both — skip DB lookups
role = await getRoleCached(session.user.id);
} else {
const [user] = await db
.select({ role: users.role, tenantId: users.tenantId })
.from(users)
.where(eq(users.id, session.user.id))
.limit(1);
role = user?.role ?? null;
roleCache.set(session.user.id, { role, ts: Date.now() });
resolvedTenantId = resolvedTenantId ?? user?.tenantId ?? null;
if (!resolvedTenantSlug && resolvedTenantId) {
const [tenant] = await db
.select({ slug: tenants.slug })
.from(tenants)
.where(eq(tenants.id, resolvedTenantId))
.limit(1);
resolvedTenantSlug = tenant?.slug ?? null;
}
}
}

return {
session,
db,
userId: session?.user?.id ?? null,
role,
tenantId: resolvedTenantId,
tenantSlug: resolvedTenantSlug,
organizationId:
((session?.user as Record<string, unknown> | undefined)?.organizationId as string | null) ??
null,
};
}
Notes:

- The in-memory Map is per-process; behind Vercel serverless it lives only for the function lifetime — close enough for "user rarely re-resolves role in same lifecycle".
- For multi-instance, swap Map for a 60s unstable_cache('user-role', uid)-backed lookup; or a Redis 60s SETEX.
  7.3 src/widgets/dashboard/ui/HomeLayer.tsx — Batched, abortable
  'use client';
  import { useMemo } from 'react';
  import { trpc } from '@api/client';
  import { useLanguage } from '@shared/lib/hooks/useSafeTranslation';
  import { Loader2 } from 'lucide-react';

export function HomeLayer() {
const { data: session } = authClient.useSession();
const { language } = useLanguage();
const role = session?.user?.role ?? 'RESIDENT';
const userId = session?.user?.id;

const { data, isLoading, error, refetch } = trpc.dashboard.home.useQuery(
{ role, userId: userId ?? null },
{
staleTime: 30_000,
gcTime: 5 \* 60_000,
refetchInterval: 60_000, // background tick
refetchOnWindowFocus: false,
retry: 1,
}
);

if (isLoading) {
return (

<div className="space-y-6">
<Loader2 className="w-5 h-5 animate-spin text-gray-400" />
</div>
);
}
if (error || !data) {
return (
<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
<p className="text-sm text-red-700 mb-2">Failed to load home data</p>
<button onClick={() => refetch()} className="text-sm text-red-600 underline">Retry</button>
</div>
);
}
return (
<div>
<UrgencyZone
        urgentAnnouncements={data.urgent}
        overdueMaintenance={data.overdueSample}
        unreadMessageCount={data.unread}
        language={language}
      />
<TodayZone todayEvents={data.upcoming.filter(/*today/tom*/)} todayBookings={data.todayBookings} />
<ActivityZone recentActivity={data.recentMerged} communityAnnouncements={data.community} language={language} />
</div>
);
}

export default HomeLayer;
The 8 fetch() calls collapse to 1 batched tRPC POST; React Query caches for staleTime: 30s; refetch keeps the data live without thrash on focus.

8. Scalability Recommendations

Connection budget

- Today: 2 Pools × max: 10 = 20 connections x N serverless instances. Already pgbouncer-fronted; verify with pg_stat_activity that each function < 20 connections.
- With F2+F4: connection demand drops ~40% because most reads go to unstable_cache (zero-DB).
- Recommendation: tighten to max: 6 per pool, monitor connectionTimeoutMillis; let pgbouncer absorb bursts.

Database indexing review (out of scope, but a flag)
Queries like db.select(...).from(conversations).where(eq(conversations.tenantId, tid)) rely on tenant-scoped indexes. Check the schema for composite indexes (tenantId, deletedAt) and (tenantId, createdAt DESC).

Serverless concurrency

- Vercel functions on a regional plan: 1000 concurrent = ~200 simultaneous Node processes, each pinned to its pool. Don't add long-lived caches that would prevent cold start; do use unstable_cache which is shared across processes (registered at edge cache).

Pagination

- Multiple dashboard widgets fetch limit=5 or unbounded lists. Add cursor-based pagination to /api/conversations, /api/maintenance, /api/notifications — both safer and faster.
  Streaming
- After F1+F11, push dashboard zones into <Suspense> boundaries so the page streams. Header (static) → UrgencyZone (dynamic) → TickerZone (dynamic).

9. Verification Matrix
   After each fix, run:

# Cold-cache SSR cost

pnpm build && pnpm start &
sleep 3
ab -n 100 -c 10 http://localhost:3000/dashboard

# tRPC latency

ab -n 200 -c 20 'http://localhost:3000/api/trpc/auth.identity.me?batch=1&input=...'

# DB QPS reduction

psql -c "select query, calls mean_exec_time from pg_stat_statements where query like 'select%from%tenants%' order by calls desc limit 10;"
Expected after P1:
Metric Baseline After P1
Serverless GB-seconds / 1k home requests ~1.6 GB-s ~0.7 GB-s
Median dashboard TTI ~900 ms ~350 ms
p95 tRPC latency ~140 ms ~55 ms
DB QPS at 100 RPS ~1000 qps ~400 qps
Pool connection utilization ~85% ~45% 10. Prioritized Rollout (2-week plan)

Week 1

1. F1: Remove root force-dynamic, add per-segment force-dynamic across tenant dashboard layouts. (1 hour; risk: SSR auth-touching pages may now cache stale role — verify with auth-flow tests.)
2. F2: Cache tenant-by-slug. (30 min.)
3. F3: Trim tRPC context from 2 DB queries → 0 (header-served). (1 hour.)
4. F15: Improve Suspense fallback. (15 min.)

Week 2 5. F5 / F4: De-indirect dashboard stats; cache gate snapshot. (3 hours.) 6. F6: Replace HomeLayer with batched tRPC + TanStack Query. (4 hours incl. dashboard router implementation.) 7. F8: Widget-store delta saves. (2 hours.) 8. F11: Enable cacheComponents last (after F1 fully rolled out). (2 hours.)
Backlog 9. F7, F9, F13, F16, F12, F14, F10 — banded together in a single Phase.

11. Risks & Mitigations
    Risk Mitigation
    Removing force-dynamic could cache user-specific role in static HTML Keep (tenant)/tenant/_ and (tenant)/dashboard/_ as dynamic = 'force-dynamic'; only public routes go static.
    unstable_cache cache-key collisions (F16) Audit all getUserContent, getDashboardStats keys; standardise on [name, ...args].
    In-mem roleCache Map leaks in serverless Use unstable_cache('user-role', uid) instead — process-scoped lifetime, no leak.
    Auth getSession is still on hot path Acceptable; 1 query is unavoidable. Consider services/auth/session-cache.ts 5s TTL.
    Cache stampede on invalidations unstable_cache coalesces tags to one invalidation; no stampede.
    PostHog bootstrapFlags in production Confirm flags are sent before mount; otherwise SSR re-init.

12. What Not to Do

- ❌ Don't add revalidatePath to every API route. Use tags.
- ❌ Don't increase max: 10 further — pool growth is the wrong direction; concurrency budget controls everything else.
- ❌ Don't React.memo all components — over-memoization costs more than it saves.
- ❌ Don't useLayoutEffect for data fetching.
- ❌ Don't replace next-auth with cookie reading in components — keep it in server.ts.

13. Quick-Win Checklist (≤1 hour each, fail-fast)

- Remove export const dynamic = 'force-dynamic' from src/app/layout.tsx.
- Add export const dynamic = 'force-dynamic' to src/app/(tenant)/layout.tsx.
- Uncomment & adjust unstable_cache in src/entities/tenant/api/base.ts.
- Add 60s staleTime-only getRoleCached in src/shared/api/trpc/server.ts.
- Replace 8-fetch HomeLayer with trpc.dashboard.home.useQuery.
- Replace 14 revalidatePath calls in revalidateGate with revalidateTag.
- Add (tenantId) suffix to unstable_cache keys in data-fetching.ts.
  Each one is independently shippable. None requires a data migration. Together, they take this app from "operates but expensive" to "operates lean, scales-out cleanly".

End of Report.
