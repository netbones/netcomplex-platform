# NetComplex / Soralia Village — Full Architecture Summary

## 1. Tech Stack

Layer Technology
Framework Next.js 16 (App Router)
Language TypeScript 6 (strict mode)
Database PostgreSQL 17 (Supabase)
Schema/ORM Prisma 5 (source of truth) + Drizzle ORM (queries)
Auth Better Auth 1.5
Real-time Supabase Realtime
API Layer tRPC v11 (internal) + OpenAPI (external)
State TanStack Query v5 (server) + Zustand v5 (client)
Forms React Hook Form + Zod
Styling Tailwind CSS v3
Feature Flags Vercel Flags + Statsig
Payments Paystack (via UCP/AP2)
Email Resend
Logging Pino
Hosting Vercel
Package Manager pnpm 11
Editor TipTap

## 2. Multi-Tenant Architecture

2.1 Conceptual Model — Two Planes
The platform separates traffic into two distinct planes:
Control Plane (Platform) Data Plane (Tenants)
app.netbones.co.za \*.netbones.co.za / custom domains

Marketing, signup, Resident dashboard, directory,
tenant CRUD, billing, chat, bookings, maintenance,
super-admin tools surveys, events, content, etc.

## 2.2 Tenant Resolution Flow

### Step 1 — Middleware (src/middleware.ts):

- Reads Host header from the incoming request
- Platform domain (app.netbones.co.za): Sets x-plane: platform, no tenant headers
- Localhost: Sets x-plane: tenant, x-tenant-slug: soralia (default for dev)
- Tenant domains (\*.netbones.co.za, custom domains): Sets x-plane: tenant, derives slug from subdomain or custom domain lookup

### Step 2 — Server-side resolution (src/entities/tenant/api/base.ts):

- resolveTenantFromRequestHeaders(headers) uses a 5-step cascade:

1. x-tenant-id header (from cache or direct call)
2. Host → getTenantByDomain() (custom domains like soralia.org)
3. x-tenant-slug → getTenantBySlug() (subdomain matches slug)
4. \*.netbones.co.za wildcard parsing with SUBDOMAIN_ALIASES (e.g., solaris → solaris-heights)
5. LOCAL_TENANT_SLUG env var fallback for development

### Step 3 — API enforcement (src/entities/tenant/api/with-tenant.ts):

- withTenant() — Called in API route handlers; resolves tenant and cross-checks session user's tenantId against resolved tenant (throws TenantMismatchError if mismatch)
- withTenantOptional() — Non-throwing variant for routes where tenant is optional
- All tenant-scoped DB queries use eq(table.tenantId, tenantId) filters

## 2.3 Tenant Isolation Strategy

Tenant isolation is application-layer (not RLS):

1. Middleware sets the tenant context via headers
2. withTenant() enforces tenant resolution in every API route
3. Drizzle queries all filter by tenantId using tenantQueries helpers
4. DB schema design: Every domain model has a required tenantId field with @@index([tenantId])

RLS (Row-Level Security) — Dormant/Staged:

- RLS migrations exist (prisma/migrations/20260604000000_add_rls_policies/) covering 18 tables
- Uses a separate app_user DB role that is activated only inside runWithRLS() transactions
- DATABASE_URL still uses the owner role (bypasses RLS) — RLS is dormant until runWithRLS() is called
- Current status: Stage A (Dormant) — policies exist but no production code path uses app_user

## 3. All Services and Their Relationships

### 3.1 Entity Modules (src/entities/)

