# Admin Infrastructure Report

## 1. Admin Route Structure

The project has two distinct admin planes:
A. Tenant-Level Admin (/admin/_) — within (tenant) route group
src/app/(tenant)/admin/
├── layout.tsx # Pass-through (bare <>{children}</>)
├── page.tsx # <AdminLayer /> — command bar + domain grid + activity
├── users/page.tsx # User management (AdminUserWidget + UsersListSection)
├── requests/page.tsx # Maintenance requests
├── requests/analytics/page.tsx # Request analytics
├── content/page.tsx # Content management
├── content/new/page.tsx
├── content/[id]/page.tsx
├── events/page.tsx # Event management
├── events/new/page.tsx
├── events/[id]/page.tsx
├── competitions/page.tsx # Competition management
├── competitions/new/page.tsx
├── competitions/[id]/page.tsx
├── surveys/page.tsx # Survey management
├── surveys/new/page.tsx
├── surveys/[id]/page.tsx
├── surveys/[id]/edit/page.tsx
├── surveys/[id]/preview/page.tsx
├── announcements/page.tsx
├── resources/page.tsx
├── resources/new/page.tsx
├── resources/[id]/page.tsx
├── groups/page.tsx
├── groups/new/page.tsx
├── groups/[id]/page.tsx
├── merits/page.tsx
├── merits/new/page.tsx
├── merits/[userId]/page.tsx
├── households/page.tsx
├── categories/page.tsx
├── external-surveys/page.tsx
├── system/page.tsx # System health, stats, PageSettingsWidget
Key file: src/app/(tenant)/admin/layout.tsx — bare layout, just {children}. The chrome comes from SpaceChrome which is mounted in src/app/(tenant)/layout.tsx (wraps every tenant page).
B. Platform-Level Admin (/admin/platform/_) — within (platform) route group
src/app/(platform)/admin/platform/
├── page.tsx # PlatformAdminPage — tenant list
├── new/page.tsx # NewTenantPage
├── [id]/edit/page.tsx # TenantBrandingPage
├── [id]/edit/components.tsx # BrandingForm component
├── [id]/features/page.tsx # TenantFeaturePage
├── [id]/features/components.tsx # FeaturesForm component
This is only accessible on the platform domain (app.netbones.co.za), not on tenant domains.
C. Admin Dashboard Space (/dashboard/admin)
src/app/(tenant)/dashboard/
├── page.tsx # HomeLayer + MyHomeSpace
├── layout.tsx # Bare pass-through
├── admin/layout.tsx # Bare pass-through
├── admin/[domain]/page.tsx # Generic admin domain page via WidgetRenderer
├── [space]/page.tsx # Routes "admin" → AdminLayer
The [space]/page.tsx catches /dashboard/{space} and routes admin to <AdminLayer />, which renders the domain grid. Individual admin domains can be accessed at /dashboard/admin/{domain} (e.g., /dashboard/admin/users).

## 2. Admin Layout Hierarchy

(root layout) src/app/layout.tsx
|
├─ (platform)/layout.tsx — Bare Suspense+Toaster
│ └─ admin/platform/_— No SpaceChrome
│
└─ (tenant)/layout.tsx — I18nextProvider + SpaceChrome wrapper
│
├─ admin/layout.tsx — Pass-through (bare children)
│ └─ admin/_ — Each page is scrollable content
│ └─ page.tsx — AdminLayer (command bar + domain grid)
│
└─ dashboard/layout.tsx — Pass-through
├─ admin/layout.tsx — Pass-through
│ └─ admin/[domain]/page.tsx — WidgetRenderer for admin domains
└─ [space]/page.tsx — Routes to AdminLayer for "admin"
Important: The SpaceChrome (sidebar + mobile bar) is applied once at the (tenant) level, not in the admin or dashboard layouts. Both /admin/_and /dashboard/_ share the same sidebar. 3. SpaceChrome (Shared Sidebar)
File: src/widgets/dashboard/ui/SpaceChrome.tsx

- A client component wrapping the 5-space sidebar navigation
- Uses SpaceLauncher (desktop sidebar) + MobileSpaceBar (mobile bottom nav)
- State: collapsed (persisted locally), pathname, session, flags
- Visible spaces computed via getVisibleSpaces(role, flags):
- Core spaces (home, messages, admin) are always visible
- Admin space only visible for admin/board roles (check: ADMIN_ROLES = ['admin', 'board', 'ADMIN', 'BOARD'])
- Optional spaces (services, community) auto-hide when all their feature flags are off
  Space definitions in src/widgets/dashboard/model/spaces.ts:
- 5 space IDs: home, services, community, messages, admin
- Admin space: href: '/admin', icon: Shield, isCore: true, minimumRole: 'admin'
- URL detection: getActiveSpaceId() checks for /admin prefix first

