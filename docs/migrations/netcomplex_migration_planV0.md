# NetComplex White-Label Multi-Tenant Migration Guide

## Project Context

- Current app: Single-tenant **Soralia Village** (built with Next.js App Router, Tailwind, Drizzle).
- Target: Transform into **NetComplex** — the platform SaaS that offers white-labeled instances to multiple clients (starting with Soralia Village as the first tenant).

- Goals:
  - One shared codebase.
  - Per-tenant branding (logo, colors, custom domains, slugs).
  - Per-tenant feature selection (clients pick and choose modules).
  - Support for bespoke/custom elements while maintaining a standardized platform design.
  - Continue Soralia development without interruption.
  - Use **Better-Auth** with the organization plugin for auth + multi-tenancy.

## 1. High-Level Architecture

- **Platform (NetComplex)**: Marketing site, signup, billing, super-admin tenant management (`app.netbones.co.za`).
- **Tenant Instances**: Each client (e.g., `soralia.netbones.co.za` or `soralia.org`) gets isolated data + custom branding/features.
- **Data Model**: Shared PostgreSQL database with `tenant_id` / `organization_id` on all tables (use Drizzle + Better-Auth organizations).
- **Tenant Resolution**: Middleware detects subdomain or custom domain → loads tenant config (cached).
- **Theming**: CSS variables injected at layout level for dynamic Tailwind colors + logos.
- **Features**: DB-backed toggles + component registry so tenants enable/disable modules.

## 2. Recommended Repository Organization

Keep **one codebase**. Avoid per-tenant folders in `app/` (hurts DX and build times). Instead, use context-driven separation.

### Proposed Structure (Key Changes Only)

```bash
src/
├── app/
│   ├──src/app/
├── [lng]/                        # i18n route segment (language code)
│   ├── locales/                  # Your translation JSON files (af, en, xh, zu)
│   ├── layout.tsx                # Can access params.lng + tenant context
│   ├── page.tsx
│   ├── dashboard/
│   ├── groups/
│   └── ...                       # All your current Soralia pages/routes live here  (Soralia + future tenants)
│   ├── platform/                 # NEW: NetComplex marketing + super-admin
│   │   ├── page.tsx              # Landing / signup
│   │   ├── admin/
│   │   │   └── platform/         # Tenant management, feature assignment
│   │   └── tenants/              # List, create, configure tenants
│   └── (marketing)/              # Optional route group for public NetComplex pages
├── components/
│   ├── core/                     # Platform-wide, standardized UI (enforce design system)
│   │   ├── layout/
│   │   ├── ui/                   # Move shared shadcn + TenantStyles here over time
│   │   └── widgets/              # DraggableWidget, WidgetRenderer, etc.
│   ├── tenant/                   # White-label aware components
│   │   ├── BrandingHeader.tsx
│   │   ├── TenantDashboardShell.tsx
│   │   ├── FeatureGate.tsx
│   │   └── TenantProvider.tsx    # Move existing here
│   ├── custom/                   # Bespoke / client-specific slots (safe isolation)
│   │   └── CustomSectionRenderer.tsx
│   ├── registry.ts               # Central component & feature registry
│   └── ... (keep existing folders)
├── lib/
│   ├── features/
│   │   ├── registry.ts           # Extend this
│   │   └── tenantFeatures.ts     # NEW: per-tenant enabled features + config
│   ├── tenant/
│   │   ├── config.ts             # Branding + feature resolution
│   │   ├── context.ts            # Server + React context helpers
│   │   └── middleware-helpers.ts
│   ├── tenant-context.ts         # NEW
│   └── ... (existing files)
├── types/
│   └── tenant.ts                 # TenantConfig, FeatureDefinition, etc.
└── middleware.ts                 # Already present – enhance for tenant resolution
```

## Benefits

core/ enforces standardized NetComplex design.
tenant/ handles dynamic branding & feature gates.
custom/ safely contains bespoke elements (MDX slots, custom sections).
Soralia development continues in [lng] routes using the Soralia tenant context.

## 3. Component & Feature Store

## Component Registry (src/components/registry.ts)