Each entity is an FSD slice with its own API, model, schema, UI, etc.:
Entity Purpose Key Tables
tenant Multi-tenant core — resolution, branding, feature gates Tenant, TenantModule, PlatformModule, Setting
user User profiles, roles, preferences user, Profile
booking Facility reservations Booking
maintenance Maintenance requests & tracking MaintenanceRequest, MaintenanceTeam, ServiceProvider
event Community events & RSVPs Event, EventAttendee
chat Direct/group messaging Conversation, Message, ConversationParticipant
content CMS articles, pages, announcements Content, ContentLike, Announcement
survey Resident surveys & responses Survey, Question, Response, SurveySection
directory Resident directory Profile, Household, Property
group Resident groups Group, GroupMember, GroupMembershipRequest
merit Community merits & recognition CommunityMerit
dwallet Digital wallet for community currency DWallet, WalletTransaction, PayoutRequest
dispute Dispute resolution DisputeCase, DisputeEvent, DisputeMessage, DisputeEvidence
marketplace Property listings & agent platform PropertyListing, AgentProfile, AgentAccess
agent Real estate agent features AgentProfile, AgentToken, AgentAccess
access Access control & delegations ResidentDelegation, DelegationAction
education Educational content / courses (part of content ecosystem)
admin Tenant-level admin (uses all entity tables)
widget Dashboard widget definitions DashboardLayout (user JSON field)
service Community service providers ServiceProvider, CommunityServiceListing, CommunityServiceInquiry
setup Tenant onboarding wizard TenantSetup, SetupMission, SetupSetting
delegation Resident access delegation ResidentDelegation, DelegationAction

### 3.2 Feature Modules (src/features/)

Business feature implementations that compose entities:

- admin — Admin dashboards and commands
- ai-provider — AI capabilities (pooled across tenants)
- announcements — Create/manage announcements
- auth — Authentication flows (login, signup, password reset, OTP)
- billing — Tenant billing (subscriptions, invoices)
- booking — Facility booking UI/flow
- chat — Real-time messaging UI
- content — CMS editing and publishing
- dashboard — Tenant dashboard widgets
- directory — Resident directory search
- dispute — Dispute resolution workflow UI
- events — Event management
- gate — Feature gating system
- i18n — Internationalization (en, af, xh, zu)
- maintenance — Maintenance request flow
- marketing — Marketing pages
- marketplace — Property marketplace
- platform — Platform control plane features
- pricing — Pricing pages
- provider-billing — Provider billing (invoicing)
- provider-registration — Provider onboarding
- service — Community services
- setup — Tenant setup wizard
- support — Community support (chips/kudos)
- survey-builder — Survey creation tool

### 3.3 Infrastructure Services (src/shared/api/)

Cross-cutting services available via @api/server:
Service File
DB db.ts
Auth auth.ts
Supabase supabase.ts
tRPC trpc/server.ts
Events events/emitter.ts
Email email/resend.ts
Storage storage.ts
Revalidation revalidation.ts
Rate Limit rate-limit.ts
Audit Log audit-log.ts
Address Service address-service.ts
Handle Service handle-service.ts
dto/ dto/
API Response api-response.ts
Envelope envelope.ts

## 4. Database Schema (Tenant-Related Tables)

### Core Tenant Model

The Tenant model (prisma/schema/tenant.prisma) has ~30 fields including:

- id, name, slug (unique), customDomain (unique)
- Branding: primaryColor, accentColor, secondaryColor, logoUrl, faviconUrl, fontFamily, customCss
- Configuration: active, subscriptionTier, tier (enum: STANDARD, PREMIUM, etc.), featureFlags (JSON), modules (JSON)
- Limits: maxPages, pageCount
- Owner: ownerId → user
- Auditing: createdAt, updatedAt

### Tenant Relationships

Every domain table has a tenantId field with:
model <Model> {
tenantId String
Tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
@@index([tenantId])
}
The tenant back-links array in the Tenant model spans all 70+ related models across 4 batches (A, B, C, D).
Tenant Configuration Tables

Table Purpose
PlatformModule Registry of available modules (key, label, minTier)
TenantModule Per-tenant feature module toggles (tenantId, moduleKey, enabled, config)
Setting Key-value settings per tenant (tenantId, key, value)
TenantSetup Onboarding progress (completion %, completed sections, launch date)
SetupMission Individual setup steps per tenant
SetupSetting Setup-specific configuration
SubscriptionTier Tier definitions (name, price, limits)
TenantSubscription Active subscriptions
TenantPayment Payment records
TenantInvoice Invoice records
TenantAiUsage AI usage metering
Seat Models (Resident Access)

