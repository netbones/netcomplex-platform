---
title: ADVISORY-016: Multi-Tenant Domain Routing — Platform vs Tenant Plane Separation
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-016: Multi-Tenant Domain Routing — Platform vs Tenant Plane Separation

**Date:** 2026-06-26
**Status:** Approved — Pending Execution
**Severity:** High — Production routing failure
**Affects:** `src/middleware.ts`, Vercel project configuration
**Authored by:** Claude (Architectural Advisor)

---

## 1. Problem Statement

Both `app.netbones.co.za` (platform control plane) and `soralia.netbones.co.za` (Soralia tenant plane) are currently rendering the Soralia tenant site. The platform control plane (`app.*`) must instead render the `(platform)` route group — the NetComplex SaaS management interface.

---

## 2. Root Cause Analysis

Three compounding issues are present. They must all be resolved; fixing only one will not correct production behaviour.

### RC-1: API and Auth Route Blocks Execute Before the Platform Check (Critical Bug)

In the current middleware, the API route guard and the auth route guard both **return early** before the `isPlatform` check is reached, and both unconditionally set `x-plane: tenant`:

```typescript
// ❌ Current — runs BEFORE isPlatform check
if (isApiRoute) {
  response.headers.set('x-plane', 'tenant'); // wrong for app.netbones.co.za
  response.headers.set('x-tenant-slug', inferredTenantSlug); // "app" slug — no tenant match
  return response;
}

if (isAuthRouteCheck) {
  response.headers.set('x-plane', 'tenant'); // wrong for app.netbones.co.za
  response.headers.set('x-tenant-slug', inferredTenantSlug);
  return response;
}
```

Any API call made from the platform domain (e.g., during platform login or tenant management) will be tagged as a tenant request with slug `"app"` — which matches no tenant, causing downstream failures in `withTenant()` guards.

### RC-2: `inferredTenantSlug` Silently Resolves `app` as a Slug

```typescript
const subdomain = hostWithoutPort.split('.')[0] || '';
// For app.netbones.co.za → subdomain = "app"
const inferredTenantSlug = subdomain || DEFAULT_TENANT_SLUG;
// → inferredTenantSlug = "app"
```

When a server component or API route calls `withTenant()` using the `x-tenant-slug: app` header and no tenant with slug `"app"` exists, behaviour depends on the `withTenant()` implementation — it may throw, return null, or silently fall back to the first tenant found. **This is the likely cause of the tenant site rendering on the platform domain**: a fallback to Soralia data.

### RC-3: No `vercel.json` Present

Without a `vercel.json`, Vercel uses heuristic framework detection. While this generally works for Next.js, the absence of explicit configuration means Vercel cannot confirm that both `app.netbones.co.za` and `soralia.netbones.co.za` are intentionally served by the same deployment. Additionally, there is no explicit region pin, which may affect cold-start behaviour.

---

## 3. Options Considered

### Option A: Fix middleware plane detection order only

Move the `isPlatform` check before the API/auth early-return blocks. Correct, but incomplete — does not address the `inferredTenantSlug = "app"` slip-through or add the `vercel.json` safety net.

### Option B: Add platform domain to a blocklist so `withTenant()` short-circuits

Guard `withTenant()` to reject the slug `"app"` explicitly. Fragile — couples business logic to an infrastructure detail. Rejected.

### Option C: Fix all three root causes (Recommended)

Reorder middleware so `isPlatform` is evaluated first for all request types. Guard API and auth early-returns to be plane-aware. Add `vercel.json`. This is the correct, clean resolution.

---

## 4. Architecture: Before / After

### Before

```
Request → static asset check → API early-return (x-plane: tenant) → auth early-return → isPlatform check
                                      ↑
                              Platform API calls never reach here
```

### After

```
Request → static asset check → resolve isPlatform → branch:
  Platform: set x-plane: platform, handle API/auth with no tenant headers
  Tenant:   set x-plane: tenant, x-tenant-slug: <subdomain>, handle API/auth normally
```

