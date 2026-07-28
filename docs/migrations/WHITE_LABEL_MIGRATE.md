# White-Label Migration Guide

## Overview

NetComplex will be the platform name (the "SaaS product" that customers sign up for).
Soralia Village will become one white-label instance (a tenant) that can have its own branding, domain, logo, colors, etc. Future clients will get their own branded instances.

---

## Step 1: Understand the New Mental Model

| Concept                     | Description                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Platform** (NetComplex)   | The overarching product, marketing site, signup flow, billing, and super-admin dashboard.                         |
| **Tenants / Organizations** | Each client (Soralia Village, Acme Corp, etc.) is one organization/tenant with isolated data and custom branding. |

Your existing code and data for Soralia Village will become the default/first tenant.

---

## Step 2: Add Better-Auth with the Organization Plugin

Since you're planning to use Better-Auth, start here (do this before major refactoring):

### Install the packages

```bash
npm install better-auth @better-auth/drizzle-adapter
```

### Update your auth config

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
        admin: ['read', 'write', 'manage'],
        member: ['read'],
      },
    }),
  ],
});
```

### Run database migrations

Better-Auth will add tables:

- `organization`
- `organizationMember`
- `organizationInvitation`

---

## Step 3: Extend Your Schema for White-Label Branding

Add a tenants table that links to Better-Auth's organization:

```typescript
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  customDomain: text('custom_domain').unique(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#3b82f6'),
  accentColor: text('accent_color'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Add tenantId to every existing table

```typescript
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  // ... existing columns
});
```

### Migration steps

1. Create a "NetComplex" platform tenant
2. Create a tenant record for "Soralia Village"
3. Update all existing rows with `tenantId = soralia-tenant-id`
4. Create a reusable Drizzle helper to always scope queries by tenantId

---

## Step 4: Handle Branding Migration (Tailwind + CSS Variables)

Your current single-tenant branding needs to become dynamic:

```tsx
export default async function Layout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();

  return (
    <html
      lang="en"
      style={
        {
          '--primary': tenant?.primaryColor || '#3b82f6',
          '--accent': tenant?.accentColor || '#10b981',
        } as React.CSSProperties
      }
    >
      <body className="...">
        <img src={tenant?.logoUrl || '/netcomplex-default-logo.svg'} alt={tenant?.name} />
        <button className="bg-[var(--primary)] text-white">Click</button>
        {children}
      </body>
    </html>
  );
}
```

Update `tailwind.config.ts` to support CSS variables:

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

---

## Step 5: Tenant Resolution (Middleware)

Add `middleware.ts` to detect the tenant from subdomain, custom domain, or fallback to platform:

```typescript
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const tenant = await getTenantFromHost(host);

  const response = NextResponse.next();
  if (tenant) {
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-name', tenant.name);
  }
  return response;
}
```

Cache the tenant lookup (Vercel KV or Redis) for performance.

---

## Step 6: Migration Checklist

### Data Migration Script (run once)

- [ ] ⏳ Create a "NetComplex" platform tenant
- [ ] ⏳ Create a tenant record for "Soralia Village"
- [ ] ⏳ Update all existing rows with tenantId

### Auth Migration

- [ ] ⏳ Existing users become members of the Soralia Village organization
- [ ] ⏳ Add organization switcher

### UI Changes

- [ ] ⏳ Replace hard-coded "Soralia Village" text/logos with dynamic tenant values
- [ ] ⏳ Add super-admin section for managing all tenants
- [ ] On platform marketing site: show signup → create organization → set branding

### Routes & Domains

| Domain                                       | Destination                                   |
| -------------------------------------------- | --------------------------------------------- |
| app.netcomplex.com / netcomplex.com          | Platform (signup, billing, tenant management) |
| soralia.netcomplex.com / soralia-village.com | White-labeled Soralia Village instance        |

---

## Step 7: Recommended Order of Implementation

1. Add Better-Auth + organization plugin + run migrations
2. Add tenantId to all tables + migrate existing data
3. Implement middleware + tenant resolution
4. Make branding dynamic (CSS vars + logo)
5. Update all queries to scope by tenantId
6. Add organization management UI (create, switch, invite)
7. Test with two tenants: original Soralia Village + a test tenant
8. Deploy and configure custom domains on Vercel

---

## Pro Tips

- **Start small**: Keep existing branding working for Soralia Village while building multi-tenant layer
- **Caching**: Aggressively cache tenant config (logo, colors, domain mapping)
- **Security**: Always enforce tenantId on the server — never trust client input
- **Vercel**: Use wildcard domains and the Platforms Starter Kit patterns for custom domains
