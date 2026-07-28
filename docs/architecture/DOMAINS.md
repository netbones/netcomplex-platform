---
title: Netcomplex Multi-Tenant Middleware Instructions
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Netcomplex Multi-Tenant Middleware Instructions

## Objective

Implement production-grade hostname-based multi-tenancy for **Netcomplex**.

The platform must cleanly separate:

- Platform context (`app.netbones.co.za`)
- Tenant context (`soralia.netbones.co.za`)
- Internal/staging hosts (`netcomplex.vercel.app`)
- Future custom domains

---

# Domain Topology

## Platform Hosts

These MUST resolve to the platform shell and NEVER attempt tenant lookup:

```txt
app.netbones.co.za
netcomplex.vercel.app
localhost:3000
```

---

## Tenant Hosts

These MUST resolve tenants dynamically via hostname:

```txt
soralia.netbones.co.za
oaklands.netbones.co.za
greenfields.netbones.co.za
```

---

# Core Architectural Rules

## 1. Platform ≠ Tenant

Never treat the platform hostname as a tenant.

Bad:

```txt
app.netbones.co.za -> tenant slug "app"
```

Correct:

```txt
app.netbones.co.za -> platform context
```

---

## 2. Tenant Resolution Uses Slugs

Resolve tenants via:

```txt
tenant.slug
```

NOT UUIDs.

Example:

```txt
soralia.netbones.co.za
→ slug = "soralia"
```

---

## 3. No Default Tenant Fallback

Unknown hosts must NEVER silently route to Soralia or any other tenant.

Bad:

```txt
unknown hostname -> soralia
```

Correct:

```txt
unknown hostname -> 404 / tenant-not-found
```

---

# Reserved Subdomains

These MUST NEVER be resolved as tenants.

```ts
const RESERVED_SUBDOMAINS = ['app', 'www', 'admin', 'api', 'docs', 'mail'];
```

---

# Platform Hosts

```ts
const PLATFORM_HOSTS = ['localhost:3000', 'netcomplex.vercel.app', 'app.netbones.co.za'];
```

---

# Middleware Responsibilities

The middleware must:

1. Extract hostname
2. Normalize hostname
3. Detect platform hosts
4. Detect reserved subdomains
5. Resolve tenant slugs
6. Attach tenant context
7. Reject invalid tenants

---

# Hostname Normalization

Middleware must normalize:

- localhost
- Vercel preview deployments
- production domains
- forwarded headers

Preferred order:

```ts
const hostname = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
```

Then normalize:

```ts
const normalizedHostname = hostname.replace(/^www\./, '');
```

---

# Middleware Decision Tree

## Step 1 — Platform Host?

```ts
if (PLATFORM_HOSTS.includes(normalizedHostname)) {
  return platformContext();
}
```

---

## Step 2 — Extract Subdomain

Example:

```txt
soralia.netbones.co.za
→ soralia
```

---

## Step 3 — Reserved Subdomain?

```ts
if (RESERVED_SUBDOMAINS.includes(subdomain)) {
  return platform404();
}
```

---

## Step 4 — Resolve Tenant

Lookup:

```ts
tenant = await db.tenant.findUnique({
  where: {
    slug: subdomain,
  },
});
```

---

## Step 5 — Tenant Missing?

```ts
if (!tenant) {
  return tenantNotFound();
}
```

Never fallback to another tenant.

---

## Step 6 — Attach Tenant Context

Examples:

- request headers
- request cookies
- request attributes
- rewrites

Recommended:

```ts
requestHeaders.set('x-tenant-id', tenant.id);
requestHeaders.set('x-tenant-slug', tenant.slug);
```

---

# Suggested Routing Structure

## Platform Routes

```txt
app/(platform)
```

Examples:

```txt
/login
/dashboard
/onboarding
/pricing
/admin
```

---

## Tenant Routes

```txt
app/(tenant)
```

Examples:

```txt
/community
/bookings
/maintenance
/notices
/residents
```

---

# Recommended Rewrite Strategy

## Platform

```txt
app.netbones.co.za/dashboard
→ /(platform)/dashboard
```

---

## Tenant

```txt
soralia.netbones.co.za/community
→ /(tenant)/community
```

---

# Suggested Middleware Skeleton

```ts
import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_HOSTS = ['localhost:3000', 'netcomplex.vercel.app', 'app.netbones.co.za'];

const RESERVED_SUBDOMAINS = ['app', 'www', 'admin', 'api'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';

  const normalizedHostname = hostname.replace(/^www\./, '');

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

  // Tenant Lookup
  const tenant = await getTenantBySlug(subdomain);

  if (!tenant) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url));
  }

  // Attach Context
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-slug', tenant.slug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

---

# Future-Proofing Requirements

The middleware MUST support future:

- custom domains
- tenant vanity domains
- regional deployments
- staging environments
- admin subdomains

---

# Custom Domain Preparation

Future schema recommendation:

```prisma
model Tenant {
  id           String
  slug         String @unique
  customDomain String?
}
```

Middleware logic later becomes:

```txt
if hostname matches customDomain
→ resolve tenant
```

---

# Security Requirements

## MUST Prevent

- hostname spoofing
- tenant leakage
- cross-tenant access
- fallback tenant exposure

---

# Performance Recommendations

## Cache Tenant Resolution

Use:

- edge caching
- Redis
- in-memory cache
- KV storage

Avoid DB hit on every request.

---

# Production Goals

The final architecture should support:

```txt
app.netbones.co.za
→ platform

soralia.netbones.co.za
→ tenant

futuretenant.netbones.co.za
→ tenant

customerdomain.com
→ tenant
```

without modifying routing logic later.
