---
title: Settings AUDIT
status: current
reviewed: 2026-07-28
tags: [audit]
audience: developer
---

Research Report: System-Level Settings, Analytics, and Configuration

1. ANALYTICS PAGES / COMPONENTS
   No dedicated analytics page exists under /admin/analytics. However, analytics are scattered across widgets:
   File Widget/Component Description
   /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminStatsWidget.tsx (line 57) AdminStatsWidget 4 stat cards: Total Users, Active Requests, Interest Groups, Content Items. Uses useAdminStats() hook. Links to /admin/users, /admin/requests, /admin/groups, /admin/content.
   /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminContentWidget.tsx (line 15) AdminContentWidget Content overview: Published, Drafts, Total Content, Recent Posts
   /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminActivityWidget.tsx (line 17) AdminActivityWidget Recent activity feed — MOCK DATA only (hardcoded activities with setTimeout simulation, line 25-68)
   /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminUserWidget.tsx AdminUserWidget User management overview
   /home/ubuntupunk/Projects/soralia-village/src/widgets/service/ui/MarketplaceAnalyticsWidget.tsx (line 9) MarketplaceAnalyticsWidget Marketplace stats: Total Listings, Active Providers, Pending Inquiries, Total Reviews
   /home/ubuntupunk/Projects/soralia-village/src/widgets/service/ui/ServiceQualityWidget.tsx (line 17) ServiceQualityWidget Low-rating alerts for services
   /home/ubuntupunk/Projects/soralia-village/src/widgets/maintenance/ MaintenanceAnalyticsWidget Maintenance-specific analytics (registered as widget maintenance-analytics)
   /home/ubuntupunk/Projects/soralia-village/src/features/admin/model/useAdminStats.ts (line 40) useAdminStats() hook Fetches from /api/users, /api/maintenance, /api/groups, /api/content in parallel via TanStack Query
   /home/ubuntupunk/Projects/soralia-village/src/features/admin/model/useAdminUrgency.ts (line 5) useAdminUrgency() hook Fetches from /api/admin/urgency, 30s stale time
   API routes supporting analytics:

- /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/activity/route.ts — Real activity feed API (lines 36-259), cursor-based pagination, 5 domains: maintenance, users, content, surveys, events. Cached 30s private.
- /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/urgency/route.ts — Urgency counts (lines 25-132): open maintenance, pending members, closing surveys, expired announcements, unpublished content, draft competitions.
- /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/maintenance-stats/route.ts — Full maintenance analytics (lines 15-143): open/completed/overdue counts, by-status/priority/category breakdowns, 12-month trend, average resolution time.

2. SYSTEM SETTINGS
   Two distinct settings layers exist:
   A. Per-Tenant Page Flags (Feature Toggles)

- Type definition: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/platform-page-flags.ts (lines 1-19) — 18 boolean/string flags
- Settings keys: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/settings.ts (lines 1-23) — SETTINGS_KEYS object, 21 keys
- DB layer: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/platform-flags.ts — getPlatformPageFlags() (line 35), setPlatformPageFlag() (line 108), plus Tx-aware versions (lines 150, 229)
- API for page flags: /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/settings/page-flags/route.ts (lines 24-87) — GET and POST endpoints
- Public flags API: /home/ubuntupunk/Projects/soralia-village/src/app/api/flags/route.ts (lines 1-64) — returns all flags or single flag; also exposes Statsig experiment flags via ?experiments=true
- API v1 alias: /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/system/flags/route.ts (line 4) — re-exports from @/app/api/flags/route
- UI widget for flags: /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/PageSettingsWidget.tsx (lines 14-366) — Toggle UI for all page flags, radio for header engagement focus, conservation mode with 3 options (default/managed/external), external URL input
- Client hook: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/hooks/usePageFlags.ts (line 7) — usePageFlags() hook calling /api/flags
  B. Platform-Level Tenant Settings (Branding, Features, Subscription)
- Branding form: /home/ubuntupunk/Projects/soralia-village/src/features/admin/ui/BrandingForm.tsx (lines 7-319) — Name, slug, custom domain, logo/favicon URLs, primary/accent/secondary colors, font family, custom CSS
- Features form (platform admin): /home/ubuntupunk/Projects/soralia-village/src/features/admin/ui/FeaturesForm.tsx (lines 7-171) and /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/[id]/features/components.tsx (lines 26-193) — Tier-based feature toggle with override. Categories: Pages, Features, Widgets.
- New tenant form: /home/ubuntupunk/Projects/soralia-village/src/features/admin/ui/NewTenantForm.tsx
- Platform admin pages:
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/page.tsx — Tenant list
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/[id]/edit/page.tsx — Edit tenant (branding)
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/[id]/features/page.tsx — Feature flags
  C. User Settings Page
