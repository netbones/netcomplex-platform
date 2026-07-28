---
title: Soralia Village - App Structure Architecture
status: current
reviewed: 2026-07-28
tags: [steering, governance]
audience: all
---

# Soralia Village - App Structure Architecture

## Overview

This document explains the structure of the Next.js App Router in `src/app/`, including route groups, their purpose, and why certain architectural decisions were made.

---

## Route Groups

### 1. `(tenant)` - Tenant Admin Routes

**Path:** `src/app/(tenant)/`

**Purpose:** Multi-tenant administration for community managers

**Pages:**

- `/admin` - Admin dashboard with widgets
- `/admin/users` - User management
- `/admin/content` - CMS content management
- `/admin/content/new` - Create content
- `/admin/content/[id]` - Edit content
- `/admin/groups` - Group management
- `/admin/groups/[id]` - Edit group
- `/admin/groups/new` - Create group
- `/admin/requests` - Maintenance requests
- `/admin/requests/analytics` - Request analytics
- `/admin/surveys` - Survey management
- `/admin/surveys/new` - Create survey
- `/admin/categories` - Content categories
- `/admin/external-surveys` - External surveys

**Layout:** Uses `src/app/(tenant)/layout.tsx` which includes:

- Header + Footer
- TenantProvider (tenant context)
- Providers (auth, i18n, query)
- Toaster (notifications)

**Why separate?** Admin pages have different UI (management-focused) and require authentication/authorization. Keeping them in a route group prevents route conflicts with public pages.

---

### 2. `(platform)` - Platform-Level Routes

**Path:** `src/app/(platform)/`

**Purpose:** NetComplex platform administration (super-admin level)

**Pages:**

- `/login` - Platform login
- `/signup` - Platform signup
- `/home` - Platform landing
- `/pricing` - Pricing page
- `/admin/platform` - Platform admin
- `/admin/platform/new` - Create new tenant
- `/admin/platform/[id]/edit` - Edit tenant
- `/admin/platform/[id]/features` - Feature management

**Layout:** Uses `src/app/(platform)/layout.tsx` - minimal, no header/footer (marketing-style pages)

**Why separate?** This is for the platform owner to manage multiple tenant communities. Completely different context from tenant pages.

---

### 3. `(auth)` - Auth Routes (no custom layout)

**Path:** `src/app/(auth)/`

**Purpose:** Tenant-level authentication

**Pages:**

- `/sign-in` - Sign in
- `/sign-up` - Sign up
- `/forgot-password` - Password reset

**No layout file** - Uses root layout from `src/app/layout.tsx`

**Why no group layout?** The `(auth)` route group doesn't need a custom layout - it falls through to the root layout which includes Header/Footer (appropriate for auth pages in this community app).

---

### 4. `[lng]` - Internationalization Wrapper

**Path:** `src/app/[lng]/`

**Purpose:** Language-specific routing for platform pages

**Layout:** `src/app/[lng]/layout.tsx` - Provides TenantProvider with tenant-specific theming

**Pages:** Wraps platform pages with language prefix (e.g., `/en/platform/home`)

---

## Root-Level Pages (No Route Group)

**Path:** `src/app/` (directly)

These are the public community pages:

| Directory          | Purpose                        |
| ------------------ | ------------------------------ |
| `page.tsx`         | Home page (community landing)  |
| `dashboard/`       | User dashboard                 |
| `directory/`       | Resident & service directory   |
| `services/`        | Community services marketplace |
| `conservation/`    | Conservation initiatives       |
| `bookings/`        | Facility bookings              |
| `maintenance/`     | Maintenance requests           |
| `messages/`        | Messaging/chat                 |
| `news/`            | News & announcements           |
| `groups/`          | Community groups               |
| `interest/`        | Interest-based groups          |
| `notifications/`   | User notifications             |
| `resources/`       | Educational resources          |
| `settings/`        | User settings                  |
| `member/`          | Member profiles                |
| `resident/`        | Resident directory             |
| `unit/`            | Unit/household details         |
| `competition/`     | Competitions                   |
| `guidelines/`      | Community guidelines           |
| `proudly-soralia/` | Proudly Soralia showcase       |
| `privacy/`         | Privacy policy                 |
| `terms/`           | Terms of service               |

**Layout:** Uses `src/app/layout.tsx` which includes:

- Header + Footer
- Providers
- Toaster

**Why at root?** These are the main community pages. They share a common layout (Header/Footer) and don't need the tenant admin overhead.

---

## API Routes

**Path:** `src/app/api/`

```
api/
├── admin/          # Admin operations
├── auth/           # Authentication
├── bookings/       # Facility bookings
├── community-services/  # Service marketplace
├── conservation/   # Conservation initiatives
├── content/        # CMS content
├── conversations/  # Chat/messaging
├── dashboard/      # Dashboard data
├── groups/         # Group management
├── households/     # Household data
├── maintenance/   # Maintenance requests
├── messages/       # Messages
├── notifications/ # Notifications
├── users/          # User management
└── ...             # Other APIs
```

---

## Layout Hierarchy

```
Root Layout (layout.tsx)
├── Header
├── main
│   ├── (tenant)/      → (tenant)/layout.tsx
│   │   └── admin/*
│   ├── (platform)/    → (platform)/layout.tsx
│   │   └── *
│   ├── (auth)/        → uses root layout
│   │   └── *
│   └── root pages     → uses root layout
│       └── *
└── Footer
```

**Important:** `(tenant)` has its own layout because it needs different wrapping (TenantProvider, different header potentially). The `(platform)` route group also has its own layout because it's a completely different context.

---

## Key Architectural Decisions

### 1. Why `(tenant)` instead of `/tenant`?

Route groups don't appear in the URL. This keeps admin URLs clean (`/admin` instead of `/tenant/admin`).

### 2. Why are some pages at root instead of in `(tenant)`?

During the repo reorganization, there was a conflict with route groups. Pages like `directory`, `services`, `conservation` were kept at root to avoid conflicts. They use the root layout which includes Header/Footer.

### 3. Two admin systems?

- `(tenant)/admin` - Community manager admin (manage users, content, groups within one community)
- `(platform)/admin` - Platform admin (manage multiple communities/tenants)

### 4. No middleware.ts file?

Tenant resolution happens via:

- API routes use `withTenant()` from `@/lib/tenant/with-tenant`
- Layouts use `getCurrentTenant()` from `@/lib/tenant`

---

## Recommended Cleanup (Future)

If you want to standardize the architecture:

1. **Move public pages into `(tenant)/`** - But this changes URLs from `/directory` to `/directory` (no change) or requires a catch-all
2. **Merge layouts** - The `(tenant)` layout could potentially share more with root
3. **Add middleware.ts** - For centralized tenant resolution on every request

---

## Notes

- Route groups use `(...)` syntax - they don't affect URL paths
- `[lng]` is a dynamic segment for i18n (language prefix)
- Each layout can have its own providers, metadata, and UI wrapper
- The root `layout.tsx` is the fallback for pages not wrapped by other layouts
