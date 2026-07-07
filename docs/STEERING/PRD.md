# Netcomplex Platform - PRD

## Project Overview

**Project Name:** Netcomplex  
**Type:** Multi-tenant Community Management Platform  
**Core Functionality:** A coherent multi-tenant platform that enables clients to install and configure modules according to their tier subscription. Each tenant receives a dedicated community portal with authentication, content management, facility booking, maintenance tracking, and real-time communication.  
**Anchor Tenant:** Soralia Village Community Hub (180 homes)

---

## Vision

Netcomplex transforms community management into a modular, tiered SaaS platform:

- **Multi-tenant architecture** with isolated data per tenant
- **Module-based features** - tenants activate features based on subscription tier
- **Scalable** - New tenants onboard quickly with pre-configured module bundles
- **Soralia Village** serves as the anchor tenant, demonstrating full platform capabilities

---

## Product Structure

### Subscription Tiers

Each tier unlocks specific modules, mapped 1:1 to the codebase's canonical
`TierLevel` type.

| Tier           | DB TenantTier | Modules Included                                        | Price Model    |
| -------------- | ------------- | ------------------------------------------------------- | -------------- |
| **Core**       | `STANDARD`    | Directory, Pages, News, Groups, Chat, Resources         | Per-home/month |
| **Foundation** | `PREMIUM`     | Core + Maintenance, Bookings, Marketplace               | Per-home/month |
| **Pro-Max**    | `ENTERPRISE`  | Foundation + Premium Portfolio, Analytics, Agent Access | Per-home/month |

Soralia Village runs as the **anchor tenant** — a tenant designation indicating full
Pro-Max tier access as the reference deployment, not a separate tier.

### Modules

| Module                | Description                               | Tier       |
| --------------------- | ----------------------------------------- | ---------- |
| **Directory**         | Resident listings, search, profiles       | Core       |
| **Pages**             | Static content pages, announcements       | Core       |
| **News**              | Blog, events, announcements               | Core       |
| **Maintenance**       | Request submission, tracking, assignments | Foundation |
| **Bookings**          | Facility reservations, calendar           | Foundation |
| **Groups**            | Interest groups, forums                   | Foundation |
| **Messaging**         | Real-time chat, notifications             | Foundation |
| **Marketplace**       | Services offered by residents             | Foundation |
| **Premium Portfolio** | Multi-property management                 | Pro-Max    |
| **Analytics**         | Usage stats, reports                      | Pro-Max    |
| **Agent Access**      | Real estate agent tools                   | Pro-Max    |

---

## Current State

### Soralia Village (Anchor Tenant)

**Existing Implementation:**

- **Stack:** Next.js 14 (App Router) with React + Turbopack
- **Auth:** Better Auth integrated with SSR handling
- **Database:** Supabase PostgreSQL with Prisma + Drizzle ORM
- **Real-time:** Supabase Realtime prepared for messaging
- **Forms:** React Hook Form + Zod validation
- **Rich Text:** Tiptap WYSIWYG editor
- **Styling:** Tailwind CSS

**Completed Features:**

- Pages: Home, Directory, Services, Resources, Conservation, Interest Groups, Proudly Soralia
- CMS at /admin/content, /admin/groups with Tiptap editor
- Interest Groups: /groups hub, join/leave via API
- Content API: Full CRUD with categories (ANNOUNCEMENT, NEWS, EVENT, BLOG)
- Database models: User, Group, Content, UserGroup with relations
- i18n support: en, af, xh, zu via i18next

**Technical Debt:**

- Single-tenant hardcoded (no tenant abstraction)
- Module system not implemented
- Tier-based feature gating not enforced

---

## User Personas

### Platform-Level Personas

| Persona              | Description                                              |
| -------------------- | -------------------------------------------------------- |
| **Platform Admin**   | Netcomplex superuser, manages tenants, billing           |
| **Tenant Admin**     | Community manager, configures modules, moderates content |
| **Board Member**     | HOA leadership, oversight, reporting                     |
| **Resident**         | Community member, uses directory, submits requests       |
| **Property Owner**   | Legal owner, may have multiple properties                |
| **Occupant**         | Tenant/renter, limited access                            |
| **Service Provider** | Resident offering services via marketplace               |
| **Agent**            | External real estate agent with limited property access  |

### Soralia Village-Specific

| Persona              | Seat Type | Access                                      |
| -------------------- | --------- | ------------------------------------------- |
| Property Owner       | Standard  | Household management, facility booking      |
| Household Occupant   | Profile   | Groups, messaging, limited content          |
| Independent Resident | Solo      | Full platform, personal identity            |
| Premium Investor     | Premium   | Multi-property portfolio, unified dashboard |
| Committee Member     | Solo      | Committee duties, reporting                 |
| Board Member         | Solo      | HOA oversight, platform management          |
| Admin                | Admin     | User management, content moderation         |

---

## Functional Requirements

### 1. Multi-Tenant Architecture

- **Tenant Isolation:** Each tenant's data isolated via tenantId column
- **Tenant Context:** Middleware extracts tenant from subdomain/slug
- **Configuration:** Tenant settings stored in database (features, branding)
- **Onboarding:** New tenant provisioning with tier selection

### 2. Module System

- **Module Registry:** Central registry of available features
- **Feature Flags:** Vercel flags for module enablement per tenant
- **Tier Gating:** API enforces tier requirements
- **Module Config:** Each module has configuration options

### 3. Authentication (Better Auth)

- Email/password registration and login
- Multi-tenant session with tenant context
- Role-based access (Resident, Board, Admin, Platform Admin)
- OAuth ready (Google, Apple)

### 4. Core Modules

#### Directory

- Searchable resident listings
- Profile views with contact info
- Interest-based filtering
- Privacy controls per user

