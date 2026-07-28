---
title: Netcomplex ARCHITECTURE
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

## NetComplex Architecture

This document describes how the NetComplex SaaS platform is structured across:

- The **platform control plane** at `app.netbones.co.za`
- The **tenant data plane** at `*.netbones.co.za` (and custom domains like `soralia.org`, `soralia.com`, `soralia.co.za`)
- The shared database and auth layer

It is a companion to `netcomplex_migration_planv1.md` and focuses on high-level architecture and URL/runtime boundaries.

---

## 1. Conceptual Model

### 1.1 Actors

- **NetComplex Operator**
  - Internal team that manages the platform, tenants, plans, billing, and support.
  - Uses the _platform_ surface at `app.netbones.co.za`.
- **Tenant Owner / Board**
  - The person or committee that owns a specific community (e.g. an HOA).
  - Signs up their community, configures branding, adds board/admin users.
  - Interacts mainly with tenant-scoped admin views under their community domain.
- **Resident / End User**
  - Residents or members of a specific tenant community.
  - Uses the tenant app only (no direct access to the platform control plane).

### 1.2 Planes

- **Control Plane (Platform)**
  - Runs at `app.netbones.co.za`.
  - Responsibilities:
    - Marketing + pricing pages.
    - “Create my community” onboarding flow.
    - Tenant CRUD (create, suspend, delete), plan changes.
    - Feature toggles and tenant-level configuration.
    - Internal super-admin tools (impersonation, health checks, metrics).