Table Purpose
StandardSeat Property-linked owner/resident seats
PremiumSeat Agent/landlord premium seats
SoloSeat Independent resident seats
PropertyPremiumSeat Join table linking properties to premium seats

## 5. API Layer

### 5.1 Internal API — tRPC

Server setup (src/shared/api/trpc/server.ts):

- 6 procedure tiers with increasing privilege:
- publicProcedure — No auth required
- protectedProcedure — Session check only
- tenantProcedure — Session + tenant membership
- privilegedProcedure — Session + tenant + role (ADMIN/BOARD/COMMITTEE) + suspension check
- adminProcedure — Session + tenant + role (ADMIN/BOARD only)
- agentProcedure — Session + tenant + role (AGENT/ADMIN/BOARD)
  Context includes: session, db, userId, role, tenantId, tenantSlug, organizationId
  23 routers registered in appRouter (src/server/routers/index.ts):
  identity, competitions, content, notifications, resources, maintenance, chat, surveys, events, bookings, disputes, dwallet, marketplace, groups, merits, settings, achievements, invitations, agents, delegations, education, households, providers, platform
  Client (src/shared/api/trpc/client.ts):
- Uses httpBatchLink pointing to /api/trpc
- SuperJSON transformer for rich data types
- Bearer token from Better Auth session

### 5.2 External API — OpenAPI

- Auto-generated from tRPC procedures via @trpc/openapi v11
- Generator at src/server/openapi/generator.ts
- Output: public/openapi.json
- Validated via redocly lint in CI
- ~24 procedures carry .meta({ openapi }) declarations for external consumption
  5.3 REST API Routes (src/app/api/)
  54 route directories coexist alongside tRPC for legacy/utility endpoints:
  Prefix
  /api/auth/_
  /api/trpc/_
  /api/v1/public/_
  /api/v1/tenant/_
  /api/v1/platform/_
  /api/v1/system/_
  /api/webhooks/_
  /api/admin/_
  /api/tenants/_
  /api/tenant/_
  /api/upload/_
  /api/chat/_, /api/messages/_
  /api/bookings/_, /api/events/_, /api/maintenance/_, etc.

### 5.4 API Governance (API.md)

- Response envelope: All tRPC procedures return {success, data, meta}
- Canonical error codes: AUTH_REQUIRED, FORBIDDEN, TENANT_REQUIRED, VALIDATION_ERROR, NOT_FOUND, RATE_LIMITED, FEATURE_DISABLED, SUSPENDED_USER, etc.
- DTO layer: 13 files in src/server/dto/ map database rows to API contracts
- Classification tags: Every procedure has JSDoc @public, @tenant, or @privileged
- Authorization chain: Session → tenant membership → role → suspension check → feature gate (5-step)

## 6. Authentication Flow (Better Auth)

### 6.1 Better Auth Configuration (src/shared/api/auth.ts)

Plugins enabled:

- emailAndPassword — Email/password with email verification required
- twoFactor — TOTP 2FA
- organization — Better Auth org support
- bearer — Bearer token authentication
- passkey — WebAuthn passkeys
- emailOTP — 6-digit OTP for password reset and verification
- admin — Admin user capability (hardcoded admin user ID)
- validator — Zod schema validation for auth endpoints
  User additional fields:
- tenantId (string, input allowed) — Set during signup via x-tenant-slug header
- dashboardLayout (string, managed by app)
- profileSlug (string, auto-generated)
- role (string, managed by admins)
  Cross-subdomain cookies:
- Enabled for .netbones.co.za so sessions work across tenant subdomains
  Database hooks:
- user.create.before: Resolves tenantId from slug to actual ID before user creation
  Email flows:
- Verification email (on signup/sign-in if unverified)
- Password reset OTP (via emailOTP plugin)
- Security alert (on existing user sign-up attempt)
- Welcome email (on successful signup)

### 6.2 Auth Client (src/shared/api/auth-client.ts)

Client-side auth using Better Auth's vanilla JS client, wrapped for React.

### 6.3 tRPC Auth Integration

The createContext function in trpc/server.ts calls auth.api.getSession() on every request, populates userId, role, tenantId, and tenantSlug into the tRPC context. Procedure tiers then enforce different levels of access.

