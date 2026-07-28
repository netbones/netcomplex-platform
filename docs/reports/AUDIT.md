---
title: Comprehensive Codebase Analysis: soralia-village
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Comprehensive Codebase Analysis: soralia-village

## 1. ADMIN DASHBOARD -- /dashboard/admin/users Route

Route Structure:

- Route file: /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/[domain]/page.tsx
- This is a dynamic route where domain is one of the ADMIN_DOMAINS constants
  How the page works:

1. Validates the domain param against ADMIN_DOMAINS array (['users', 'maintenance', 'content', 'events', 'competitions', 'resources', 'surveys', 'announcements', 'system'])
2. Looks up the domain definition from ADMIN_DOMAIN_DEFINITIONS (icon, label, description)
3. Renders widgets matched via getAdminDomainWidgets(domain) -- for users domain this returns ['admin-user']
4. Additionally renders <UsersListSection /> inline when domain === 'users'
   Key files for admin users:
   File
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/[domain]/page.tsx
   /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/layout.tsx
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/spaces.ts
   /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/AdminSubLauncher.tsx
   Admin Layout: The admin layout (/home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/layout.tsx) is a pass-through (just <>{children}</>). Real navigation is provided by the parent dashboard/layout.tsx which uses the Focus Spaces sidebar (SpaceLauncher).

## 2. USER MODEL AND RELATED MODELS

Prisma Schema user model (lines 842-899 of prisma/schema.prisma):
model user {
id String @id
tenantId String
email String @unique
name String
role Role @default(RESIDENT)
isActive Boolean @default(true)
phone String?
interests String[]
avatar String?
profileImage String?
books Json? @default("[]")
dashboardLayout Json? @default("null")
isPublic Boolean @default(true)
showEmail Boolean @default(true)
showPhone Boolean @default(true)
profileSlug String?
createdAt DateTime @default(now())
updatedAt DateTime @default(now()) @updatedAt
emailVerified Boolean @default(false)
image String?
twoFactorEnabled Boolean? @default(false)
isPlatformAdmin Boolean @default(false)
// ... MANY relations (Booking, Conversation, Group, MaintenanceRequest, Message, etc.)
platformSuspension platformSuspension[]
}
Drizzle schema (/home/ubuntupunk/Projects/soralia-village/src/db/schema/users.ts): mirrors the Prisma model but uses Drizzle's pgTable.
Related models:

- platformSuspension (lines 663-681 in prisma schema): Already exists! Has fields: id, tenantId, userId, suspensionType (enum), reason, description, startDate, endDate, isPermanent, isActive, createdById, createdAt, updatedAt
- SuspensionType enum (lines 1171-1178): NON_PAYMENT, VIOLATION, DISRUPTION, PROPERTY, BEHAVIOR, OTHER
- ResidentType enum (lines 1101-1106): OWNER, RENTER, SUSPENDED
- Role enum (lines 1107-1117): RESIDENT, GROUP_ADMIN, COMMITTEE, BOARD, ADMIN, AGENT, MANAGER, ASSOCIATE
- ProfileStatus enum (lines 1066-1072): ACTIVE, UPGRADED, REMOVED, EVICTED, LEASE_ENDED
  Drizzle schema for platformSuspensions (/home/ubuntupunk/Projects/soralia-village/src/db/schema/platform-suspensions.ts):
  export const platformSuspensions = pgTable('platformSuspension', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  suspensionType: suspensionTypeEnum('suspensionType').notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  startDate: timestamp('startDate').defaultNow().notNull(),
  endDate: timestamp('endDate'),
  isPermanent: boolean('isPermanent').default(false).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdById: text('createdById').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  });
  Drizzle relations (/home/ubuntupunk/Projects/soralia-village/src/db/schema/platform-suspensions-relations.ts):
  export const platformSuspensionsRelations = relations(platformSuspensions, helpers => ({
  user: helpers.one(users, {
  relationName: 'platformSuspensionTouser',
  fields: [platformSuspensions.userId],
  references: [users.id],
  }),
  }));

## 3. AUTH SYSTEM (Better Auth)

Auth Server: /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth.ts

- Uses better-auth with Drizzle adapter
- Plugins: twoFactor, organization, bearer, passkey
- User additional fields: tenantId, dashboardLayout, profileSlug, role (all input: false -- managed by system)
- Email/password enabled with requireEmailVerification: true
- Custom databaseHooks to generate profileSlug on user create
  Auth Client: /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth-client.ts
  export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  plugins: [twoFactorClient(), organizationClient(), adminClient()],
  });
  Session Handling: /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth-utils.ts
- getSessionAndRole() -- fetches session from Better Auth and queries DB for role
- requirePermission(permission) -- returns 401/403 if unauthorized
- requireOwnPermission(permission) -- same but allows GROUP_ADMIN for own group
- requireAnyPermission(permissions) -- checks if role has at least one of the permissions
  API Route Auth Pattern (seen in /home/ubuntupunk/Projects/soralia-village/src/app/api/users/route.ts):
  async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  // query DB for role
  return { session, userId, role };
  }
  Then uses hasPermission(authData.role, 'users') for authorization.