## 4. AdminLayer (Admin Home Page)

File: src/widgets/dashboard/ui/AdminLayer.tsx

- Renders 3 sections:

1. AdminCommandBar — Reactive CTAs (open maintenance, pending members, closing surveys) + creation shortcuts (invite user, new event, etc.)
2. Domain Grid — 10 management domains rendered as cards with badge counts
3. Activity Stream — Lazy-loaded AdminActivityStream

- Fetches urgency data from /api/admin/urgency
- isPlatformAdmin check: session?.user?.role?.toUpperCase() === 'ADMIN'
- Domain route overrides: maintenance → /admin/requests
- Uses ADMIN_DOMAIN_DEFINITIONS for card rendering
  Admin Domain Definitions from src/widgets/dashboard/ui/AdminSubLauncher.tsx:
  export const ADMIN_DOMAIN_DEFINITIONS: AdminDomainDef[] = [
  { id: 'users', labelKey: 'domains.users', icon: '/platform/users.svg' },
  { id: 'maintenance', labelKey: 'domains.maintenance', icon: '/platform/maintenance.svg' },
  { id: 'content', labelKey: 'domains.content', icon: '/platform/content.svg' },
  { id: 'events', labelKey: 'domains.events', icon: '/platform/events.svg' },
  { id: 'competitions', labelKey: 'domains.competitions', icon: '/platform/competitions.svg' },
  { id: 'resources', labelKey: 'domains.resources', icon: '/platform/resources.svg' },
  { id: 'surveys', labelKey: 'domains.surveys', icon: '/platform/surveys.svg' },
  { id: 'announcements', labelKey: 'domains.announcements', icon: '/platform/announcements.svg' },
  { id: 'merits', labelKey: 'domains.merits', icon: '/platform/merits.svg' },
  { id: 'system', labelKey: 'domains.system', icon: '/platform/system.svg' },
  ];
  Admin Domain Widget Map (from spaces.ts):
  const ADMIN_DOMAIN_WIDGET_MAP: Record<AdminDomain, string[]> = {
  users: ['admin-user'],
  maintenance: ['maintenance-list', 'maintenance-analytics'],
  content: ['admin-content'],
  events: ['admin-events'],
  competitions: ['admin-competitions'],
  resources: ['admin-resources'],
  surveys: ['admin-surveys'],
  merits: ['admin-merits'],
  announcements: ['admin-announcements'],
  system: ['admin-system', 'page-settings'],
  };
  Each admin domain page at /dashboard/admin/{domain} uses WidgetRenderer to render these widgets stacked vertically.

## 5. Prisma Schema — Tenant Model

File: prisma/schema.prisma
Core model — Tenant:
model Tenant {
id String @id @default(uuid())
name String
slug String @unique
customDomain String? @unique
logoUrl String?
faviconUrl String?
primaryColor String @default("#4F46E5")
accentColor String?
secondaryColor String?
fontFamily String?
customCss String?
active Boolean @default(true)
subscriptionTier String @default("basic")
modules Json?
maxPages Int @default(5)
pageCount Int @default(0)
featureFlags Json @default("{}")
tier Tier @default(STANDARD) // STANDARD | PREMIUM | ENTERPRISE
ownerId String?
owner user? @relation("TenantOwner", fields: [ownerId], references: [id])
tenantModules TenantModule[]
assistSessions AssistSession[]
}
Module gating models:
model PlatformModule {
id String @id @default(cuid())
key String @unique
label String
minTier Tier @default(STANDARD)
defaultEnabled Boolean @default(false)
description String?
tenantModules TenantModule[]
}

model TenantModule {
id String @id @default(cuid())
tenantId String
moduleKey String
enabled Boolean @default(false)
config Json?
module PlatformModule @relation(fields: [moduleKey], references: [key])
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
@@unique([tenantId, moduleKey])
}
Settings model (generic k/v):
model Setting {
id String @id
tenantId String
key String
value String
@@unique([tenantId, key])
}
Organization model:
model Organization {
id String @id
tenantId String
name String
slug String @unique
logo String?
createdAt DateTime
metadata String?
invitation Invitation[]
member Member[]
}
User model (the user table) with key fields:
model user {
id String @id
tenantId String
email String @unique
name String
role Role @default(RESIDENT) // See Role enum below
isActive Boolean @default(true)
isPlatformAdmin Boolean @default(false) // Global platform admin flag
// ... many relations
}
Role enum:
enum Role {
RESIDENT
GROUP_ADMIN
COMMITTEE
BOARD
ADMIN
AGENT
MANAGER
ASSOCIATE
}
Tier enum:
enum Tier {
STANDARD
PREMIUM
ENTERPRISE
} 6. Tenant Context Resolution
Middleware (src/middleware.ts):