## 7. Real-Time Services (Supabase Realtime)

Configuration (supabase/config.toml):

- [realtime] enabled = true
- Port 54321 for the API
  Usage:
- Real-time subscriptions for Message and Conversation tables (chat)
- Client connects via @supabase/supabase-js (src/shared/api/supabase.ts)
- Anon key used for client-side subscriptions (RLS currently dormant)
  Revalidation also uses Next.js ISR (revalidatePath, unstable_cache tags) for cache invalidation on data mutations.

## 8. Service Boundaries & Bounded Contexts

The project uses Feature-Sliced Design (FSD) (ADR-004) with these layers:
src/
├── app/ # Next.js pages/routes (route groups)
├── entities/ # Domain models & business logic (22 slices)
├── features/ # Feature-specific UI + logic (25 features)
├── widgets/ # Reusable composite widgets (9 widget groups)
├── page-modules/ # Page-level compositions
├── shared/ # Shared: api, lib, ui, declarations
├── processes/ # Business workflows
├── server/ # tRPC routers, DTOs, OpenAPI gen, payments
├── components/ # Legacy/admin components
├── db/ # Drizzle schema (auto-generated from Prisma)
└── middleware.ts # Multi-tenant middleware

## Key Bounded Contexts:

### Context Scope

Platform Control Tenant lifecycle, platform admin, billing
Tenant Identity Auth, user management, tenant resolution
Communication Chat, messaging, notifications, announcements
Property & Housing Properties, households, profiles, directory
Maintenance Work orders, teams, providers, routing
Events & Bookings Facility reservations, community events
Content & CMS Articles, pages, announcements, resources
Commerce Marketplace, agent platform, community services
Finance dWallet, merits, billing, subscriptions, payments
Governance Surveys, disputes, education, achievements
Engagement Groups, competitions, merits

### FSD Enforcement:

- Steiger — Architectural layer boundary checks (pre-commit + CI)
- ESLint — Deep import restriction rules (no-restricted-imports)
- Dependency Cruiser — Visual dependency graphs (fsd:graph scripts)

## 9. Directory Structure (Service Organization)

