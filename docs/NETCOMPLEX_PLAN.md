# NetComplex Platform - Multi-Tenant White-Label Implementation Plan

**Platform Domain**: `netcomplex.netbones.co.za`
**Current Project**: Soralia Village (first tenant)
**Status**: ✅ Phase 4 (Schema) Complete - Adding tenantId to remaining tables IN PROGRESS

---

## Executive Summary

We will transform the existing Soralia Village application into a white-label multi-tenant SaaS platform called **NetComplex**. The platform will support multiple branded instances with custom domains, logos, and colors.

### Current State Assessment

| Component  | Status                                                     |
| ---------- | ---------------------------------------------------------- |
| Auth       | ✅ Better-Auth with Organization plugin already configured |
| Database   | ✅ Drizzle with organizations table                        |
| Schema     | ⚠️ Needs tenantId column on all tables                     |
| Middleware | ❌ Not implemented                                         |
| Theming    | ❌ Static branding (needs dynamic CSS vars)                |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NetComplex Platform                       │
│                   netcomplex.netbones.co.za                │
├─────────────────────────────────────────────────────────────┤
│  Platform Routes (Super Admin)                             │
│  - /admin/platform (manage tenants)                         │
│  - /admin/billing (Stripe integration)                     │
│  - /admin/users (super admin user management)               │
├─────────────────────────────────────────────────────────────┤
│  Tenant Routes (per instance)                                │
│  - {tenant}.netcomplex.netbones.co.za                      │
│  - {custom-domain} (tenant's own domain)                     │
│  - /dashboard, /admin, /directory, etc.                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Current State Assessment & Preparation

| Task | Description                               | Files                             |
| ---- | ----------------------------------------- | --------------------------------- |
| 0.1  | Audit all tables for tenantId requirement | `prisma/drizzle/*.ts`             |
| 0.2  | Document data isolation requirements      | `/docs/ISOLATION_REQUIREMENTS.md` |
| 0.3  | Set up local development with subdomains  | `/etc/hosts` + Next.js config     |

**Estimated**: 2-4 hours

---

### Phase 1: Schema & Data Layer

#### 1.1 Add Tenants Table (Branding)

Create new table for white-label settings:

```typescript
// prisma/drizzle/tenants.ts
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(), // FK to organizations.id
  organizationId: text('organizationId')
    .notNull()
    .references(() => organizations.id),
  customDomain: text('customDomain').unique(),
  logoUrl: text('logoUrl'),
  faviconUrl: text('faviconUrl'),
  primaryColor: text('primaryColor').default('#4F46E5'),
  accentColor: text('accentColor'),
  secondaryColor: text('secondaryColor'),
  fontFamily: text('fontFamily'),
  customCss: text('customCss'),
  active: boolean('active').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt'),
});
```

#### 1.2 Add tenantId to Existing Tables

Tables requiring `tenantId` column:

| Priority    | Table                 | Usage                |
| ----------- | --------------------- | -------------------- |
| 🔴 Critical | `users`               | All user data        |
| 🔴 Critical | `households`          | Property data        |
| 🔴 Critical | `maintenanceRequests` | All maintenance data |
| 🟠 High     | `bookings`            | Facility bookings    |
| 🟠 High     | `events`              | Community events     |
| 🟠 High     | `announcements`       | Announcements        |
| 🟡 Medium   | `conversations`       | Chat messages        |
| 🟡 Medium   | `notifications`       | User notifications   |
| 🟡 Medium   | `surveys`             | Survey data          |
| 🟢 Low      | `groups`              | Community groups     |
| 🟢 Low      | `albums`              | Photo albums         |

#### 1.3 Query Helper ✅ COMPLETE

Created `src/lib/tenant.ts` with tenant query builders:

```typescript
// lib/tenant.ts
import { tenantQueries } from '@/lib/tenant';

// Usage in queries
const users = await db.select().from(users).where(tenantQueries.users(tenantId));

const bookings = await db.select().from(bookings).where(tenantQueries.bookings(tenantId));
```

Available query builders:

- `tenantQueries.users(tenantId)`
- `tenantQueries.households(tenantId)`
- `tenantQueries.bookings(tenantId)`
- `tenantQueries.maintenanceRequests(tenantId)`
- ... (all 30+ tables)

**Estimated**: 4-6 hours

---

### Phase 2: Authentication & Organizations

The Organization plugin is already configured. We need to:

| Task | Description                              |
| ---- | ---------------------------------------- |
| 2.1  | Add organization metadata for branding   |
| 2.2  | Configure roles for multi-tenant access  |
| 2.3  | Create super-admin role (platform admin) |

**Estimated**: 2-3 hours

---

### Phase 3: Tenant Resolution Middleware

Create `middleware.ts` to resolve tenant from:

```
┌────────────────────────────────────────┐
│         Request Host Detection         │
├────────────────────────────────────────┤
│ 1. Custom Domain                       │
│    e.g., soralia-village.com           │
│    → Look up in tenants.customDomain   │
│                                         │
│ 2. Subdomain                           │
│    e.g., soralia.netcomplex.netbones.co.za
│    → Extract slug, look up in tenants.slug
│                                         │
│ 3. Platform Domain                     │
│    e.g., netcomplex.netbones.co.za     │
│    → No tenant, show platform UI       │
└────────────────────────────────────────┘
```

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const tenant = await resolveTenant(host);

  const response = NextResponse.next();
  if (tenant) {
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-name', tenant.name);
    response.headers.set('x-primary-color', tenant.primaryColor);
    response.headers.set('x-logo-url', tenant.logoUrl);
  }
  return response;
}
```

**Estimated**: 3-4 hours

---

### Phase 4: Dynamic Branding (Tailwind + CSS Variables)

#### 4.1 Update Tailwind Config

```typescript
// tailwind.config.ts
colors: {
  primary: 'var(--primary)',
  'primary-foreground': 'var(--primary-foreground)',
  accent: 'var(--accent)',
}
```

#### 4.2 Create Tenant Layout

```typescript
// app/tenant-layout.tsx
export default async function TenantLayout({ children }: Props) {
  const tenantId = headers().get('x-tenant-id');
  const tenant = tenantId ? await getTenant(tenantId) : null;

  return (
    <div
      style={{
        '--primary': tenant?.primaryColor || '#4F46E5',
        // ... other CSS vars
      }}
    >
      {children}
    </div>
  );
}
```

#### 4.3 Logo Component

```typescript
// components/Logo.tsx
export function Logo() {
  const logoUrl = headers().get('x-logo-url');
  const tenantName = headers().get('x-tenant-name');

  return (
    <Image
      src={logoUrl || '/default-logo.png'}
      alt={tenantName || 'NetComplex'}
    />
  );
}
```

**Estimated**: 4-5 hours

---

### Phase 5: Super Admin Dashboard

Platform-level administration for managing tenants:

| Feature | Description                             |
| ------- | --------------------------------------- |
| 5.1     | Tenant List View - all organizations    |
| 5.2     | Tenant Details - view/edit branding     |
| 5.3     | Create Tenant - onboarding flow         |
| 5.4     | Platform Billing - Stripe integration   |
| 5.5     | Super Admin Users - platform-wide admin |

**Routes**:

- `/admin/platform` - Tenant management
- `/admin/platform/billing` - Stripe dashboard

**Estimated**: 6-8 hours

---

### Phase 6: Tenant-Specific UI Updates

Replace hardcoded branding with dynamic values:

| Component | Current             | Target                   |
| --------- | ------------------- | ------------------------ |
| Logo      | Static `/logo.svg`  | Dynamic from tenant      |
| Colors    | Hardcoded `#4F46E5` | CSS variable `--primary` |
| Site Name | "Soralia Village"   | Dynamic from tenant      |
| Favicon   | Static              | Dynamic per tenant       |