#### Maintenance

- Submit requests with category, priority
- Photo upload
- Status tracking workflow
- Notification on changes

#### Bookings

- Facility reservations (pool, gym, hall)
- Calendar view
- Confirmation/cancellation

#### Groups

- Interest groups with categories
- Join/leave functionality
- Group content creation

#### Messaging

- Real-time chat via Supabase
- Direct and group conversations
- Notification delivery

#### Marketplace

- Services listing
- Inquiry system
- Provider profiles

#### Premium Portfolio (Pro-Max)

- Multi-property dashboard
- Unified tenant view
- Volume pricing display

### 5. Admin Panel

- Tenant management (platform admin)
- Resident management (tenant admin)
- Content moderation
- Module configuration
- Analytics per tenant

---

## Technical Architecture

### Multi-Tenant Strategy

```
┌─────────────────────────────────────────────┐
│              Netcomplex Platform             │
├─────────────────────────────────────────────┤
│  Tenant A (Soralia) │ Tenant B │ Tenant C   │
│  - Directory        │ Module  │ Module     │
│  - Maintenance      │ A, B    │ A only     │
│  - Bookings         │         │            │
│  - Groups           │         │            │
│  - Messaging        │         │            │
└─────────────────────────────────────────────┘
        │              │          │
        ▼              ▼          ▼
   ┌─────────────────────────────────────────┐
   │         Shared Infrastructure            │
   │  - Database (tenant_id isolation)        │
   │  - Auth (tenant context in session)      │
   │  - Feature Flags (per tenant)            │
   │  - Storage (per tenant bucket)           │
   └─────────────────────────────────────────┘
```

### Stack Implementation

| Layer         | Technology              | Notes                    |
| ------------- | ----------------------- | ------------------------ |
| Frontend      | Next.js 14 + React      | App Router, ISR          |
| Styling       | Tailwind CSS            | Design tokens per tenant |
| Auth          | Better Auth             | Multi-tenant sessions    |
| Database      | PostgreSQL (Supabase)   | tenant_id on all tables  |
| ORM           | Prisma + Drizzle        | Edge-compatible queries  |
| Real-time     | Supabase Realtime       | Per-tenant channels      |
| Forms         | React Hook Form + Zod   | Validation               |
| Maps          | Leaflet + OpenStreetMap | Per-tenant markers       |
| Feature Flags | Vercel Flags            | Per-tenant module gating |
| Deploy        | Vercel                  | Multi-tenant preview     |

### Database Schema Changes

Add tenantId to all tables:

```prisma
model User {
  id        String  @id @default(cuid())
  tenantId  String  // Multi-tenant: required
  email     String
  name      String
  role      Role    @default(RESIDENT)
  // ... rest
}

model Tenant {
  id          String   @id @default(cuid())
  slug        String   @unique  // e.g., "soralia"
  name        String
  tier        TenantTier
  isActive    Boolean  @default(true)
  config      Json?    // Feature configuration
  createdAt   DateTime @default(now())
}

enum TenantTier {
  STANDARD
  PREMIUM
  ENTERPRISE
}
```

---

## Implementation Phases

### Phase 1: Platform Foundation (Weeks 1-3)

- [ ] Tenant model and CRUD
- [ ] Middleware tenant extraction
- [ ] Tenant context in API routes
- [ ] Tenant-specific auth sessions
- [ ] Basic tenant configuration

### Phase 2: Module System (Weeks 4-6)

- [ ] Module registry definition
- [ ] Feature flag integration
- [ ] Tier-based gating
- [ ] Module configuration UI

### Phase 3: Migration (Weeks 7-8)

- [ ] Migrate Soralia to tenant model
- [ ] Add tenantId to existing tables
- [ ] Update API routes for tenant context
- [ ] Verify all features work per tenant

### Phase 4: Platform Admin (Weeks 9-10)

- [ ] Tenant provisioning UI
- [ ] Tier management
- [ ] Billing interface placeholder
- [ ] Platform analytics

---

## Acceptance Criteria

### Platform Level

- [ ] Multiple tenants can exist with isolated data
- [ ] Tenant identified by subdomain or path slug
- [ ] Feature flags enable/disable modules per tenant
- [ ] Tier restricts access to premium features

### Soralia Village (Anchor)

- [ ] Existing features work with tenant isolation
- [ ] All current functionality preserved
- [ ] Multi-property view for premium seats
- [ ] Module enablement matches Pro-Max tier (full platform access)

### Technical

- [ ] API routes extract tenant context
- [ ] Auth session includes tenant info
- [ ] Database queries filtered by tenant
- [ ] Storage buckets per tenant

---

## Risks & Mitigations

| Risk                    | Impact   | Mitigation                      |
| ----------------------- | -------- | ------------------------------- |
| Multi-tenant complexity | High     | Phased approach, Soralia first  |
| Query performance       | Medium   | Add indexes on tenant_id        |
| Feature flag explosion  | Medium   | Module registry, cleanup policy |
| Tenant data leakage     | Critical | RLS + tenant_id checks          |

---

## Appendix: Module Comparison

| Feature           | Core | Foundation | Pro-Max |
| ----------------- | ---- | ---------- | ------- |
| Directory         | ✓    | ✓          | ✓       |
| Pages             | ✓    | ✓          | ✓       |
| News/Events       | ✓    | ✓          | ✓       |
| Maintenance       | -    | ✓          | ✓       |
| Bookings          | -    | ✓          | ✓       |
| Groups            | -    | ✓          | ✓       |
| Messaging         | -    | ✓          | ✓       |
| Marketplace       | -    | ✓          | ✓       |
| Analytics         | -    | -          | ✓       |
| Agent Access      | -    | -          | ✓       |
| Premium Portfolio | -    | -          | ✓       |