## 4. ROLE / PERMISSION SYSTEM

Location: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/permissions.ts
Permission interface:
export interface Permission {
admin: boolean; // ADMIN role
users: boolean; // ADMIN, MANAGER
households: boolean; // ADMIN, BOARD, COMMITTEE, MANAGER
requests: boolean; // ADMIN, BOARD, COMMITTEE, MANAGER
content: boolean; // ADMIN, BOARD, COMMITTEE, MANAGER
groups: boolean; // ADMIN, BOARD, COMMITTEE, MANAGER
groupsOwn: boolean; // Nearly all roles except AGENT
contentOwn: boolean; // Nearly all roles except AGENT
events: boolean; // Nearly all roles
bookings: boolean; // Nearly all roles
directory: boolean; // Nearly all roles
messages: boolean; // Nearly all roles
settings: boolean; // ADMIN, BOARD, COMMITTEE, MANAGER
announcements: boolean; // ADMIN, BOARD, COMMITTEE, MANAGER
}
Role-to-Permission mapping:
Role
RESIDENT
GROUP_ADMIN
COMMITTEE
BOARD
ADMIN
AGENT
MANAGER
ASSOCIATE
Key insight: Only ADMIN and MANAGER roles can manage users (users: true).

## 5. ADMIN API ROUTES FOR USER MANAGEMENT

Users API:
Route Method Purpose
/api/users GET List users with pagination, search, role filter
/api/users POST Create new user (admin only)
/api/users/[id] GET Get single user with all relations
/api/users/[id] PATCH Update user fields + seat platformAddress
/api/users/[id] DELETE Delete user
/api/users/[id]/books (GET) User books
Invitations API:
Route Method Purpose
/api/invitations GET List all invitations for tenant
/api/invitations POST Create invitation + send email
/api/invitations/[id] DELETE Revoke invitation
/api/invitations/accept (POST) Accept invitation
/api/invitations/validate (GET) Validate invitation token
Other Admin API routes:
Route
/api/admin/maintenance-stats
/api/admin/board-members
/api/admin/settings/page-flags
/api/admin/platform/tenants
/api/admin/platform/tenants/[id]
/api/admin/platform/assist
/api/admin/platform/assist/[id]
API Pattern: All admin routes use:

1. withTenant() for tenant isolation (reads x-tenant-id / x-tenant-slug headers)
2. getSessionAndRole(request) or requirePermission() for auth
3. Drizzle ORM for all database queries
4. maxDuration = 8 (Vercel serverless function limit)
5. NextResponse.json() for responses
6. COMPONENT PATTERNS (Admin/User Management)
   Component Hierarchy:
   UsersListSection (top-level container)
   ├── Search bar, role/type filters, invite button
   ├── Pending invitations section
   ├── UserTable
   │ ├── UserRow (expandable, inline role dropdown, status toggle, delete)
   │ └── UserEditRow (expanded inline form - name, email, phone, slug, interests, seat)
   └── Modals:
   ├── InviteModal
   ├── DeleteUserModal
   ├── SuspendUserModal
   ├── AllocateSeatModal
   └── RemoveSeatModal
   Patterns observed:

- All admin components use 'use client' directive
- Use useTranslation('admin') for i18n
- ModalOverlay from @shared/ui for all modals
- ErrorBoundary wrapping from @shared/ui
- useUsersData() custom hook manages all state (search, filter, pagination)
- Inline editing via UserEditRow (expandable row, not a separate page)
- Role changes happen via inline <select> in UserRow
- All mutations go through fetch() API calls, no tRPC
- toast.success/error from sonner for user feedback
- Breadcrumbs from @shared/ui for navigation
Modal pattern (consistent across all modals):
<ModalOverlay onClose={onClose}>
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-xl font-bold">Title</h2>
    <button onClick={onClose}><X className="w-5 h-5" /></button>
  </div>
  {/* form content */}
  <div className="flex gap-4 mt-6">
    <button onClick={onClose}>Cancel</button>
    <button onClick={onConfirm}>Confirm</button>
  </div>
</ModalOverlay>

## 7. EXISTING SUSPENSION-RELATED CODE

Current suspension implementation is minimal:

- The SuspendUserModal exists but just toggles isActive: false on the user record
- Current suspension handler in UsersListSection.tsx:
  const handleSuspend = async () => {
  await fetch(`/api/users/${suspendUser.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ residentType: 'SUSPENDED', isActive: 'false' }),
  });
  };
- No integration with the platformSuspension table -- the table exists in the schema but no code uses it yet
- The SUSPENDED enum value exists in ResidentType but user model doesn't have a residentType field (the PATCH handler tries to update it but it's not a column on the user table)
- Filter by "Suspended" type in the UI uses resolveType() which checks profile occupant type, not suspension status

## 8. RELEVANT TYPESCRIPT TYPES/INTERFACES

From /home/ubuntupunk/Projects/soralia-village/src/entities/user/model/types.ts:
interface PropertyInfo { id, street, unit, platformAddress? }
interface PremiumSeat { id, platformAddress, portfolioName, tier, isActive }
interface AdminUserProfile { occupantType, residencyType, property: PropertyInfo }
interface AdminUser { id, name, email, phone, role, isActive, isPublic, showEmail, showPhone, profileSlug, interests, isPlatformAdmin?, standardSeats, soloSeats, premiumSeat, profiles }
interface Invitation { id, email, name, street, unit, residentType, status }
interface SeatInfo { label, labelClass, address }
interface InviteFormData { email, name, street, unit, residentType, role }
interface AllocateSeatFormData { platformAddress, soloSeatType, portfolioName }
const roleOptions = ['RESIDENT', 'BOARD', 'ADMIN', 'COMMITTEE'];
const PAGE_SIZE = 20;
From /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/model/types.ts:
interface Property { id, tenantId, platformAddress, street, unit, ... }
interface Household { id, tenantId, propertyId, occupancyType, status, ... }
interface StandardSeat { id, userId, propertyId, isPrimaryOwner, platformAddress, ... }
interface Profile { id, householdId, displayName, profileAddress, status, occupantType, residencyType, ... }
interface SoloSeat { id, userId, platformAddress, propertyId, seatType, ... }
From /home/ubuntupunk/Projects/soralia-village/src/entities/admin/model/types.ts:
interface TenantFormData { name, slug, customDomain, ... }
interface TenantBrandingFormProps { ... }
interface TenantFeaturesFormProps { ... }
type FeatureAccessLevel = 'allowed' | 'upgrade' | 'locked';
type FeatureStatus = 'enabled' | 'disabled' | 'locked' | 'tier-allowed';
From /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/permissions.ts:
type Role = keyof typeof ROLES; // 'RESIDENT' | 'GROUP_ADMIN' | 'COMMITTEE' | 'BOARD' | 'ADMIN' | 'AGENT' | 'MANAGER' | 'ASSOCIATE'
interface Permission { admin, users, households, requests, content, groups, groupsOwn, contentOwn, events, bookings, directory, messages, settings, announcements }
From /home/ubuntupunk/Projects/soralia-village/src/shared/lib/constants.ts:
const ROLES = { RESIDENT, GROUP_ADMIN, COMMITTEE, BOARD, ADMIN, AGENT, MANAGER, ASSOCIATE };
const RESIDENT_TYPES = { OWNER, RENTER };
From /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/types.ts:
interface WidgetManifest { id, version, name, description, author, icon, category, component, featureFlag?, premium?, permissions?, defaultSize, minSize?, maxSize?, spaces }

## 9. ADMIN LAYOUT / NAVIGATION SUMMARY

Navigation hierarchy:
/app/(tenant)/dashboard/layout.tsx <-- Dashboard layout with SpaceLauncher sidebar
├── /app/(tenant)/dashboard/admin/layout.tsx <-- Empty pass-through
│ └── /app/(tenant)/dashboard/admin/[domain]/page.tsx <-- Dynamic admin pages
│ └── For 'users' domain: widgets + UsersListSection
│ └── For other domains: widgets only
Admin space rendering: The admin space appears in the SpaceLauncher sidebar, gated by minimumRole: 'admin' in the space definition. The AdminSubLauncher renders a grid of domain cards (Users, Maintenance, Content, etc.) on the admin overview page.
Widget rendering: Widgets are resolved by ID through AdminWidgetRenderer.tsx which has a switch statement mapping widget IDs to React components. The WidgetRenderer from dashboard does a similar thing at a higher level.

## KEY FINDINGS SUMMARY

1. platformSuspension model EXISTS in both Prisma schema and Drizzle schema, but is never used in any application code

2. Current "suspend" just flips isActive: false on the user -- no suspension record is created

3. The user model has no residentType field -- the PATCH handler tries to set it but it doesn't exist

4. Only ADMIN and MANAGER roles have users: true permission (BOARD does NOT)

5. The admin users page is a client-side, inline-editable table with modals, using fetch() for all API calls

6. Drizzle ORM is used for all database queries (not Prisma client directly)

7. Helper functions resolveSeatInfo, resolveAddress, resolveType in resolve-user-helpers.ts handle seat/property display logic

8. The data hook useUsers-data.ts manages state and fetches from /api/users and /api/invitations

9. API routes use withTenant() for tenant isolation and custom getSessionAndRole() for auth

10. Modal pattern is consistent: ModalOverlay + title with X button + form + Cancel/Confirm buttons