**Estimated**: 3-4 hours

---

### Phase 7: Data Migration

| Step | Description                           |
| ---- | ------------------------------------- |
| 7.1  | Create platform tenant (NetComplex)   |
| 7.2  | Create Soralia Village tenant         |
| 7.3  | Add tenantId to all existing records  |
| 7.4  | Migrate users to organization members |
| 7.5  | Verify data integrity                 |

**Estimated**: 2-3 hours

---

### Phase 8: Deployment & Custom Domains

| Task | Description                         |
| ---- | ----------------------------------- |
| 8.1  | Configure wildcard domain in Vercel |
| 8.2  | Add Soralia Village custom domain   |
| 8.3  | Set up SSL certificates             |
| 8.4  | Test subdomains locally             |

**Estimated**: 2-3 hours

---

## Implementation Order (Recommended)

```
Phase 0: Assessment (concurrent with current work)
    │
Phase 1: Schema & Data Layer
    │
Phase 2: Auth & Organizations (mostly done)
    │
Phase 3: Middleware
    │
Phase 4: Dynamic Branding
    │
Phase 5: Super Admin Dashboard
    │
Phase 6: UI Updates (gradual)
    │
Phase 7: Data Migration
    │
Phase 8: Deployment
```

---

## Risk Mitigation

| Risk                              | Mitigation                         |
| --------------------------------- | ---------------------------------- |
| Data isolation bugs               | Add RLS policies to PostgreSQL     |
| Performance from tenant lookups   | Cache in Vercel KV/Redis           |
| Breaking existing Soralia Village | Feature flag for multi-tenant mode |
| Custom domain SSL issues          | Use Vercel automatic SSL           |

---

## Estimated Total Timeline

| Phase     | Hours         |
| --------- | ------------- |
| Phase 0   | 4             |
| Phase 1   | 6             |
| Phase 2   | 3             |
| Phase 3   | 4             |
| Phase 4   | 5             |
| Phase 5   | 8             |
| Phase 6   | 4             |
| Phase 7   | 3             |
| Phase 8   | 3             |
| **Total** | **~40 hours** |

---

## Next Steps

1. **Start Phase 1**: Add tenants table and tenantId columns
2. **Concurrent**: Set up local subdomain testing
3. **Decide**: Use Vercel KV for tenant caching or skip for MVP

---

_Document created: April 2026_
_Based on: WHITE_LABEL_MIGRATE.md, MULTI_TENANT.md_
