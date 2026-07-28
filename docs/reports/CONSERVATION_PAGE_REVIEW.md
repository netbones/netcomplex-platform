---
title: Conservation PAGE REVIEW
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

Conservation Page Feature — Complete State Analysis

1. Conservation Page (Frontend)
   Page component: /home/ubuntupunk/Projects/soralia-village/src/app/conservation/page.tsx (333 lines)

- A client component ('use client') at lines 1-333
- Has three modes determined by the conservation platform flag:
- 'default' — renders hardcoded static Soralia nature reserve content (stats, initiatives, flora, wildlife, volunteer opportunities)
- 'managed' — fetches and displays content from a configurable CMS URL (admin-managed). Falls back to a helpful message if no URL is configured.
- 'external' — renders an iframe pointing to conservationExternalUrl (lines 106-113)
  Key architecture details:
- Uses useState for conservationMode and externalUrl (lines 40-43)
- Fetches the conservation mode via fetch('/api/flags?flag=conservation') (lines 62-66)
- Fetches the external URL via fetch('/api/flags?flag=conservationExternalUrl') (lines 78-85)
- Fetches content articles from fetch('/api/conservation') (lines 92-101) which returns up to 3 published CMS content items with authors
- The content is displayed in an "Our Initiatives" / articles section (lines 223-255)
- Static hardcoded data arrays: conservationStats (lines 120-128), initiatives (lines 130-151), flora (lines 153-159), wildlife (lines 161-167), volunteerOpportunities (lines 169-185)
- Uses useTranslation('conservation') for i18n (line 37)
- Uses ErrorBoundary wrapper
  Layout: /home/ubuntupunk/Projects/soralia-village/src/app/conservation/layout.tsx (14 lines)
- Wraps in SpaceChrome if authenticated, otherwise renders children directly

2. Prisma Schema — Content model
   File: /home/ubuntupunk/Projects/soralia-village/prisma/schema.prisma, lines 680-712
   There is no conservation-specific model. The Content model (line 680) is a general-purpose CMS table:

- category field is typed as ContentCategory (an enum defined elsewhere in the schema)
- Uses JSON columns for title, content, excerpt (multi-locale)
- published, featured, publishedAt for content lifecycle
- tags is a String[]
- Has a relation to user via authorId
- No separate conservation model in the Prisma schema
  The conservation API queries this generic Content table — it does not filter by a conservation-specific category.

3. API Routes for Conservation
   3a. Primary API: /home/ubuntupunk/Projects/soralia-village/src/app/api/conservation/route.ts (42 lines)

- GET only — maxDuration = 8 (line 7)
- Uses withTenant() for tenant context (line 11)
- Calls assertModuleEnabled('conservation') (line 12) — checks if the feature module is enabled
- Queries the contents table joined with users for author name (lines 15-31)
- Filters: published = true AND tenantId match
- Orders by publishedAt descending
- Limited to 3 results (.limit(3), line 31)
- Returns { id, title, excerpt, image, category, publishedAt, author: { name } }
  3b. v1 Re-export: /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/conservation/route.ts (5 lines)
- Simply re-exports GET from the primary route (line 5)
  3c. tRPC Router: /home/ubuntupunk/Projects/soralia-village/src/server/routers/content.ts, lines 1042-1082
- getConservationPage — a tenantProcedure (line 1048)
- Checks isModuleEnabled(tenantId, 'conservation') and throws FORBIDDEN if disabled (lines 1055-1060)
- Same query pattern as the REST API: joins contents + users, 3 latest published items (lines 1063-1079)
- Returns using toEnvelope + contentDto
  3d. Tests: /home/ubuntupunk/Projects/soralia-village/src/app/api/conservation/**tests**/conservation.test.ts (158 lines)
- Tests: returns latest articles (line 115), returns empty array (line 127), tenant isolation (line 138), DB error handling (line 146)

4. Settings Definitions (SETTING_DEFS and SETTINGS_KEYS)
   File: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/settings-defs.ts
   Two conservation-related settings in SETTING_DEFS (lines 21-33):
   {
   dbKey: 'page_conservation_mode', // line 22
   flagKey: 'conservation', // line 23
   type: 'enum', // line 24
   enumValues: ['default', 'managed', 'external'], // line 25
   defaultValue: 'default', // line 26
   }
   {
   dbKey: 'page_conservation_external_url', // line 29
   flagKey: 'conservationExternalUrl', // line 30
   type: 'string', // line 31
   defaultValue: '', // line 32
   }
   In SETTINGS_KEYS:
   PAGE_CONSERVATION_MODE: 'page_conservation_mode',
   PAGE_CONSERVATION_URL: 'page_conservation_external_url',
   PAGE_CONSERVATION_MANAGED_URL: 'page_conservation_managed_url',
5. Feature Registry (ADMIN_DOMAINS / ADMIN_ITEMS equivalent)
   File: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/features/registry.ts
   Three conservation-related entries:
   Registry Key Type Tier
   page.conservation PAGE_REGISTRY (page) foundation
   feature.conservation FEATURE_REGISTRY (feature) foundation
   conservation-widget WIDGET_REGISTRY (widget) foundation
   The widget has page: 'conservation' mapping it to the conservation page.
   Feature gate mappings: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/gate/mappings.ts
   Conservation appears in all three gate mapping tables (lines 29, 62, 82, 100):

- FeatureKey includes 'conservation' (line 29)
- FEATURE_TO_MODULE: conservation → 'conservation' (line 62)
- FEATURE_TO_FLAG: conservation → 'conservation' (line 82)
- FEATURE_TO_REGISTRY: conservation → 'page.conservation' (line 100)

