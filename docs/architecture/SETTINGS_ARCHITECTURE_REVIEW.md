---
title: Structured summary of the settings architecture in the Soralia Village codebase.
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Structured summary of the settings architecture in the Soralia Village codebase.

## 1. DATABASE

### Prisma Model (prisma/schema.prisma)

File Line Model Description
/home/ubuntupunk/Projects/soralia-village/prisma/schema.prisma 476-487 Setting Generic key-value settings table, tenant-scoped

### Setting model fields:

- id (String, PK)
- tenantId (String)
- key (String) -- unique per tenant (@@unique([tenantId, key]))
- value (String) -- raw string, JSON-encoded for complex types
- schemaVersion (Int, default 1)
- createdAt, updatedAt, deletedAt (DateTime, soft-delete supported)

### User-level settings on user model (line 99-129):

Field Type Default Purpose
avatar String? null User profile picture URL
profileImage String? null Alternate profile image
profileData Json? {} Freeform profile data
showEmail Boolean true Show email on public profile
showPhone Boolean true Show phone on public profile
notificationPreferences Json? { info, warning, success, error: { inApp, email } } Per-type notification channel toggles
isPublic Boolean true Profile publicly visible flag
dashboardLayout Json? null Dashboard widget layout config
interests String[] [] User interest tags
books Json? [] User bookshelf data

### Drizzle Schema

File Table Description
/home/ubuntupunk/Projects/soralia-village/src/db/schema/settings.ts settings (maps to PG Setting) Full Drizzle table definition
/home/ubuntupunk/Projects/soralia-village/src/db/schema/users.ts users Contains showEmail, showPhone, notificationPreferences columns
/home/ubuntupunk/Projects/soralia-village/src/db/schema/profiles.ts profiles Contains showEmail, showPhone columns (separate profile table)
/home/ubuntupunk/Projects/soralia-village/src/db/schema/profile-status-enum.ts Enum Profile status enum
/home/ubuntupunk/Projects/soralia-village/src/db/schema/profiles-relations.ts Relations Profile relations
/home/ubuntupunk/Projects/soralia-village/src/db/schema/agent-profiles.ts agent-profiles Agent-specific profile table
/home/ubuntupunk/Projects/soralia-village/src/db/schema/agent-profiles-relations.ts Relations Agent profile relations

### Ad-hoc SQL

File Purpose
/home/ubuntupunk/Projects/soralia-village/scripts/sql/20260620-add-profileData.sql Adds profileData JSONB column to user table

## 2. API ROUTES

### tRPC Router

File Procedure Method Access Description
/home/ubuntupunk/Projects/soralia-village/src/server/routers/settings.ts settingsRouter.listSettings GET Tenant (authenticated) Lists all settings for the current tenant
settingsRouter.getSetting GET Tenant Get a single setting by key
settingsRouter.upsertSetting POST Privileged (admin) Create or update a setting, validates with Zod, writes audit log
settingsRouter.deleteSetting DELETE Privileged (admin) Soft-delete a setting
settingsRouter.getContactSettings GET Privileged (admin) Get all settings as a flat key-value map

### REST API Routes — /api/settings/

| File                                                                                                | Method | Access                                                                           | Description                                           |
| --------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| /home/ubuntupunk/Projects/soralia-village/src/app/api/settings/route.ts                             | GET    | Admin                                                                            | List all settings (or filter by ?key=), tenant-scoped |
| POST Admin Upsert a setting, validates via validateSettingValue, rate-limited, assist-scope guarded |
| /home/ubuntupunk/Projects/soralia-village/src/app/api/settings/[key]/route.ts                       | GET    | Any (public)                                                                     | Get a single setting by key                           |
| PATCH Admin Upsert a setting by path param [key], validates, writes audit log                       |
| /home/ubuntupunk/Projects/soralia-village/src/app/api/settings/contact/route.ts                     | GET    | Authenticated Get all settings as flat map (no auth required for public reading) |
| POST Authenticated Bulk upsert contact settings via ON CONFLICT DO UPDATE                           |

### REST API Routes — /api/v1/tenant/settings/

These are re-export wrappers pointing to the canonical /api/settings/ routes. They exist to establish the /api/v1/tenant/ namespace; implementation lives at the flat paths.

File Re-exports
/home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/settings/route.ts GET, POST from @/app/api/settings/route
/home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/settings/[key]/route.ts GET, PATCH from @/app/api/settings/[key]/route
/home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/settings/contact/route.ts GET, POST from @/app/api/settings/contact/route

### REST API Routes — Admin Settings

- File Method Access Description
  /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/settings/page-flags/route.ts GET Authenticated Get PlatformPageFlags (reads DB, applies RLS)
  POST Admin Set a single page flag (e.g. { key: "chat", value: true })
  PUT Admin Batch update multiple page flags
  /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/services-config/route.ts GET Authenticated Get services page config (RLS-wrapped)
  PUT Admin Partial update services config (validates with Zod, merges with defaults, writes audit)
  /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/tenant/provider-registration-mode/route.ts GET Admin/Board Get provider registration mode + gateway status
  PATCH Admin/Board Set provider registration mode (OPEN or INVITATION_ONLY)