```tsx
export type FeatureComponent = {
  name: string;
  component: React.ComponentType<any>;
  requiredPlan?: 'standard' | 'premium';
  defaultEnabled?: boolean;
};

export const componentRegistry = {
  'dashboard.stats': { name: 'StatsWidget', component: StatsWidget, defaultEnabled: true },
  'services.grid': { name: 'ServicesGrid', component: ServicesGrid },
  'custom.hero': { name: 'BespokeHero', component: BespokeHeroSlot },
  // Add all existing widgets here
} as const;
```

Use this in your existing WidgetRenderer.tsx.

## Feature Registry (lib/features/registry.ts)

Extend your existing file:

```tsx
export const availableFeatures = [
  { id: 'dashboard', label: 'Dashboard', defaultEnabled: true },
  { id: 'services-marketplace', label: 'Community Services', defaultEnabled: true },
  { id: 'bookings', label: 'Bookings', defaultEnabled: false },
  { id: 'conservation', label: 'Conservation', defaultEnabled: true },
  { id: 'premium-portfolio', label: 'Premium Seats', defaultEnabled: false },
] as const;

export type FeatureId = (typeof availableFeatures)[number]['id'];
```

## Store per-tenant selection in tenants table (or junction table)

- `enabledFeatures`: `json('enabled_features').$type<FeatureId[]>()`
- `customConfig`: `json('custom_config')` for bespoke settings

## 4. Bespoke / Custom Elements

Two safe patterns (no per-client code branches):

Slot-based custom sections — Store in DB (custom_sections table) and render via CustomSectionRenderer.
MDX in DB — Whitelist safe components for advanced clients.

Soralia can use the full feature set; new tenants start minimal and add slots as needed.

## 5. Branding & Theming (Tailwind + CSS Vars)

Update root layout.tsx (or TenantLayout):

```tsx
const tenant = await getCurrentTenant();

return (
  <html
    style={
      {
        '--primary': tenant?.primaryColor || '#3b82f6',
        '--accent': tenant?.accentColor || '#10b981',
      } as React.CSSProperties
    }
  >
    <body>
      <img src={tenant?.logoUrl || '/netcomplex-default-logo.svg'} alt={tenant?.name} />
      {children}
    </body>
  </html>
);
```

Ensure tailwind.config.cjs supports CSS variables for colors.

## 6. Tenant Resolution & Middleware

Enhance your existing middleware.ts to:

Detect host → lookup tenant by slug or customDomain (cache with Vercel KV / Redis).
Set headers: x-tenant-id, x-tenant-slug, branding vars.
In dev: Respect LOCAL_TENANT_SLUG=soralia-village env var so Soralia team works unchanged.

Always scope Drizzle queries by tenantId (create helper functions).

## 7. Migration Steps (Zero-Downtime Order)

### Immediate

Create new folders (core/, tenant/, custom/).
Move TenantProvider.tsx, TenantStyles.tsx, widgets.
Add enabledFeatures column + Drizzle migration.
Integrate Better-Auth organization plugin (if not fully done).

### This Week

Make branding dynamic (CSS vars + logo).
Add FeatureGate component and wrap toggleable routes.
Update queries to always filter by tenantId.

### Next 1-2 Weeks

Build tenant admin UI under /platform/admin/tenants for feature assignment + branding upload.
Seed Soralia as the first tenant with current branding + all features enabled.
Add data migration script to backfill tenantId on existing tables.

### Ongoing

New features go into core/ or features/.
Use local env LOCAL_TENANT_SLUG=soralia-village for continued Soralia work.
Test new tenants via subdomains or the platform admin.

## 8. Local Development Workflow

Set LOCAL_TENANT_SLUG=soralia-village in .env.local.
Middleware falls back to this tenant in development.
To test a new tenant: temporarily change the env var or use a test subdomain with ngrok.

## 9. Security & Best Practices

Always verify tenant via Better-Auth organization membership + middleware.
Never trust client-provided tenant IDs.
Cache tenant config aggressively.
Use Row Level Security (RLS) on Postgres as defense-in-depth.
For custom domains: Use Vercel API to add domains programmatically.