6. Conservation Modes — How They Work
   Defined in /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/settings-defs.ts line 25:
   enumValues: ['default', 'managed', 'external']
   Mode Behavior
   default Renders the hardcoded static Soralia conservation page (stats, flora, wildlife, volunteer sections) PLUS fetches up to 3 latest CMS content articles for the "initiatives" section
   managed Fetches and displays content from the admin-configured managed CMS URL. If no URL is configured, shows a message prompting the admin to set it in Page Settings. Falls back gracefully on fetch errors. Keeps the static Soralia hero, stats, flora, wildlife, and volunteer sections.
   external Hides the navigation item in the header (see isNavItemVisible at line 112 of nav/index.ts and isItemVisible at line 264 of navigation-config.ts). Renders a full-height iframe pointing to conservationExternalUrl
   Nav visibility rules:
   In /home/ubuntupunk/Projects/soralia-village/src/shared/lib/nav/index.ts (line 112):
   if (item.id === 'conservation' && flagValue === 'external') return false;
   In /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/lib/navigation-config.ts (line 264):
   if (item.flagKey === 'conservation') {
   return flagValue !== 'external';
   }
   When external, the conservation nav item is hidden from headers and More dropdown.
7. Admin UI — PageSettingsWidget
   File: /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/PageSettingsWidget.tsx (367 lines)
   The conservation section appears at lines 295-363:

- Lines 167-179: conservationModes array defines three radio options:
- 'default' — "Default Content" / "Built-in Soralia conservation content"
- 'managed' — "Managed Content" / "Content managed via CMS"
- 'external' — "External Portal" / "Link to external conservation portal"
- Lines 301-329: Radio button group rendering
- Lines 333-362: When 'external' is selected, a URL input field appears for conservationExternalUrl, with a "Save URL" button. When 'managed' is selected, a CMS URL input appears for conservationManagedUrl with a "Save URL" button.
- Updates are persisted via POST to /api/admin/settings/page-flags using the updateFlag function (lines 41-72)
- Dispatches a page-flags-updated window event on save (line 55)
  The settings API it talks to is at /home/ubuntupunk/Projects/soralia-village/src/app/api/admin/settings/page-flags/route.ts:
- GET returns all flags (lines 29-42)
- POST validates keys including 'conservation' and 'conservationExternalUrl' (lines 44-47, 65-114)
- PUT supports batch updates (lines 116-179)

8. Conservation-Related Widgets, Features, and Components
   File Description
   /home/ubuntupunk/Projects/soralia-village/src/entities/widget/model/dashboard-config.ts Maps 'conservation-widget' to 'page.conservation'
   /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/features/registry.ts conservation-widget widget definition in WIDGET_REGISTRY
   /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/lib/navigation-config.ts CONSERVATION_NAV_ITEM defined, included in PUBLIC_HEADER_ITEMS, special visibility logic for external
   /home/ubuntupunk/Projects/soralia-village/src/shared/lib/nav/index.ts NAV_REGISTRY entry for conservation, special external visibility rule
   /home/ubuntupunk/Projects/soralia-village/src/shared/lib/constants.ts Conservation listed as an INTERESTS category
   /home/ubuntupunk/Projects/soralia-village/src/shared/lib/constants/tiers.ts Conservation defined as a foundation tier module
   /home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/platform-page-flags.ts conservation: 'default' | 'managed' | 'external', conservationExternalUrl: string, and conservationManagedUrl: string in PlatformPageFlags interface
   /home/ubuntupunk/Projects/soralia-village/src/shared/lib/i18n/config.ts 'conservation' in the list of loaded i18n namespaces
   /home/ubuntupunk/Projects/soralia-village/src/shared/api/revalidation.ts revalidatePath('/conservation') in revalidateContent()
   /home/ubuntupunk/Projects/soralia-village/src/middleware.ts /conservation path matched for i18n redirect handling
   /home/ubuntupunk/Projects/soralia-village/src/app/api/stats/route.ts Returns conservationArticles: contentCount in stats
   /home/ubuntupunk/Projects/soralia-village/src/shared/ui/MobileMenu.tsx Conservation in mobile menu visibility list
   /home/ubuntupunk/Projects/soralia-village/public/locales/en/conservation.json English i18n strings for the conservation page (title, stats, initiatives, flora, wildlife, volunteer, sightings, join)
   /home/ubuntupunk/Projects/soralia-village/public/locales/af/conservation.json Afrikaans translations
   /home/ubuntupunk/Projects/soralia-village/public/locales/xh/conservation.json isiXhosa translations
   /home/ubuntupunk/Projects/soralia-village/public/locales/zu/conservation.json isiZulu translations
   Summary of Key Findings
1. The conservation page is a hybrid: it has a static hardcoded Soralia-specific layout (stats, flora, wildlife, volunteer opportunities) that pulls in up to 3 dynamic CMS articles from the generic Content table in default mode, or fetches from an admin-configured CMS URL in managed mode.
1. No conservation-specific Prisma model exists — it piggybacks on the generic Content model.
1. Three modes: default renders the static Soralia layout + 3 platform articles; managed fetches content from an admin-configured CMS URL; external hides the page from navigation and renders an iframe.
1. The managed mode now has distinct behavior — it fetches content from the Page Settings "Managed CMS URL" endpoint and renders it in the initiatives section.
1. The API does not filter by a conservation-specific category — it fetches all published content for the tenant, limited to 3.
1. No dedicated ConservationWidget component exists — the conservation-widget is registered in the feature/widget registry but there is no corresponding React component file.
1. Settings are persisted in the settings table (via Drizzle), keyed by page_conservation_mode, page_conservation_external_url, and page_conservation_managed_url, using the tenant flags system with ISR caching (5-minute revalidation).
1. Feature gating: Conservation requires the conservation module to be enabled. The /api/conservation route and tRPC procedure both check isModuleEnabled('conservation').
