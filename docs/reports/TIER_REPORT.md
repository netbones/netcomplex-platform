Complete Tier/Plan Definition Report

1. TWO SEPARATE TIER SYSTEMS
   The codebase has two distinct tier systems that coexist and cross-map:
   A) Application Tier Model (TierLevel)

- Defined in: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/constants/tiers.ts
- Used for: Feature gating, module access, page flags
- Values: 'core' | 'foundation' | 'pro-max'
  B) Billing/Prisma Tier Model (TenantTier / Prisma Tier enum)
- Defined in: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/tenant.ts (line 3)
- Prisma schema: /home/ubuntupunk/Projects/soralia-village/prisma/schema/schema.prisma (line 2688)
- Used for: Billing plans, subscription model, DB persistence
- Values: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE'
  Cross-mapping (in gate.ts line 55-59):
  const TENANT_TIER_TO_LEVEL: Record<TenantTier, TierLevel> = {
  STANDARD: 'core',
  PREMIUM: 'foundation',
  ENTERPRISE: 'pro-max',
  };

2. Application Tier Model (TierLevel) -- Full Definition
   File: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/constants/tiers.ts
   Type Definition
   export type TierLevel = 'core' | 'foundation' | 'pro-max';
   Module Key Type
   export type ModuleKey =
   | 'directory' | 'news' | 'events' | 'groups' | 'chat'
   | 'resources' | 'conservation' | 'adminBasic' | 'adminIntermediate'
   | 'bookings' | 'surveys' | 'marketplace' | 'externalSurveys'
   | 'maintenance' | 'property' | 'agentGateway' | 'analytics'
   | 'adminAdvanced' | 'education';
   All 19 Modules with Tier Assignments
   Module Key Label Tier
   directory Directory core
   news News core
   events Events core
   groups Groups core
   chat Chat core
   resources Resources core
   conservation Conservation core
   adminBasic Admin (Basic) core
   education Education Portal core
   adminIntermediate Admin (Intermediate) foundation
   bookings Bookings foundation
   surveys Surveys foundation
   marketplace Marketplace foundation
   externalSurveys External Surveys foundation
   maintenance Maintenance pro-max
   property Property pro-max
   agentGateway Agent Gateway pro-max
   analytics Analytics pro-max
   adminAdvanced Admin (Advanced) pro-max
   Tier Definitions
   Tier Name maxPages Description
   core CORE 5 Entry tier for small communities (up to 50 units)
   foundation FOUNDATION 15 Growth tier for expanding communities (up to 200 units)
   pro-max ENTERPRISE unlimited (-1) Enterprise tier for large HOAs
   Helper Functions (same file)

- hasModuleAccess(tier, module) -- checks if module is in tier's list
- getTierModules(tier) -- returns all modules for a tier
- getTierLevel(tier) -- normalizes any string to TierLevel (defaults to 'core')
- getDefaultTier() -- returns 'core'
- canAccessModule(tenantTier, moduleKey) -- tier-aware module check
- getMaxPages(tier) -- page limit
- canAddPage(tenantTier, currentPageCount) -- page limit enforcement

3. Billing Tier Model (TenantTier / Prisma Tier enum)
   TypeScript Definition
   File: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/tenant.ts (line 3)
   export type TenantTier = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
   Prisma Enum
   File: /home/ubuntupunk/Projects/soralia-village/prisma/schema/schema.prisma (line 2688)
   enum Tier {
   STANDARD
   PREMIUM
   ENTERPRISE
   }
   Fields using the Tier enum in Prisma:
   Tenant model (prisma/schema/tenant.prisma line 32):
   tier Tier @default(STANDARD)
   Also legacy field (line 25):
   subscriptionTier String @default("basic")
   BillingPlan model (prisma/schema/schema.prisma line 1540):
   tier Tier @default(STANDARD)
   PlatformModule model (prisma/schema/schema.prisma line 455):
   minTier Tier @default(STANDARD)
   PlatformAiTierQuota model (prisma/schema/schema.prisma line 2309-2318):
   model PlatformAiTierQuota {
   tier Tier @unique
   monthlyTokens Int
   overagePolicy AiOveragePolicy
   overageTokens Int
   overagePriceZAR Decimal
   }
   Tier Sync Logic
   File: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/billing/tier-sync.ts

- deriveTenantTier(tenantId) -- read-only: derives tier from active subscription plan
- syncTierToTenant(tenantId) -- writes plan tier to tenants.tier, respects tierManualOverride

4. Feature Registry (Expanded Tier/Feature Model)
   File: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/features/registry.ts
   Feature Definition Interface
   export interface FeatureDefinition {
   key: string;
   tier: TierLevel;
   category: 'page' | 'feature' | 'widget';
   label: string;
   description: string;
   icon?: string;
   }
   All Feature Registry Entries (38 total):
   Pages (18):
   Key Tier Label
   page.directory core Community Directory
   page.news core News & Announcements
   page.events core Events
   page.bookings core Facility Booking
   page.conservation core Conservation Area
   page.bookshelf core Community Library
   page.groups core Groups
   page.maintenance core Maintenance Requests
   page.surveys core Surveys
   page.chat core Community Chat
   page.education core Education Portal
   page.admin core Admin Panel
   page.dWallet foundation Data Wallet
   page.marketplace foundation Services Marketplace
   page.property foundation Property Listings
   page.disputes foundation Dispute Resolution
   page.analytics pro-max Analytics Dashboard
   page.agent-gateway pro-max Agent Gateway
   Features (14):
   Key Tier Label
   feature.facilityBooking core Facility Booking Module
   feature.conservation core Conservation Module
   feature.education.bursaries core Bursaries
   feature.education.resources core Education Resources
   feature.customBranding foundation Custom Branding
   feature.customDomain foundation Custom Domain
   feature.advancedGroups foundation Advanced Groups
   feature.bookingPayments foundation Booking Payments
   feature.agentDashboard foundation Agent Dashboard
   feature.externalSurveys foundation External Surveys
   feature.enable-setup-center foundation Setup Center
   feature.apiAccess pro-max API Access
   feature.premiumSupport pro-max Premium Support
   feature.whiteLabel pro-max White Label
   Helper Functions (same file):