---

## 5. Pre-Execution Discovery Checklist

The agent MUST run these before making any changes:

```bash
# 1. Confirm current middleware location
ls src/middleware.ts

# 2. Confirm (platform) route group exists and has pages
ls src/app/\(platform\)/

# 3. Confirm withTenant() implementation to understand fallback behaviour
grep -r "withTenant" src/ --include="*.ts" -l

# 4. Check whether any server component reads x-tenant-slug header directly
grep -r "x-tenant-slug" src/ --include="*.ts" --include="*.tsx" -l

# 5. Confirm no existing vercel.json
ls vercel.json 2>/dev/null && echo "EXISTS" || echo "MISSING"

# 6. Confirm Vercel region used in deployments (check existing config or env)
grep -r "cpt1" . --include="*.json" --include="*.mjs" -l
```

---

## 6. Phased Execution Plan

### Phase 1 — Fix Middleware (Primary Fix)

Replace `src/middleware.ts` with the corrected version below. The key structural change: **resolve `isPlatform` and `inferredTenantSlug` first, then branch all subsequent logic by plane.**

```typescript
import { NextResponse, type NextRequest } from 'next/server';

const PLATFORM_DOMAIN = 'app.netbones.co.za';
const DEFAULT_TENANT_SLUG = 'soralia';

function isPlatformHost(host: string): boolean {
  return host.split(':')[0] === PLATFORM_DOMAIN;
}

function isTenantRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/directory') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/providers') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/residents') ||
    pathname.startsWith('/member') ||
    pathname.startsWith('/unit') ||
    pathname.startsWith('/news') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/interest') ||
    pathname.startsWith('/conservation') ||
    pathname.startsWith('/competition') ||
    pathname.startsWith('/guidelines') ||
    pathname.startsWith('/proudly-soralia') ||
    pathname.startsWith('/admin/')
  );
}

function isPlatformRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/home' ||
    pathname.startsWith('/admin/platform') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  );
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/auth')
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Observability
  const requestId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
  response.headers.set('x-request-id', requestId);
  request.headers.set('x-request-id', requestId);

  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  response.headers.set('x-pathname', pathname);
  request.headers.set('x-pathname', pathname);

  // ── Static assets: skip all logic ──
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return response;
  }

  // ── Resolve plane and tenant slug FIRST — before any early returns ──
  const isPlatform = isPlatformHost(host);
  const isLocalhost = host.includes('localhost');

  const hostWithoutPort = host.split(':')[0] || '';
  const subdomain = hostWithoutPort.split('.')[0] || '';
  const inferredTenantSlug = isLocalhost ? DEFAULT_TENANT_SLUG : subdomain || DEFAULT_TENANT_SLUG;

  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRouteCheck = isAuthRoute(pathname);

  // ── Platform plane: app.netbones.co.za ──
  if (isPlatform) {
    // API and auth routes on the platform domain get platform plane headers
    if (isApiRoute || isAuthRouteCheck) {
      response.headers.set('x-plane', 'platform');
      return response;
    }

    // Redirect root to platform home
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    // Redirect tenant routes to platform home
    if (isTenantRoute(pathname)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    response.headers.set('x-plane', 'platform');
    return response;
  }

  // ── Localhost: treat as tenant with default slug ──
  if (isLocalhost) {
    if (isApiRoute || isAuthRouteCheck) {
      response.headers.set('x-plane', 'tenant');
      response.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
      return response;
    }
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
    return response;
  }

  // ── Tenant plane: *.netbones.co.za / custom domains ──
  if (isApiRoute || isAuthRouteCheck) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', inferredTenantSlug);
    return response;
  }

  // Block platform routes on tenant domains
  if (isPlatformRoute(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  response.headers.set('x-plane', 'tenant');
  response.headers.set('x-tenant-slug', inferredTenantSlug);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

### Phase 2 — Add `vercel.json`

Create `vercel.json` at the project root:

```json
{
  "framework": "nextjs",
  "regions": ["cpt1"]
}
```

### Phase 3 — Add Debug Headers (Temporary — Remove After Verification)

Add these two lines immediately after the `isPlatform` assignment during initial testing:

```typescript
response.headers.set('x-debug-host', host);
response.headers.set('x-debug-is-platform', String(isPlatform));
```

After deploying, open DevTools on `app.netbones.co.za` → Network tab → any request → Response Headers. Confirm:

- `x-debug-is-platform: true`
- `x-plane: platform`

Once confirmed, remove the debug headers and redeploy.

### Phase 4 — Verify Vercel Domain Configuration

In the Vercel dashboard:

1. Project → Settings → Domains
2. Confirm both `app.netbones.co.za` and `soralia.netbones.co.za` are listed
3. Both must show **Valid Configuration** (green checkmark)
4. Both must point to the same deployment

If `app.netbones.co.za` is missing or shows a DNS error, add it and configure the DNS CNAME to `cname.vercel-dns.com` (or the A record Vercel specifies).

---

## 7. Risk Register

| Risk                                                                  | Likelihood | Impact | Mitigation                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withTenant()` has a silent Soralia fallback that was masking the bug | High       | Medium | Pre-execution grep of withTenant() implementation; confirm it throws on unknown slug                                                                                                              |
| Platform auth routes (`/sign-in` on platform domain) break after fix  | Medium     | High   | Test platform login flow immediately after deploy; auth routes now get `x-plane: platform` instead of `x-plane: tenant` — confirm auth.ts doesn't require tenant context for platform admin login |
| Redirect loop on platform domain `/`                                  | Low        | Medium | The root redirect to `/home` only fires on `isPlatform` — localhost is excluded. Confirm `(platform)/home/page.tsx` exists before deploying                                                       |
| Debug headers accidentally left in production                         | Low        | Low    | Phase 3 explicitly calls this out; remove before final deploy                                                                                                                                     |