soralia-village/
├── prisma/
│ ├── schema/
│ │ ├── schema.prisma # Main schema (users, domain models, auth tables)
│ │ └── tenant.prisma # Tenant model + back-links
│ ├── migrations/ # Prisma migration history
│ ├── seed.ts # Seed script
│ └── seed/ # Seed data files
│
├── drizzle/ # Drizzle migration output
├── drizzle.config.ts # Drizzle kit config (schema from src/db/schema/)
│
├── src/
│ ├── app/ # Next.js App Router
│ │ ├── (auth)/ # Login, register, forgot-password
│ │ ├── (dashboard)/ # Dashboard layout
│ │ ├── (platform)/ # Platform control plane (app.netbones.co.za)
│ │ ├── (tenant)/ # Tenant data plane
│ │ ├── [lng]/ # i18n locale routing
│ │ ├── api/ # REST API routes (54 directories)
│ │ │ ├── v1/public/ # Public API
│ │ │ ├── v1/tenant/ # Tenant-scoped API
│ │ │ ├── v1/platform/ # Platform admin API
│ │ │ ├── trash/ # tRPC handler
│ │ │ ├── webhooks/ # External webhooks
│ │ │ └── auth/ # Better Auth handler
│ │ ├── layout.tsx # Root layout (tenant-aware)
│ │ └── providers.tsx # Client providers (tRPC, TanStack Query, Toaster)
│ │
│ ├── middleware.ts # Multi-tenant host-based routing
│ ├── middleware/ # Middleware tests
│ │
│ ├── entities/ # FSD Entities (22 domain slices)
│ │ ├── tenant/ # Core tenant module
│ │ │ ├── api/ # Tenant resolution, with-tenant, feature gates
│ │ │ │ ├── base.ts # resolveTenantFromRequestHeaders, CRUD
│ │ │ │ ├── with-tenant.ts # API route enforcement
│ │ │ │ ├── gate/ # Feature gating (canAccess, resolveGateContext)
│ │ │ │ ├── flags/ # Feature flags (platform, statsig, services config)
│ │ │ │ └── context.tsx # Zustand store for tenant state
│ │ │ ├── lib/ # Modules, navigation config, registry
│ │ │ ├── model/ # Tenant types
│ │ │ ├── ui/ # TenantProvider, TenantStyles
│ │ │ ├── index.ts # Client barrel
│ │ │ └── index.server.ts # Server-only barrel
│ │ ├── user/ # User profiles, roles
│ │ ├── booking/ # Facility bookings
│ │ ├── maintenance/ # Maintenance requests
│ │ ├── chat/ # Conversations, messages
│ │ ├── content/ # CMS articles
│ │ ├── event/ # Events & RSVPs
│ │ ├── survey/ # Surveys & responses
│ │ ├── directory/ # Resident directory
│ │ ├── group/ # Resident groups
│ │ ├── merit/ # Community merits
│ │ ├── dwallet/ # Digital wallet
│ │ ├── dispute/ # Dispute resolution
│ │ ├── marketplace/ # Property listings
│ │ ├── service/ # Community services
│ │ ├── agent/ # Real estate agents
│ │ ├── access/ # Access control
│ │ ├── education/ # Educational content
│ │ ├── admin/ # Tenant admin
│ │ ├── widget/ # Dashboard widgets
│ │ ├── setup/ # Tenant onboarding
│ │ └── delegation/ # Resident delegations
│ │
│ ├── features/ # FSD Features (25 feature modules)
│ │ ├── admin/ # Admin commands & panels
│ │ ├── ai-provider/ # AI capabilities
│ │ ├── announcements/ # Announcement management
│ │ ├── auth/ # Auth UI flows
│ │ ├── billing/ # Tenant billing
│ │ ├── booking/ # Booking UI
│ │ ├── chat/ # Chat UI
│ │ ├── content/ # Content editor
│ │ ├── dashboard/ # Dashboard widgets
│ │ ├── directory/ # Directory search
│ │ ├── dispute/ # Dispute UI
│ │ ├── events/ # Event management
│ │ ├── gate/ # Feature gates
│ │ ├── i18n/ # Internationalization
│ │ ├── maintenance/ # Maintenance request UI
│ │ ├── marketing/ # Marketing pages
│ │ ├── marketplace/ # Property marketplace
│ │ ├── platform/ # Platform control features
│ │ ├── pricing/ # Pricing page
│ │ ├── provider-billing/ # Provider billing
│ │ ├── provider-registration/ # Provider onboarding
│ │ ├── service/ # Community services UI
│ │ ├── setup/ # Tenant setup wizard
│ │ ├── support/ # Community support
│ │ └── survey-builder/ # Survey creation
│ │
│ ├── widgets/ # Reusable composite widgets
│ │ ├── admin/ # Admin widgets
│ │ ├── booking/ # Booking widgets
│ │ ├── chat/ # Chat widgets
│ │ ├── dashboard/ # Dashboard widgets
│ │ ├── delegation/ # Delegation widgets
│ │ ├── education/ # Education widgets
│ │ ├── maintenance/ # Maintenance widgets
│ │ ├── service/ # Service widgets
│ │ └── settings/ # Settings widgets
│ │
│ ├── shared/
│ │ ├── api/ # Shared API layer (42+ files)
│ │ │ ├── server/ # @api/server barrel
│ │ │ ├── client/ # @api/client barrel (auth, tRPC)
│ │ │ ├── shared/ # @api/shared barrel
│ │ │ └── trash/ # tRPC setup (server, client, router)
│ │ │ ├── server.ts # tRPC init, procedure builders, context
│ │ │ ├── client.ts # tRPC React client
│ │ │ └── app-router.types.ts
│ │ ├── lib/ # Shared utilities (23 subdirs)
│ │ │ ├── constants/ # App constants
│ │ │ ├── i18n/ # i18n setup
│ │ │ ├── logger/ # Pino logger
│ │ │ ├── tenant-config/ # Tenant config factory
│ │ │ ├── types/ # Shared types
│ │ │ └── permissions.ts # Permission helpers
│ │ ├── ui/ # Shared UI components (shadcn-based)
│ │ └── declarations/ # Type declarations
│ │
│ ├── server/ # Server-side modules
│ │ ├── dto/ # 13 DTO files (API response models)
│ │ ├── openapi/ # OpenAPI generator
│ │ ├── payments/ # Payment processing (Paystack)
│ │ └── routers/ # 23 tRPC routers
│ │ ├── index.ts # AppRouter composition
│ │ ├── maintenance/ # Maintenance sub-routers
│ │ ├── marketplace/ # Marketplace sub-routers
│ │ ├── surveys/ # Survey sub-routers
│ │ ├── chat/ # Chat sub-routers
│ │ └── ... # Individual router files
│ │
│ ├── db/ # Database layer
│ │ ├── schema/ # Drizzle schema (309 files, auto-generated from Prisma)
│ │ │ ├── tenants.ts # Tenant table definition
│ │ │ ├── users.ts # User table definition
│ │ │ ├── ... # ~307 more schema + relation files
│ │ ├── index.ts # DB barrel
│ │ └── **tests**/ # DB tests
│ │
│ ├── components/ # Legacy components (admin only)
│ │ └── admin/ # Admin UI components
│ │
│ ├── page-modules/ # FSD Pages (page compositions)
│ ├── processes/ # FSD Processes (business workflows)
│ ├── test/ # Test utilities
│ └── instrumentation-client.ts # PostHog instrumentation
│
├── docs/
│ ├── STEERING/ # Core architecture docs
│ │ ├── ADR.md # 30+ Architecture Decision Records
│ │ ├── SPEC.md # Technical specification (1292 lines)
│ │ ├── PRD.md # Product requirements
│ │ ├── API.md # API governance standard (1025 lines)
│ │ ├── tRPC.md # tRPC best practices guide
│ │ ├── RLS.md # Row-Level Security runbook
│ │ ├── FSD.md # Feature-sliced design guide
│ │ ├── TDD.md # Test-driven development workflow
│ │ ├── GUIDE.md # Development guides
│ │ └── UBIQUITOUS_LANGUAGE.md # Domain language dictionary
│ ├── architecture/ # Architecture deep-dives (26 files)
│ │ ├── NETCOMPLEX_ARCHITECTURE.md # High-level platform architecture
│ │ ├── IDENTITY_MODEL.md # Identity & routing
│ │ ├── PROPERTY_HOUSEHOLD_MODEL.md # Property model
│ │ ├── TIER_MODEL.md # Subscription tiers
│ │ ├── REG_FLOW.md # Registration flow
│ │ └── ... # Various ADR discussions
│ └── ... # Audits, reports, discussions
│
├── .planning/ # Project planning & phase management
│ ├── ROADMAP.md # Milestone & phase roadmaps
│ ├── MILESTONES.md # Milestone definitions (M0-M7)
│ ├── STATE.md # Current state tracking
│ ├── phases/ # Phase plans
│ ├── PLANS/ # Detailed plans
│ ├── retros/ # Retrospectives
│ └── templates/ # Planning templates
│
├── supabase/
│ └── config.toml # Supabase local dev config
│
├── scripts/ # Utility scripts (seeds, migration helpers)
├── e2e/ # Playwright E2E tests
├── mail/ # Email templates
└── public/ # Static assets

## Key Architectural Patterns Summary

1.  Single shared database with tenantId column on every domain table — application-layer isolation
2.  Host-based routing via Next.js middleware maps domains to tenants
3.  Dual ORM: Prisma for schema management, Drizzle for runtime queries (edge-compatible)
4.  Dual API surface: tRPC (internal, type-safe) + OpenAPI (external, versioned)
5.  Feature gating via FeatureGate layer with tier/module/flag checks
6.  ISR + cache tags for performance (Next.js unstable_cache, revalidatePath)
7.  RLS staged as defense-in-depth (currently dormant, being rolled out incrementally)
8.  Events for decoupled in-process communication (domain event emitter)
9.  FSD architecture with Steiger/ESLint enforcement of layer boundaries
10. Better Auth as the central auth provider with cross-subdomain sessions
