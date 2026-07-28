---
title: Multi-Tenant SaaS Architecture Guide
status: current
reviewed: 2026-07-28
tags: [multi-tenant, architecture]
audience: developer
---

# Multi-Tenant SaaS Architecture Guide

Turning a Next.js (App Router) + Tailwind + Drizzle project into a white-label multi-tenant SaaS is a well-established pattern. The core idea is to run one codebase that serves many customers (tenants) with full data isolation, while allowing each tenant to brand the app as their own.

---

## 1. Choose Your Multi-Tenancy Model

**Best practice**: Shared database with `tenant_id` / `organization_id` column on every table.

This is the most scalable and cost-effective for SaaS. Drizzle handles it cleanly with relations and type-safe queries. For extra security, enable PostgreSQL Row Level Security (RLS) policies.

### Schema Changes

```typescript
// Tenants table (for white-label settings)
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  customDomain: text('custom_domain').unique(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#3b82f6'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Example app table – EVERY table gets tenantId
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  name: text('name').notNull(),
});
```

### Query Helper

```typescript
export function withTenant(tenantId: string) {
  return (qb: any) => qb.where(eq(projects.tenantId, tenantId));
}
```

---

## 2. Authentication & Organizations

Use **Better-Auth** with the Organization plugin. It provides:

- Organizations (your tenants)
- Member roles & invitations
- Organization switcher UI
- Secure session + org context

### Installation

```bash
npm install better-auth @better-auth/drizzle-adapter
```

### Configuration

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { organization } from 'better-auth/plugins';
import { db } from '@/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      roles: {
        owner: ['*'],
        admin: ['read', 'write'],
        member: ['read'],
      },
    }),
  ],
});
```

---

## 3. Tenant Resolution with Next.js Middleware

This is the heart of both multi-tenancy and white-labeling.

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const tenant = await getTenantByHost(host);

  const response = NextResponse.next();

  if (tenant) {
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
    response.headers.set('x-primary-color', tenant.primaryColor);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. White-Label Theming with Tailwind

Tailwind is build-time, so use CSS variables + Tailwind's `var()` support.

### Root Layout

```tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenantId = headers().get('x-tenant-id');
  const tenant = await getTenant(tenantId);

  return (
    <html
      lang="en"
      style={
        {
          '--primary': tenant.primaryColor || '#3b82f6',
          '--primary-foreground': '#ffffff',
        } as React.CSSProperties
      }
    >
      <body className="bg-background text-foreground">
        <img src={tenant.logoUrl || '/default-logo.png'} alt={tenant.name} />
        <div className="bg-[var(--primary)]">{children}</div>
      </body>
    </html>
  );
}
```

### Tailwind Config

```typescript
const config: Config = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
      },
    },
  },
};
```

### Advanced White-Label Options

- Custom favicon/meta tags per tenant (use `generateMetadata`)
- Tenant-specific route injection

---

## 5. Tenant-Aware Data Access

Wrap your Drizzle client or use a context provider:

```typescript
const tenantId = headers().get('x-tenant-id');
if (!tenantId) throw new Error('No tenant');

const projects = await db.select().from(projects).where(eq(projects.tenantId, tenantId));
```

**Never** let the client pass a tenant ID—always derive it from the request.

---

## 6. Deployment & Custom Domains

Vercel natively supports unlimited custom domains + wildcard subdomains for platforms.

1. Programmatically add domains via Vercel API when a tenant upgrades
2. Use Vercel's Platforms Starter Kit as a reference

---

## 7. Best Practices & Gotchas

| Area            | Recommendation                                                            |
| --------------- | ------------------------------------------------------------------------- |
| **Caching**     | Cache tenant config (logo, colors, domain map) in Redis/Vercel KV         |
| **Security**    | Always verify tenant via auth org membership + middleware                 |
| **Billing**     | Stripe + Better-Auth orgs → seat-based subscriptions                      |
| **Onboarding**  | User signs up → creates organization → invites members → uploads branding |
| **Performance** | Use React Server Components and edge functions where possible             |
| **Testing**     | Mock tenants in tests; use local subdomains for QA                        |
| **Scalability** | Start with shared DB; shard later if millions of rows                     |

---

## Recommended Stack

| Purpose     | Tool                      |
| ----------- | ------------------------- |
| Auth + Orgs | Better-Auth               |
| Database    | Drizzle + PostgreSQL      |
| Caching     | Vercel KV / Upstash Redis |
| Billing     | Stripe                    |
| Validation  | Zod + Server Actions      |

---

## Quick Start Path

1. Add `tenants` table + `tenantId` to every table
2. Integrate Better-Auth with Organization plugin
3. Add middleware for tenant resolution
4. Create TenantLayout that injects CSS vars + logo
5. Refactor queries to always scope by tenantId
6. Deploy to Vercel and test with custom domains

---

## Why Better-Auth Instead of Clerk?

Better-Auth wins when you want:

- Full data ownership and control
- No ongoing auth costs that scale with users
- Deep customization via plugins
- Staying in your Drizzle/Postgres ecosystem

Clerk may still be better if you need polished drop-in React components, verified domains, or enterprise SSO.

---

## Implementation Tips

1. Start by adding the organization plugin and verifying new tables appear
2. For custom domains: Combine middleware with a lookup table mapping domains → organization ID
3. Cache organization branding data aggressively
4. Use Better-Auth's hooks and server actions for organization operations
5. Test multi-tenancy early with local subdomains (e.g., `tenant1.localhost:3000`)