- hasFeature(featureKey, tenantTier, featureFlags?) -- checks tier + optional flag override
- getFeaturesForTier(tier) -- returns all features available at/below a tier
- getPagesForTier(tier) -- filters to page-category features
- getWidgetsForTier(tier) -- returns widgets available at/below a tier
- canAccessPage(pageKey, tenantTier, featureFlags?) -- page-specific tier check
- canUseWidget(widgetKey, tenantTier) -- widget-specific tier check
- getEnabledFeaturesForTenant(tenant, featureFlags?) -- tenant-aware feature list
- isFeatureEnabled(tenant, key) -- tenant-level check

5. Widget Registry (Tier-Assigned)
   File: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/features/registry.ts (line 319-519)
   26 widgets assigned across tiers:
   Tier Widget Count Widget Keys
   core 18 directory-widget, events-widget, bookings-widget, groups-widget, chat-widget, conservation-widget, bookshelf-widget, news-widget, maintenance-widget, surveys-widget, education-admin, stats-widget, notifications-widget, households-widget, quick-actions-widget, recent-activity-widget, my-album-widget, media-widget
   foundation 6 dwallet-summary, services-widget, property-widget, agent-widget, dwallet-admin, dwallet-summary
   pro-max 1 analytics-widget
6. Feature Gate System (5-Layer Precedence)
   Server-side gate: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/gate/gate.ts
   Client-side gate: /home/ubuntupunk/Projects/soralia-village/src/features/gate/model/gate.ts
   FeatureKey (15-key canonical namespace)
   File: /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/gate/mappings.ts (line 16-31)
   export type FeatureKey =
   | 'maintenance' | 'bookings' | 'events' | 'surveys' | 'competitions'
   | 'groups' | 'chat' | 'news' | 'dashboard' | 'dWallet'
   | 'directory' | 'resources' | 'conservation' | 'services' | 'messages';
   Gate Layers (server-side):
   Layer 0: Role (in-memory ROLE_PERMISSIONS lookup)
   Layer 1: Tier (MODULES.tier >= tenant.tier)
   Layer 2: Module (DB-backed isModuleEnabled)
   Layer 3: PageFlag (DB-backed getPlatformPageFlags)
   Layer 4: FeatureToggle (FEATURE_REGISTRY lookup via hasFeature/canAccessPage)
   First false wins.
   Mapping tables (FEATURE_TO_MODULE, FEATURE_TO_FLAG, FEATURE_TO_REGISTRY) -- all defined in mappings.ts
7. PlatformPageFlags (Toggleable Feature Flags)
   File: /home/ubuntupunk/Projects/soralia-village/src/shared/lib/types/platform-page-flags.ts
   export interface PlatformPageFlags {
   'agent-gateway': boolean;
   campaign: boolean;
   conservation: 'default' | 'managed' | 'external';
   conservationExternalUrl: string;
   conservationManagedUrl: string;
   chat: boolean;
   education: boolean;
   news: boolean;
   events: boolean;
   directory: boolean;
   groups: boolean;
   services: boolean;
   resources: boolean;
   maintenance: boolean;
   surveys: boolean;
   competitions: boolean;
   dashboard: boolean;
   disputes: boolean;
   dWallet: boolean;
   providers: boolean;
   bookings: boolean;
   marketplacePaypal: boolean;
   messages: boolean;
   headerLinks: HeaderLinkId[];
   }
   Defaults are built from SETTING_DEFS in /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/settings-defs.ts.
8. Documentation
   File: /home/ubuntupunk/Projects/soralia-village/docs/architecture/TIER_MODEL.md

- 196 lines covering module definitions, tier definitions, access matrix, implementation notes, and migration notes
- Shows original naming conventions (Foundation/Depth/Core) that predate the current core/foundation/pro-max naming
  File: /home/ubuntupunk/Projects/soralia-village/docs/product/PremiumModelNote.md
- Likely contains additional premium model context
  File: /home/ubuntupunk/Projects/soralia-village/docs/product/NetComplex_Infrastructure_Cost_Model_2026.md
- Infrastructure cost model reference

9. Summary: Architecture Overview
   The tier system has three layers:
   Prisma DB (Tier enum) Application (TierLevel) Registry (FeatureDefinition)
   ────────────────────── ────────────────────── ──────────────────────────
   STANDARD → core Pages / Features / Widgets
   PREMIUM → foundation Pages / Features / Widgets  
   ENTERPRISE → pro-max Pages / Features / Widgets

- core (STANDARD): 9 modules, 18 widgets, 12 pages, 4 features -- basic community
- foundation (PREMIUM): 13 modules, 24 widgets, 16 pages, 10 features -- growth
- pro-max (ENTERPRISE): 18 modules (all), 25 widgets, 18 pages, 14 features -- full access
  The PlatformModule model in Prisma (prisma/schema/schema.prisma line 451-460) stores minTier: Tier per module, and TenantModule (line 462-474) stores per-tenant overrides. This is the DB-backed layer that isModuleEnabled() queries.