### Test Files

File What it tests
/home/ubuntupunk/Projects/soralia-village/src/app/api/settings/**tests**/settings.test.ts Settings REST API (GET, POST)
/home/ubuntupunk/Projects/soralia-village/src/app/api/settings/contact/**tests**/settings-contact.test.ts Contact settings REST API
/home/ubuntupunk/Projects/soralia-village/src/app/api/admin/settings/**tests**/page-flags.test.ts Admin page-flags API
/home/ubuntupunk/Projects/soralia-village/src/app/api/admin/services-config/**tests**/services-config.test.ts Admin services-config API
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/platform-flags.test.ts Platform flags logic
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/provider-registration-mode.test.ts Provider registration mode logic

## 3. FRONTEND COMPONENTS & PAGES

### User Settings Page

- File Description
  /home/ubuntupunk/Projects/soralia-village/src/app/settings/page.tsx Main user settings page (client component). Sections: Profile (avatar, name, email), Language (i18n selector), Property Image (household photo upload), Account (role, plan), Notifications (per-type in-app/email toggles), Privacy (show email/phone on public profile). Reads/writes user data via /api/users/:id endpoint. Uses useSettings(userId) hook.
  /home/ubuntupunk/Projects/soralia-village/src/app/settings/layout.tsx Settings page layout (wraps in SpaceChrome when authenticated)
  Admin Settings Pages

- File Description
  /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/providers/settings/page.tsx Admin provider settings page (client component). Toggle provider registration mode (OPEN / INVITATION_ONLY), shows gateway readiness (Paystack, PayPal)
  /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/dashboard/admin/settings/page.tsx Redirect -- redirects to /admin/providers/settings
  Admin Settings Widget

- File Description
  /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/PageSettingsWidget.tsx Page Settings Widget (client component). Admin dashboard widget for toggling page visibility flags (navigation header links, page on/off toggles for 15 pages, conservation mode selector with external URL). Reads/writes via /api/admin/settings/page-flags. Key exports: PageSettingsWidget
  Settings-Related Navigation

- File Description
  /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/lib/navigation-config.ts Navigation config: /settings is defined as a WORKSPACE_ITEMS entry (line 150-155) with requiresAuth: true, no flagKey (always visible). Admin menu does NOT have a dedicated "settings" item (admin settings are per-section).
  Widget Registration

- File Description
  /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/widgets.ts Registers page-settings widget (line 644) with lazy-loaded PageSettingsWidget component. Placed in system space (spaces.ts line 370)
  /home/ubuntupunk/Projects/soralia-village/src/entities/widget/model/default-layouts.ts Default dashboard layout includes page-settings at position {x:0, y:3, width:4, height:3}

## 4. TYPES & SCHEMAS

### Core Setting Types

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/platform-page-flags.ts PlatformPageFlags (interface), HeaderLinkId (type), HEADER*LINK_IDS (const array) The canonical type for all tenant-level page visibility flags. 21 boolean flags + conservation (union type) + conservationExternalUrl + headerLinks array
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/settings/types.ts SettingValueMap (type), getTypedSetting() (function) Maps setting DB keys to their typed value types (boolean for page*\*\_enabled, string for URLs, JSON for complex). Used for type-safe reads
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/settings.ts SETTINGS_KEYS (const object), SettingsKey (type) Canonical enum of all setting DB keys (40+ keys): page flags, stats, merit tiers, translation config, provider registration mode, community stats

### Zod Schemas

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/settings/validation.ts SETTINGS_VALUE_SCHEMAS, validateSettingValue() Per-key Zod validators for all known setting keys. Handles boolean flags, enum constraints, JSON arrays, URLs, etc.
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/schemas/user-profile.ts userProfileSchema, UserProfileFormData Validates user profile form: name, street, unit, phone, interests, isPublic
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/schema.ts servicesConfigSchema, ServicesConfigFormData Validates the services page configuration object (hero, categories, emergency contacts, hours, additional services visibility + content)
Services Config Types

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/services-config.types.ts ServicesPageConfig, CategoryConfig, EmergencyContactConfig, HourConfig, AdditionalServiceConfig Full type definitions for the services page config object
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/services-config.ts defaultServicesConfig(), getServicesConfig(), getServicesConfigWithTx(), upsertServicesConfig() Read/write services config from the Setting table (key=services_config) as a JSON blob
Registration Mode Types

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/providers/registration.ts ProviderRegistrationMode, DEFAULT_PROVIDER_REGISTRATION_MODE, providerRegistrationModeSchema, normalizeProviderRegistrationMode() Types + validation for the provider registration setting (OPEN / INVITATION_ONLY)

## 5. UTILITIES