---

## 8. Decision Gates

**GATE G1 — STOP AND CONFIRM before Phase 1:**
Does `withTenant()` throw or silently return null/fallback when the slug `"app"` is passed? The answer determines whether additional guards are needed inside `withTenant()` itself. Run:

```bash
grep -A 20 "function withTenant\|export.*withTenant" src/entities/tenant/api/with-tenant.ts
```

If it silently falls back to any tenant, add an explicit guard:

```typescript
if (slug === 'app' || !slug) throw new Error('Invalid tenant slug');
```

**GATE G2 — STOP AND CONFIRM before Phase 4:**
Confirm with DavDev whether `soralia.netbones.co.za` is the only production tenant domain at this time, or whether custom domains (e.g., `soralia.org`, `soralia.co.za`) are also live and need to be added to Vercel domains.

---

## 9. Done Criteria

- [ ] `app.netbones.co.za` renders the `(platform)` route group — platform home, not Soralia tenant
- [ ] ⏳ `soralia.netbones.co.za` continues to render the Soralia tenant site correctly
- [ ] ⏳ Response header `x-plane: platform` present on all requests to `app.netbones.co.za`
- [ ] ⏳ Response header `x-plane: tenant` and `x-tenant-slug: soralia` present on all requests to `soralia.netbones.co.za`
- [ ] ⏳ Platform login flow functional on `app.netbones.co.za`
- [ ] ⏳ Tenant login flow functional on `soralia.netbones.co.za`
- [ ] ⏳ `vercel.json` committed to repository root
- [ ] ⏳ Debug headers removed
- [ ] ⏳ Both domains show Valid Configuration in Vercel dashboard

---

## 10. Files Modified

| File                | Action                                        |
| ------------------- | --------------------------------------------- |
| `src/middleware.ts` | Replace — restructure plane detection order   |
| `vercel.json`       | Create — framework declaration and region pin |
