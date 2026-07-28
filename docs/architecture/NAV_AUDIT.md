---
title: Navigation System -- Complete Exploration Report
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Navigation System -- Complete Exploration Report

## 1. Complete File List with Full Paths

### Primary Navigation Components

| #   | File Path                          | Role                                                              |
| --- | ---------------------------------- | ----------------------------------------------------------------- |
| 1   | src/shared/ui/Header.tsx           | Main tenant header with desktop nav + burger menu trigger         |
| 2   | src/shared/ui/Footer.tsx           | Main tenant footer with quick-links, services, emergency contacts |
| 3   | src/shared/ui/MobileMenu.tsx       | Slide-down mobile menu for tenant site                            |
| 4   | src/shared/ui/SideDrawer.tsx       | Slide-in side drawer (right) with full nav + admin section        |
| 5   | src/shared/ui/Breadcrumbs.tsx      | Breadcrumb navigation component                                   |
| 6   | src/shared/ui/LanguageSwitcher.tsx | Language selector (used in headers)                               |

### Platform-Level (Multi-Tenant Marketing Site) Components

| #   | File Path                                   | Role                                                             |
| --- | ------------------------------------------- | ---------------------------------------------------------------- |
| 7   | src/features/platform/ui/PlatformHeader.tsx | NetComplex marketing site header (Home/Features/Pricing/About)   |
| 8   | src/features/platform/ui/PlatformFooter.tsx | NetComplex marketing site footer (Product/Company/Legal columns) |

### Auth/Onboarding Navigation Components

| #   | File Path                             | Role                                               |
| --- | ------------------------------------- | -------------------------------------------------- |
| 9   | src/features/auth/ui/SignupHeader.tsx | Step-progress header for signup wizard             |
| 10  | src/features/auth/ui/SignupCTA.tsx    | Back/Continue navigation buttons for signup wizard |

### Sidebar / Dashboard Widgets

| #   | File Path                                     | Role                                                                  |
| --- | --------------------------------------------- | --------------------------------------------------------------------- |
| 11  | src/widgets/dashboard/ui/SidebarWidgetBox.tsx | Dashboard sidebar widget container (not nav -- informational widgets) |

### Navigation Configuration / Constants

| #   | File Path                                       | Role                                                                         |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| 12  | src/shared/lib/constants.ts                     | NAV\*LINKS, PUBLIC_NAV_LINKS, ADMIN_LINKS constant arrays                    |
| 13  | src/entities/tenant/api/settings.ts             | SETTINGS_KEYS including all PAGE\*\_ENABLED keys + CUSTOM_NAV                |
| 14  | src/entities/tenant/api/flags/platform-flags.ts | PlatformPageFlags interface + getPlatformPageFlags() / setPlatformPageFlag() |
| 15  | src/entities/tenant/api/flags/statsig-flags.ts  | Experiment flags (newDashboard, chatV2, etc.) -- currently all false         |
| 16  | src/entities/tenant/api/permissions.ts          | Role-based permission system controlling admin nav visibility                |

### Hooks

| #   | File Path                            | Role                                                                    |
| --- | ------------------------------------ | ----------------------------------------------------------------------- |
| 17  | src/shared/lib/hooks/usePageFlags.ts | Client-side hook fetching /api/flags to get PlatformPageFlags           |
| 18  | src/shared/lib/useContactSettings.ts | Footer contact info hook (emergency/security/maintenance phone numbers) |

### API Routes (Navigation Data)

| #   | File Path                                      | Role                                                            |
| --- | ---------------------------------------------- | --------------------------------------------------------------- |
| 19  | src/app/api/flags/route.ts                     | Public API: returns page flags + experiment flags               |
| 20  | src/app/api/admin/settings/page-flags/route.ts | Admin API: GET/POST page flags (ADMIN role required for writes) |

### Layout Files (Containing Navigation Components)

| #   | File Path                                | Role                                                             |
| --- | ---------------------------------------- | ---------------------------------------------------------------- |
| 21  | src/app/layout.tsx                       | Root layout: wraps all pages with <Header /> + <Footer />        |
| 22  | src/app/(auth)/layout.tsx                | Auth layout: no header/footer (standalone auth pages)            |
| 23  | src/app/(tenant)/layout.tsx              | Tenant admin layout: no header/footer (standalone admin pages)   |
| 24  | src/app/(platform)/layout.tsx            | Platform layout: no header/footer (platform pages add their own) |
| 25  | src/app/(platform)/onboarding/layout.tsx | Onboarding: uses PlatformFooter only, no header                  |
| 26  | src/app/[lng]/layout.tsx                 | i18n root: tenant provider with CSS custom properties            |
| 27  | src/app/[lng]/platform/layout.tsx        | i18n platform: I18nextProvider wrapper                           |

### Admin Configuration UI

| #   | File Path                                      | Role                                                       |
| --- | ---------------------------------------------- | ---------------------------------------------------------- |
| 28  | src/widgets/admin/ui/PageSettingsWidget.tsx    | Admin UI for toggling page visibility flags                |
| 29  | src/features/onboarding/ui/steps/PagesStep.tsx | Onboarding step 3: choose which pages appear in navigation |