- **Data Plane (Tenants)**
  - Runs at:
    - `soralia.netbones.co.za` (Soralia Village – Tenant #1),
    - `<tenant-slug>.netbones.co.za` for other communities,
    - Custom domains like `app.hoa-example.com`.
  - Responsibilities:
    - Everything residents/board use day-to-day (directory, chat, bookings, maintenance, surveys, etc.).
    - All tenant-scoped data, enforced via `tenantId` in the DB and middleware.

NetComplex itself is **not “Tenant 2”**; it is the platform that owns and manages many tenants.

---

## 2. URL & Routing Layout

### 2.1 Domain Mapping

- **Platform**
  - `app.netbones.co.za` → platform control plane.
- **Tenants (shared app)**
  - `<tenant-slug>.netbones.co.za` → tenant data plane for that slug.
  - Custom domains (e.g., `soralia.org`, `soralia.com`, `soralia.co.za`) → resolved to tenant via `Tenant.customDomain`.

### 2.2 Next.js App Structure (Single App)

The same Next.js app can serve both the platform and tenant traffic with host-based routing:

- `src/app/(platform)/...`
  - Routes only valid on `app.netbones.co.za`:
    - `/` – marketing / landing page.
    - `/pricing` – plan overview.
    - `/signup` – "Create your community" wizard.
    - `/login` – NetComplex operator / platform login.
    - `/admin/platform/*` – super-admin UI for managing tenants, features, and branding.
- `src/app/(tenant)/...`
  - Routes valid on tenant hosts (`*.netbones.co.za`, custom domains):
    - `/` – tenant dashboard/home.
    - `/directory`, `/groups`, `/bookings`, `/maintenance`, etc.
    - `/admin` – tenant-level admin (board, HOA admin, etc.).

**Middleware (`src/proxy.ts`)**:

- Reads the `Host` header and:
  - If host is `app.netbones.co.za` → treat request as **platform** (no tenant resolution).
  - Else if host ends with `.netbones.co.za` or matches known tenant domains (`soralia.org`, `soralia.com`, `soralia.co.za`):
    - Resolve tenant by subdomain or custom domain.
    - Set `x-tenant-id` and `x-tenant-slug` headers for downstream use.
    - If resolution fails, return a 404 or “tenant not found” page.

Tenant-facing code must **always use** a helper like `withTenant()` to read these headers and scope queries.

---

## 3. Database & Tenant Model

### 3.1 Single Shared Database

- One PostgreSQL database shared by the platform + all tenants.
- Core tenant metadata lives in the `Tenant` model (see `schema.prisma`):
  - `id`, `name`, `slug`, `customDomain`, branding, subscription tier, feature flags, limits.
- Domain tables are **tenant-scoped** via a required `tenantId`:
  - `Announcement`, `Booking`, `Conversation`, `Message`, `Event`, `Survey`, etc.

### 3.2 Auth Tables and `tenantId`

- `user.tenantId`:
  - **Required** — canonical tenant anchor.
  - Every user belongs to exactly one tenant.
- `account.tenantId`, `session.tenantId`, `verification.tenantId`:
  - Currently **nullable by design** to match Better Auth’s Drizzle adapter behaviour.
  - Multi-tenant enforcement is based on `user.tenantId` and tenant-scoped domain tables.
  - Can be hardened later with Better Auth `databaseHooks` and `NOT NULL` constraints.

### 3.3 Platform vs Tenant Users

There are two main options (decision can be made later, but the architecture supports both):

1. **Single user table, platform admins as a role**
   - Use existing `user` model with a `Role` enum that includes a “platform admin” / “operator” role.
   - Platform admins may be associated with a special “platform tenant” or have `tenantId` that is not used for tenant scoping.
   - Simpler operationally, but mixes platform and tenant identities.
2. **Separate auth for platform**
   - Use a separate Better Auth instance (or separate app) for `netcomplex.netbones.co.za`.
   - Platform accounts are not stored in the tenant `user` table.
   - Stronger isolation, but more infrastructure.

Current repo leans toward **option 1** with `/admin/platform/*` implemented inside the same app.

---

## 4. Tenant Lifecycle via Platform

### 4.1 Tenant Creation Flow (Control Plane)

1. **Prospect visits** `netcomplex.netbones.co.za/signup`.
2. Fills in:
   - Community name.
   - Desired subdomain (e.g. `green-oaks` → `green-oaks.netbones.co.za`).
   - Admin name + email.
   - Plan / tier selection.
3. Platform creates:
   - A new `Tenant` row with slug, branding defaults, and feature flags.
   - An initial `organization` / `member` (if using Better Auth org plugin).
   - An initial admin user or invitation for the tenant owner.
4. Response:
   - Shows a “Your community is created” screen.
   - Sends an email with:
     - The tenant URL (`https://green-oaks.netbones.co.za`).
     - A sign-in or set-password link for the initial admin user.

### 4.2 Tenant Management (Control Plane)

Under `/admin/platform/tenants` and related routes:

- NetComplex operator can:
  - View all tenants and their status (active, trial, suspended).
  - Adjust subscription tiers and feature sets.
  - Update branding (colors, logo).
  - Configure or approve custom domains.
  - Trigger migrations or maintenance tasks per tenant.

Tenant admins **do not** appear here; they manage only their own tenant through tenant-scoped UIs.

---

## 5. Request Flow Summary

### 5.1 Tenant Request

1. User visits `https://soralia.netbones.co.za/dashboard`.
2. Middleware:
   - Parses host, resolves tenant by slug `soralia`.
   - Sets `x-tenant-id`, `x-tenant-slug` headers.
3. Page / API handler:
   - Calls `withTenant()` to read `tenantId`.
   - Uses `tenantId` in all Drizzle queries.
4. Response is fully scoped to that tenant.

### 5.2 Platform Request

1. User visits `https://app.netbones.co.za/admin/platform/tenants`.
2. Middleware:
   - Detects host is the platform domain.
   - Skips tenant resolution (or sets a special flag that this is platform context).
3. Page / API handler:
   - Uses role/permissions to ensure only platform operators can access.
   - Queries the `Tenant` table directly (no tenant scoping).

---

## 6. Future Enhancements

- **Row Level Security (RLS)**
  - Enable RLS on all tenant-scoped tables as a defence-in-depth measure.
  - Policies enforce `tenantId = current_setting('app.tenant_id')` or similar.
- **Per-tenant sharding (far future)**
  - If needed, individual tenants can be moved to dedicated databases while keeping the same logical model.
- **Separate platform app**
  - If complexity grows, split `netcomplex.netbones.co.za` into its own Next.js app, still backed by the same control tables.

This document should be kept in sync with `netcomplex_migration_planv1.md` whenever the platform/tenant boundaries or routing strategy change.