- Host-based routing: app.netbones.co.za → platform plane; \*.netbones.co.za → tenant plane
- Sets x-plane, x-tenant-slug headers edge-safe (no DB lookup)
- On localhost, defaults to tenant slug soralia
  Server-side resolution (src/entities/tenant/api/base.ts):
- getCurrentTenant(): checks x-tenant-id, then x-tenant-slug headers, then falls back to LOCAL_TENANT_SLUG env var (defaults to 'soralia')
- Provides CRUD operations: getTenantById, getTenantBySlug, getTenantByDomain, createTenant, updateTenant, listTenants
- tenantQueries object provides per-entity tenant filters for all 30+ tenant-scoped tables
  RLS context (src/shared/api/db.ts):
- getRLSContext(request): authenticates session, returns { userId, tenantId, role, isPlatformAdmin }
- runWithRLS(ctx, fn): wraps queries in a transaction, sets Postgres session variables (app.user_id, app.tenant_id, app.user_role, app.is_platform_admin) for RLS policies
  API route guard (src/shared/api/auth-utils.ts):
- requireAnyPermission(['admin', 'settings']): used by admin API routes
- requirePermission('admin'): checks specific permission
- Uses hasPermission(role, permission) from permissions system

## 7. Role & Permission Model

Constants (src/shared/lib/constants.ts):
export const ROLES = {
RESIDENT, GROUP_ADMIN, COMMITTEE, BOARD, ADMIN, AGENT, MANAGER, ASSOCIATE
} as const;
Permissions (src/shared/lib/permissions.ts):
interface Permission {
admin: boolean; // Full system admin
users: boolean; // Manage users
households: boolean; // Manage households
requests: boolean; // Maintenance requests
content: boolean; // Content management
contentOwn: boolean; // Own content only
groups: boolean; // All groups
groupsOwn: boolean; // Own groups only
events: boolean; // Event management
bookings: boolean; // Bookings
directory: boolean; // Directory access
messages: boolean; // Messaging
settings: boolean; // Settings
announcements: boolean;// Announcements
}
Permission matrix (simplified):
Role admin users requests content
RESIDENT - - - -
GROUP_ADMIN - - - -
COMMITTEE - - ✓ ✓
BOARD - - ✓ ✓
ADMIN ✓ ✓ ✓ ✓
MANAGER - ✓ ✓ ✓
ASSOCIATE - - - -
Platform Admin (separate from role):

- user.isPlatformAdmin boolean field on the user model — a global super-admin
- Checked by requirePlatformAdmin guard in API routes
- Used in AdminLayer to determine if user can see platform admin links
- getRLSContext() returns isPlatformAdmin for use in RLS and cross-tenant operations

## 8. Admin API Routes

src/app/api/admin/
├── activity/route.ts # GET - activity feed (multi-domain)
├── board-members/route.ts # Board member data
├── maintenance-stats/route.ts # Maintenance analytics
├── urgency/route.ts # GET - urgency counts for badges/CTAs
├── settings/page-flags/route.ts # Page settings/feature flags
├── system/health/route.ts # Health check
└── platform/
├── tenants/route.ts # CRUD tenants (platform admin)
├── tenants/[id]/route.ts # Single tenant operations
└── assist/route.ts # Assist sessions
Admin API routes use requireAnyPermission(['admin', 'settings']) for authorization. 9. Admin "Domain" Pattern (Widget-Based)
The admin space follows the same domain-with-widgets pattern as the dashboard: 10. Admin domains are defined in ADMIN_DOMAIN_DEFINITIONS (10 domains) 11. Each domain maps to widget IDs in ADMIN_DOMAIN_WIDGET_MAP 12. The generic /dashboard/admin/[domain] page resolves domain → widgets via getAdminDomainWidgets() and renders them with WidgetRenderer 13. Standalone /admin/{domain} pages exist for domains that need custom layouts (e.g., /admin/system, /admin/users)
This dual-path pattern means:

- /admin/users → custom page with full control
- /dashboard/admin/users → generic widget-rendered view (via UsersListSection)

## 10. Admin Navigation/Sidebar Pattern

- Desktop sidebar (SpaceLauncher): 5 space icons, collapsible, shows only spaces user has access to
- Mobile bar (MobileSpaceBar): Fixed bottom nav, 5 slots, portals to body
- AdminCommandBar: Title bar with reactive urgency chips + creation shortcuts (customizable per user via useLocalStorage)
- AdminSubLauncher: Domain grid on admin home page (not sidebar — it's inline on the main content)
- Breadcrumbs: Used throughout admin pages (e.g., Home > Admin > System)
- No dedicated admin sidebar — admin uses the same SpaceChrome sidebar as other spaces