### Locale/Translation Files (Navigation Labels)

| #   | File Path                       | Role                                                                                 |
| --- | ------------------------------- | ------------------------------------------------------------------------------------ |
| 30  | public/locales/en/common.json   | Primary: nav._, footer._ keys for tenant navigation                                  |
| 31  | public/locales/en/platform.json | Platform: header.\* keys for marketing site nav                                      |
| 32  | public/locales/en/admin.json    | Admin: users, groups, content, requests, surveys, categories, externalSurveys labels |
| 33  | public/locales/af/messages.json | Afrikaans translations                                                               |
| 34  | public/locales/xh/messages.json | Xhosa translations                                                                   |
| 35  | public/locales/zu/messages.json | Zulu translations                                                                    |
| 36  | src/shared/lib/i18n.ts          | i18next initialization with namespaces                                               |
| 37  | src/shared/lib/i18n-config.ts   | Language config + namespace definitions                                              |

### Test Files

| #   | File Path                                            | Role                                                        |
| --- | ---------------------------------------------------- | ----------------------------------------------------------- |
| 38  | src/test/flags.test.ts                               | Tests for flags API + page-visibility-to-navigation mapping |
| 39  | src/test/ui-components.test.tsx                      | Tests for Breadcrumbs component                             |
| 40  | src/test/sidebar-widget-box.test.ts                  | Tests for sidebar widget data structures                    |
| 41  | src/entities/tenant/api/flags/platform-flags.test.ts | Tests for flag-to-setting-key mapping                       |
| 42  | src/test/platform-flags.test.ts                      | Tests for SETTINGS_KEYS values                              |
| 43  | src/test/constants.test.ts                           | Tests for constants including NAV_LINKS                     |

## 2. Key File Descriptions

**src/shared/ui/Header.tsx**

The primary tenant-facing header. Contains a hardcoded BASE_NAV array of 11 items (home, directory, groups, services, resources, news, maintenance, surveys, competition, conservation, campaign). Uses usePageFlags() to dynamically filter these items based on tenant configuration. Renders desktop nav (`<nav>` with `lg:flex`), a user avatar/profile link, a burger-menu SVG toggle, and passes filtered navItems to MobileMenu. Unauthenticated users see a "teaser" that shows a toast when clicked instead of navigating.

**src/shared/ui/MobileMenu.tsx**

Slide-down mobile menu that receives navItems from Header. Adds extra links for authenticated users (dashboard, maintenance, bookings, messages) gated by usePageFlags(), and admin links (admin overview, users, requests) gated by isAdmin() / isBoard role checks. Has login/logout at the bottom. The NavItem interface (`{ name: string; href: string }`) is defined locally here.

**src/shared/ui/SideDrawer.tsx**

A right-sliding drawer with its own hardcoded link arrays: GUEST_LINKS (5 items for unauthenticated), DASHBOARD_LINKS (9 items for authenticated), SETTINGS_LINKS (2 items), and ADMIN_LINKS (8 items). Uses hasPermission() for fine-grained admin link filtering (users, content, groups, requests). Includes an inline NavIcon component with 13 SVG icons. Escape key closes. Body scroll lock when open.

**src/shared/ui/Footer.tsx**

Four-column footer: (1) Brand + social links, (2) Quick Links gated by usePageFlags(), (3) Services links (some gated by flags), (4) Contact info. Below: emergency contact cards (fetched via useContactSettings). Bottom: copyright + privacy/terms/guidelines/contact links.

**src/shared/ui/Breadcrumbs.tsx**

Simple breadcrumb component accepting BreadcrumbItem[] (`{ label: string; href?: string }`). Renders `<nav>` with `<ol>`, last item rendered as plain text (not a link).

**src/features/platform/ui/PlatformHeader.tsx**

NetComplex marketing site header with 4 nav items (Home, Features, Pricing, About) and CTA buttons (Sign In, Get Started). Has its own inline mobile menu. Uses useTranslation('platform') for labels. Supports light/dark variants.

**src/shared/lib/hooks/usePageFlags.ts**

Client-side hook that fetches GET /api/flags and returns `{ flags: PlatformPageFlags | null, isLoading, error }`. Used by Header, MobileMenu, and Footer.

**src/entities/tenant/api/flags/platform-flags.ts**

Defines the PlatformPageFlags interface with 15 boolean flags plus a conservation tri-state ('default' | 'managed' | 'external'). Reads from the settings DB table via Drizzle ORM. Maps each flag to a SETTINGS_KEYS constant. All flags default to true.

## 3. Current Navigation Structure

### A. Tenant Site -- Desktop Header Nav (from BASE_NAV in Header.tsx)

