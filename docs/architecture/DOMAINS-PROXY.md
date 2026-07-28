---
title: Multi-Tenant Proxy / Middleware Architecture
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Multi-Tenant Proxy / Middleware Architecture

> **Next.js version note:** As of Next.js 15.5 (current deployment), the file convention
> is `middleware.ts` with `export function middleware()`. The `proxy.ts` convention
> (with `export function proxy()`) is a Next.js 16+ feature. When upgrading to
> Next.js 16+, run `npx @next/codemod@canary middleware-to-proxy .` to migrate.

The multi-tenant hostname architecture remains exactly the same regardless of file convention.

---

# Recommended Netcomplex Structure

```txt
src/middleware.ts    // proxy.ts when on Next.js 16+
```

or:

```txt
app/middleware.ts    // app/proxy.ts when on Next.js 16+
```

depending on your project layout.

---

# Convention Reference

| Convention  | Next.js Version | Export Name                    | Filename        |
| ----------- | --------------- | ------------------------------ | --------------- |
| **Current** | 15.5            | `export function middleware()` | `middleware.ts` |
| **Future**  | 16+             | `export function proxy()`      | `proxy.ts`      |

When updating agent instructions or scaffolding new projects:

- **Next.js 15.5 (current):** Use `middleware` export name, `middleware.ts` filename
- **Next.js 16+:** Use `proxy` export name, `proxy.ts` filename
- Codemod available: `npx @next/codemod@canary middleware-to-proxy .`

---

# Recommended Responsibilities

Your `middleware.ts` (or `proxy.ts` on Next.js 16+) should:

| Responsibility                | Required |
| ----------------------------- | -------- |
| Hostname parsing              | Yes      |
| Platform host detection       | Yes      |
| Tenant resolution             | Yes      |
| Reserved subdomain protection | Yes      |
| Tenant header injection       | Yes      |
| URL rewrites                  | Yes      |
| Auth checks                   | Optional |
| Rate limiting                 | Future   |

---

# Recommended Skeleton

## Next.js 15.5 (Current — middleware.ts)

```ts
import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_HOSTS = ['localhost:3000', 'netcomplex.vercel.app', 'app.netbones.co.za'];

const RESERVED_SUBDOMAINS = ['app', 'www', 'admin', 'api'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';

  const normalizedHostname = hostname.replace(/^www\./, '').split(':')[0];

  // Platform Context
  if (PLATFORM_HOSTS.includes(normalizedHostname)) {
    return NextResponse.next();
  }

  // Extract Subdomain
  const subdomain = normalizedHostname.split('.')[0];

  // Reserved Protection
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // Resolve Tenant (edge-safe: no DB access)
  // Use hostname inference or KV cache, not direct Prisma

  // Inject Tenant Context
  const headers = new Headers(request.headers);
  headers.set('x-tenant-slug', subdomain);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
  // Note: skipMiddlewareUrlNormalize → skipProxyUrlNormalize in Next.js 16+
};
```

---

# Important Next.js Consideration

Avoid in middleware/proxy:

- heavy DB operations
- Prisma client instantiation at edge
- large dependencies

Instead:

## Recommended

Use:

- lightweight tenant cache
- edge-compatible fetch
- Redis/KV
- API endpoint lookup

rather than direct Prisma in edge runtime.

---

# Strong Recommendation For Netcomplex

Given your architecture and Vercel deployment:

## Ideal Long-Term Flow

```txt
middleware.ts (or proxy.ts on Next.js 16+)
↓
tenant cache lookup
↓
inject headers
↓
route groups
```

NOT:

```txt
middleware.ts
↓
direct Prisma query every request
```

Edge runtime performance and cold starts become painful otherwise.

---

# Recommended Edge-Safe Pattern

## In Middleware/Proxy

```ts
await fetch(`${process.env.API_URL}/api/internal/tenant`, ...);
```

OR

```ts
await kv.get(`tenant:${slug}`);
```

instead of Prisma directly.

---

# Additional Production Recommendations

Your middleware/proxy should also eventually support:

| Feature                      | Needed |
| ---------------------------- | ------ |
| Preview deployment hostnames | Yes    |
| Custom domains               | Yes    |
| Local development aliases    | Yes    |
| Admin subdomains             | Likely |
| API bypass rules             | Yes    |
| Static asset bypass          | Yes    |

---

# Important Matcher Recommendation

Avoid intercepting static assets.

Recommended:

```ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

This becomes very important as the platform grows.

---

# Config Key Reference

| Next.js Version | Config Key                   | Description                                 |
| --------------- | ---------------------------- | ------------------------------------------- |
| 15.5 (current)  | `skipMiddlewareUrlNormalize` | Skip URL normalization for middleware       |
| 16+             | `skipProxyUrlNormalize`      | Same behavior, renamed for proxy convention |

---

## Migration to Next.js 16 proxy.ts

When upgrading to Next.js 16+:

1. Run: `npx @next/codemod@canary middleware-to-proxy .`
2. This renames middleware.ts → proxy.ts and `export function middleware` → `export function proxy`
3. The proxy runtime is `nodejs` (edge runtime NOT supported in proxy.ts)
4. Update next.config.js: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`