- /home/ubuntupunk/Projects/soralia-village/src/app/settings/page.tsx (lines 1-317) — End-user settings: profile image, language, property image, privacy toggles (showEmail, showPhone). NOT an admin page.

3. ADMIN WIDGET REGISTRY
   All widgets registered in: /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/widgets.ts
   Key admin widgets:
   Widget ID Line Component Description
   admin-stats 257 @widgets/admin → AdminStatsWidget Platform statistics and key metrics
   admin-activity 278 @widgets/admin → AdminActivityWidget Recent admin activity feed (mock data)
   admin-quick-links 299 @widgets/admin → AdminQuickLinksWidget Quick access to admin actions
   admin-content 320 @widgets/admin → AdminContentWidget Content management overview
   admin-user 341 @widgets/admin → AdminUserWidget User management overview
   admin-system 362 @widgets/admin → AdminSystemWidget System health and configuration (mock data)
   page-settings 533 @widgets/admin → PageSettingsWidget Configure tenant page flags and visibility
   admin-events 457 @widgets/admin → EventsWidget Management summary of community events
   admin-surveys 474 @widgets/admin → SurveysWidget Management summary of surveys
   admin-announcements 491 @widgets/admin → AdminAnnouncementsWidget Manage community announcements
   admin-competitions 550 @widgets/admin → CompetitionList Full list of competitions
   admin-resources 567 @widgets/admin → ResourceList Full list of resources
   admin-merits 584 @/page-modules/admin/merits/ui/MeritEscalationWidget Behavior record escalation
   admin-pending-disputes 605 @/page-modules/admin/merits/ui/PendingDisputesWidget Pending dispute resolution
   Admin widget renderer: /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminWidgetRenderer.tsx (lines 44-153) — Maps widget IDs to rendered components. Also renders marketplace-analytics (line 82) and service-quality (line 88) widgets.
4. ADMIN DOMAIN → WIDGET MAPPING
   From: /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/spaces.ts (lines 323-334)
   const ADMIN_DOMAIN_WIDGET_MAP = {
   users: ['admin-user'],
   maintenance: ['maintenance-list', 'maintenance-analytics'],
   content: ['admin-content'],
   events: ['admin-events'],
   competitions: ['admin-competitions'],
   resources: ['admin-resources'],
   surveys: ['admin-surveys'],
   merits: ['admin-merits'],
   announcements: ['admin-announcements'],
   system: ['admin-system', 'page-settings'], // ← THE SYSTEM DOMAIN
   };
   System domain: Defined as domain 'system' at line 314 in ADMIN_DOMAINS. Maps to widgets [admin-system, page-settings]. The route override at line 15 of AdminLayer.tsx maps system: '/admin/categories' — meaning clicking the "System" domain card navigates to /admin/categories.
   Admin domain definitions (UI cards): /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/AdminSubLauncher.tsx (lines 23-94) — 10 management domains defined with icon, label, description. System domain (line 88-93): id 'system', icon /platform/system.svg, description "Platform configuration and health".
5. ADMIN SPACE WIDGET REGISTRY
   From: /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/spaces.ts (lines 130-153)
   The admin space contains widget IDs:
   widgetIds: [
   'admin-stats', 'admin-user', 'admin-system', 'page-settings',
   'admin-announcements', 'admin-events', 'admin-surveys',
   'admin-competitions', 'admin-resources', 'admin-content',
   'maintenance-list', 'maintenance-analytics',
   'agent-dashboard', 'agent-activity',
   ]
   Plus admin-merits and admin-pending-disputes were added later (widgets.ts lines 584, 605) but NOT yet added to this list — they are registered only for the admin space in the widget manifest.
6. EXISTING SETTINGS UI
   Tenant-facing:

- /home/ubuntupunk/Projects/soralia-village/src/app/settings/page.tsx — User profile/language/privacy settings (NOT admin)
  Admin-facing (within tenant):
- /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/PageSettingsWidget.tsx — Full UI for toggling page flags
- /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/categories/page.tsx — Categories management (this is the route the System domain links to)
  Platform-level (cross-tenant):
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/page.tsx — Tenant list
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/[id]/edit/page.tsx — Edit tenant branding
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/admin/platform/[id]/features/page.tsx — Feature flag overrides per tenant
  API endpoints for settings:
- /home/ubuntupunk/Projects/soralia-village/src/app/api/settings/route.ts
- /home/ubuntupunk/Projects/soralia-village/src/app/api/settings/[key]/route.ts
- /home/ubuntupunk/Projects/soralia-village/src/app/api/settings/contact/route.ts
- /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/settings/route.ts
- /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/settings/[key]/route.ts
- /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/settings/contact/route.ts

7. FEATURE FLAGS
   Three-tier feature flag system:
   A. Platform Page Flags (per-tenant visibility toggles)

- Type: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/platform-page-flags.ts
- DB keys: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/settings.ts (21 SETTINGS_KEYS)
- Implementation: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/platform-flags.ts
- API: GET/POST /api/admin/settings/page-flags — admin-only
- API: GET /api/flags — public, used by usePageFlags() hook
- UI: PageSettingsWidget — admin UI with toggle switches
  B. Tenant Subscription Feature Registry (tier-based)
- Registry: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/features/registry.ts (lines 1-514)
- FEATURE_REGISTRY (line 43): 24 features across categories page/feature/widget, tiers: foundation/core/pro-max
- WIDGET_REGISTRY (line 262): 22 widgets across categories community/admin/marketplace/utility
- An analytics-widget (line 372) exists in the widget registry at tier core, but has NO registered widget implementation in widgets.ts
- No analytics page, route, or component currently exists
- UI: FeaturesForm at /home/ubuntupunk/Projects/soralia-village/src/features/admin/ui/FeaturesForm.tsx — platform admin only, toggle overrides per tenant
  C. Vercel/Statsig Experiment Flags (planned, not active)
- /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/statsig-flags.ts (lines 1-58)
- 6 experiment flags defined: newDashboard, chatV2, newBookingFlow, customBrandingV2, premiumGardenFeatures, adminAnalyticsPlus — ALL return false (line 34-39)
- Uses flags/next dedupe() for entity identification
- Statsig adapter is NOT wired in; the code has a comment: "To enable Statsig: import { statsigAdapter } from '@flags-sdk/statsig'"
  D. Widget-Level Feature Flags
- Individual widgets can specify featureFlag in their manifest (e.g., 'households', 'services', 'portfolio', 'agents', 'communityGraph')
- Filtered via WidgetRenderer.tsx line 41-47 and getAvailableWidgets() in dashboard-config.ts

8. HEALTH / MONITORING
   No dedicated health-check endpoint exists.
   The AdminSystemWidget (/home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/AdminSystemWidget.tsx, lines 18-175) displays:

- API Health (hardcoded 'healthy')
- Database Status (hardcoded 'connected')
- Active Users (random mock: Math.floor(Math.random() \* 20) + 5)
- System Uptime (hardcoded '7d 14h 32m')
- Last Backup (mock: 1 day ago)
- Quick Actions buttons (Restart, Backup) — non-functional, no handlers
  All data is entirely hardcoded/mocked (lines 33-39). There is NO /api/health endpoint and no real-time monitoring.
  SUMMARY OF GAPS & INTEGRATION POINTS
  Area Status Key Files
  Analytics page Does not exist as a standalone page. Widgets admin-stats, AdminContentWidget, MarketplaceAnalyticsWidget scattered across admin space. analytics-widget in feature registry has no implementation. AdminStatsWidget.tsx:57, MarketplaceAnalyticsWidget.tsx:9
  Activity feed Real API exists at /api/admin/activity with cursor pagination, but admin widget uses mock data activity/route.ts:36, AdminActivityWidget.tsx:25
  System health Mock-only. No /api/health endpoint. AdminSystemWidget is entirely hardcoded. AdminSystemWidget.tsx:18-39
  Page settings UI Fully implemented — PageSettingsWidget toggles all 14 page flags + conservation mode + header focus PageSettingsWidget.tsx:14, page-flags/route.ts:24
  Feature flags (platform) Fully implemented — FeaturesForm with tier-based override, API-backed FeaturesForm.tsx:7, features/registry.ts
  Feature flags (Statsig) Planned, inactive — all experiment flags return false, Statsig adapter commented out statsig-flags.ts:26-39
  System domain Routes to /admin/categories (override). Widgets: admin-system + page-settings. AdminLayer.tsx:15, spaces.ts:333
  Platform admin (cross-tenant) Fully implemented — tenant CRUD, branding form, feature overrides platform/tenants/route.ts, edit/components.tsx
  Vercel Flags SDK Not used. No @vercel/flags imports found anywhere in the codebase. N/A