| Link         | Route         | Flag Gate                         |
| ------------ | ------------- | --------------------------------- |
| Home         | /             | Always shown                      |
| Directory    | /directory    | flags.directory !== false         |
| Groups       | /groups       | flags.groups !== false            |
| Services     | /services     | flags.services !== false          |
| Resources    | /resources    | flags.resources !== false         |
| News         | /news         | flags.news !== false              |
| Maintenance  | /maintenance  | flags.maintenance !== false       |
| Surveys      | /surveys      | flags.surveys !== false           |
| Competition  | /competition  | flags.competitions !== false      |
| Conservation | /conservation | flags.conservation !== 'external' |
| Campaign     | /campaign     | flags.campaign !== false          |

### B. Tenant Site -- Mobile Menu (additional items beyond header nav)

| Link                 | Route           | Condition                                 |
| -------------------- | --------------- | ----------------------------------------- |
| (All BASE_NAV items) | (same as above) | (same flags)                              |
| Dashboard            | /dashboard      | Logged in AND flags.dashboard !== false   |
| Maintenance          | /maintenance    | Logged in AND flags.maintenance !== false |
| Bookings             | /bookings       | Logged in AND flags.bookings !== false    |
| Messages             | /messages       | Logged in AND flags.messages !== false    |
| Admin                | /admin          | Role is ADMIN or BOARD                    |
| Admin Users          | /admin/users    | Role is ADMIN or BOARD                    |
| Admin Requests       | /admin/requests | Role is ADMIN or BOARD                    |

### C. SideDrawer Nav (separate from Header -- has its own arrays)

**Guest (unauthenticated):** Directory, Services, Resources, Groups, Interest

**Authenticated (Dashboard):** Dashboard, Directory, Services, Resources, Groups, Interest, Maintenance, Bookings, Messages

**Settings (authenticated):** Notifications, Settings

**Admin (permission-gated):** Admin Overview, Users (needs users perm), Groups (needs groups perm), Content (needs content perm), Requests (needs requests perm), Surveys, External Surveys, Categories

### D. Footer Quick Links (flag-gated)

Home (always), Directory, Services, Resources, Conservation, Dashboard -- each hidden when its flag is false.

### E. Platform Marketing Site (PlatformHeader)

Home (/), Features (/features), Pricing (/pricing), About (/about) -- not feature-gated, always shown.

### F. Admin Panel Links (from constants.ts ADMIN_LINKS)

Users (/admin/users), Content (/admin/content), Groups (/admin/groups), Requests (/admin/requests)

## 4. Navigation Configuration Patterns

## 4. Navigation Configuration Patterns

**Pattern 1: Centralized Registry & Visibility Utility (Current Standard)**

The codebase has been refactored to use a centralized `NAV_REGISTRY` (in `src/shared/lib/navigation.ts`) and a unified visibility utility (`src/shared/lib/nav-utils.ts`). All navigation components (Header, MobileMenu, SideDrawer, Footer) now import from this registry and use `isNavItemVisible(item, flags, role)` to dynamically filter items based on both tenant feature flags and RBAC permissions. This replaces the previous fragmented hardcoded arrays and logic scattered across multiple files.

**Pattern 2: Dynamic Visibility Gating**

The `isNavItemVisible` utility serves as the single source of truth for navigation access. It evaluates items against:

1. Feature Flags: Fetched client-side via `usePageFlags()` hook from `/api/flags`.
2. RBAC Permissions: Checked using `getPermissions()` (derived from `ROLE_PERMISSIONS` in `src/entities/tenant/api/permissions.ts`).

This ensures consistent enforcement across desktop, mobile, and side navigation surfaces.

**Pattern 3: i18n Translation Keys**

Navigation labels continue to use react-i18next with the `common` namespace. The `NAV_REGISTRY` contains `nameKey` fields that map directly to these translation keys.

**Pattern 4: Onboarding-Driven Configuration**

The `PagesStep.tsx` in onboarding continues to save toggle choices as page flags, which now automatically propagate to all navigation components because they share the centralized visibility logic.

## 5. Key Inconsistencies / Observations

1. Duplicated nav definitions: BASE_NAV in Header.tsx, GUEST_LINKS/DASHBOARD_LINKS in SideDrawer.tsx, and NAV_LINKS/PUBLIC_NAV_LINKS in constants.ts all define overlapping but different sets of navigation items. No single source of truth.

2. Feature-flag gap in SideDrawer: The SideDrawer ignores page flags entirely. If a tenant disables "groups" via page flags, it still appears in the SideDrawer but not in the Header or MobileMenu.

3. NavItem interface is local: The NavItem type (`{ name: string; href: string }`) is defined only inside MobileMenu.tsx. There is no shared navigation type across the codebase.

4. CUSTOM_NAV is defined but unused: The settings key exists and is tested, but no code reads or applies custom navigation configurations.

5. Admin nav differs between MobileMenu and SideDrawer: MobileMenu shows Admin + Users + Requests (2 sub-items). SideDrawer shows 8 admin items with permission-gating. These are two completely different admin navigation experiences.

6. Footer links are independently defined: The footer has its own subset of nav links with its own flag-gating logic, different from both Header and SideDrawer selections.