### Setting Helpers

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/settings/defaults.ts DEFAULT_PAGE_FLAGS Default PlatformPageFlags values (all true except dWallet: false, marketplacePaypal: false)
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/platform-flags.ts getPlatformPageFlags(), getPlatformPageFlagsImpl(), getPlatformPageFlagsWithTx(), setPlatformPageFlag(), setPlatformPageFlagWithTx(), mapFlagToSettingKey() The core engine: reads all tenant settings from DB, maps them into PlatformPageFlags (with ISR cache on CACHE_TAGS.SETTINGS), writes individual flags back. Tx-aware variants for RLS usage
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/provider-registration-mode.ts getProviderRegistrationMode(), getProviderRegistrationModeImpl(), setProviderRegistrationMode() Read/write provider_registration_mode setting with ISR caching

### Client Hooks

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/hooks/useSettings.ts useSettings(userId) React Query hook fetching /api/users/:id for user-specific settings (profile, notifications, privacy)
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/hooks/usePageFlags.ts usePageFlags() Fetches PlatformPageFlags from /api/flags
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/hooks/index.ts Re-exports useSettings Central hook barrel
Statsig / Experiment Flags

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/statsig-flags.ts getStatsigExperimentFlags(), identifyFunction Experiment/feature-flag framework (off by default; 6 experiment keys: newDashboard, chatV2, newBookingFlow, etc.)
Dashboard Config

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/entities/widget/model/dashboard-config.ts WIDGET_FEATURE_MAP, ALL_WIDGETS, getWidgetById() Maps widget IDs to feature flags (e.g. page-settings -> page.dashboard). Determines widget visibility based on tenant feature access
i18n Config

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/lib/i18n/config.ts supportedLanguages, languageNames, defaultLanguage, contentLocales Language selection config (en, af, xh, zu) used on the settings page
AI Config (non-settings but notable)

File Key Exports Description
/home/ubuntupunk/Projects/soralia-village/src/shared/api/ai/config.ts AI_MODELS Centralized AI model IDs (unrelated to the user/admin settings system)

## 6. HOW ADMIN SETTINGS DIFFER FROM USER SETTINGS

Scope
Aspect User Settings Admin Settings
Scope Per-user (stored on user model fields) Per-tenant (stored in Setting table, keyed by tenantId)
DB storage Direct columns on user table (showEmail, showPhone, notificationPreferences, avatar, profileData) Generic Setting table with tenantId, key, value columns
Granularity Individual user preferences Global tenant-wide configuration
What Each Controls
Category User Settings Admin Settings
Profile Avatar, name, email (read-only), plan, role --
Privacy showEmail, showPhone on public profile --
Notifications Per-type (info/warning/success/error) toggle for in-app + email --
Language i18n language selector --
Property Property image upload --
Page Visibility -- PlatformPageFlags (which pages/sections are enabled/disabled in navigation)
Navigation -- Header link order (up to 4 items in top nav)
Feature Toggles -- Conservation mode, campaign, chat, etc.
Services Page -- Services config (hero, categories, hours, emergency contacts)
Provider Registration -- OPEN vs INVITATION_ONLY
Community Stats -- stats_homes, stats_years, etc.
Merit System -- Tier thresholds, expiry days
Translation -- Translation provider + API key
Custom Content -- custom_pages, custom_nav
Access Control
Aspect User Settings Admin Settings
Who can read Any authenticated user (their own) Admin/privileged users
Who can write Any authenticated user (their own) Admin only (checked via hasPermission(role, 'admin'))
API pattern Direct user model mutations via /api/users/:id Generic Setting table upserts via /api/settings/ or specialized admin endpoints
Rate limiting Not explicitly rate-limited Rate-limited (10 req/60s) on POST/PATCH
Audit logging Not audited All mutations logged via writeAuditLog with SETTINGS_CHANGED action
AssistScope guard Not guarded Guarded via requireAssistScope(request, 'full')
Implementation Patterns
Aspect User Settings Admin Settings
API routes Inline fetch to /api/users/:id with PATCH Separate REST endpoints: /api/settings/, /api/admin/settings/page-flags/, /api/admin/services-config/, /api/admin/tenant/provider-registration-mode/
Also via tRPC No Yes -- settingsRouter in /server/routers/settings.ts
Client hook useSettings(userId) (TanStack Query) useQuery directly in PageSettingsWidget / admin pages
Cache 5 min stale time ISR with unstable_cache on CACHE_TAGS.SETTINGS, revalidation on mutation
Validation Zod via userProfileSchema Zod via SETTINGS_VALUE_SCHEMAS, servicesConfigSchema, providerRegistrationModeSchema
Complex types Simple booleans + JSON blob Mixed: booleans, enums, JSON arrays/objects, URLs
Migration plan -- /api/v1/tenant/settings/ are re-export wrappers; planned for tRPC migration (Phase B)
UI Surface
Aspect User Settings Admin Settings
Page URL /settings (public route, wraps in SpaceChrome when auth'd) /admin/providers/settings + dashboard widget PageSettingsWidget
UI framework Self-contained client component with inline fetch calls Dashboard widget (PageSettingsWidget) + admin page
Layout Single page with sections (Profile, Language, Property, Account, Notifications, Privacy) Split: provider settings as a dedicated page, page flags as a dashboard widget in the system space
