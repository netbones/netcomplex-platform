**Optimal Arrangement & Ordering of Service Domains (NetComplex / Soralia Village)**

As your high-level architecture consultant, I recommend a **user-centric, frequency-driven, and modular re-structuring** of the dashboard service areas. The current layout (Service Areas → Competitions & Surveys → My Learning → Finance & Markets → Settings) is functional but can be improved for better discoverability, logical flow, reduced cognitive load, and alignment with our **FSD + tiered module architecture** (see `registry.ts`, `TIER_MODEL`, `NETCOMPLEX_ARCHITECTURE.md`, and schema domains).

see: Proposed tRPC router groupings.

### Core Principles for This Recommendation

- **Frequency + User Journey**: Daily essentials first → Engagement → Admin/Learning → Finance → Settings.
- **Logical Grouping**: Cluster by domain affinity (e.g., all "interaction" modules together).
- **Tier & Module Alignment**: Prioritize Foundation-tier items; make Growth/Depth items visually prominent but gated via `hasModuleAccess` / feature flags.
- **Widget & Page Consistency**: Mirror widget registry (`WIDGET_REGISTRY`) and tRPC routers (`identity`, `competitions`, maintenance, etc.).
- **UI/UX**: Responsive card grid (5-col desktop, 2-3 col mobile). Use consistent icons from `/public/platform/`. Support custom nav via tenant settings (`SETTINGS_KEYS`).
- **Architecture Benefits**: Easier middleware/tenant scoping, better ISR caching per domain, cleaner tRPC procedure grouping.

### Proposed Top-Level Sections (Ordered)

1. **Core Services** (Primary Hub – Most Frequent Use)
   - **Maintenance** (top-left – highest frequency for residents)
   - **Bookings** / **Amenities**
   - **My Services** (Marketplace inquiries)
   - **Events**
   - **Communication** (Chat / Messages)

   _Rationale_: These are daily/weekly touchpoints. Aligns with `page.maintenance`, `feature.facilityBooking`, `page.chat`. Place in first row for quick access.

2. **Community & Engagement** (Social & Discovery)
   - **Directory** (move here or keep prominent)
   - **Groups** / **Interest**
   - **Competitions**
   - **Surveys** / **Campaigns**

   _Rationale_: Groups social features. Competitions + Surveys share workflow (entries, results, notifications). Strong overlap with `competitionRouter` and survey models.

3. **Learning & Growth** (My Learning + Education)
   - **Education Portal** / **Bursaries**
   - **Resources** / **Bookshelf** (if enabled)
   - **Conservation** (if active via tenant setting)

   _Rationale_: Dedicated vertical reduces clutter. Supports `feature.conservation` and external survey integrations.

4. **Finance & Markets** (Monetization & Portfolio)
   - **dWallet**
   - **Marketplace** (services + property listings)
   - **Premium Portfolio** (for Enterprise tier)

   _Rationale_: Keep together for financial context. Ties into `PremiumSeat`, `PropertyListing`, Agent Access models.

5. **Administration & Settings** (Bottom / Collapsible)
   - Group Admin (if user has role)
   - **Settings** (tenant + user)

   _Rationale_: Least frequent for residents; power-user focused. Use role-based visibility (`hasPermission`).

### Visual / Implementation Sketch

```
[New Request] [Book Facility] [+ Add Widget]

Core Services                  (Row 1 – 5 cards)
[Maintenance] [Bookings] [Amenities] [My Services] [Events]

Community & Engagement         (Row 2)
[Directory] [Groups] [Competitions] [Surveys] [Communication]

Learning & Growth              (Row 3 – conditional)
[Education Portal] [Resources] [Conservation]

Finance & Markets              (Row 4)
[dWallet] [Marketplace]

Administration                 (Footer / Sidebar)
[Settings] [Admin Dashboard (role-gated)]
```

**Widget Space Assignment** (per `widget_space_assignment_map.html`):

- Dashboard home: QuickStats + RecentActivity + CompetitionsWidget + ServicesGrid.
- Use `DraggableWidget` + `SpaceLayout` for personalization (Premium tier).

### Technical Implementation Recommendations

1. **Backend Alignment**:
   - Group tRPC procedures by domain (already good: `identityRouter`, `competitionRouter`, maintenance, etc.).
   - Extend `PlatformModule` / `TenantModule` for dynamic enabling.
   - Use `withTenant()` + RLS policies for isolation.

2. **Frontend**:
   - Centralize in `src/widgets/dashboard/` and `page-modules`.
   - Dynamic ordering via tenant `featureFlags` + `getFeaturesForTier`.
   - Responsive grid with Tailwind (update `tailwind.config.cjs` for new semantic colors if needed).

3. **Gating & Personalization**:
   - `canAccessPage()` / `isFeatureEnabled()` from registry.
   - Vercel Feature Flags for phased rollouts (e.g., new "Finance" section).

4. **Migration Path** (Minimal Disruption):
   - Phase 1: Reorder existing cards + add section headers (use Zustand or TanStack for state).
   - Phase 2: Make sections collapsible / configurable via tenant settings.
   - Phase 3: Full widget dashboard personalization (Premium).

### Benefits

- **UX**: Residents find daily tools faster; reduces bounce rate.
- **Adoption**: Highlights high-value modules (Maintenance, Bookings, Competitions).
- **Scalability**: Easier to onboard new tenants with different priorities.
- **Metrics**: Better alignment with AnalyticsWidget for tracking engagement per section.
- **Maintainability**: Cleaner mapping to FSD layers and schema domains (Property/Household, Competition, Maintenance, etc.).

This structure positions **Soralia Village** as a best-in-class reference tenant while providing a flexible foundation for multi-tenant expansion. I recommend reviewing against current user analytics (via Supabase/Postgres queries or Vercel) and iterating with a quick A/B test on the dashboard layout.

Would you like me to:

- Draft the updated `DASHBOARD-PHASE-B` component structure?
- Update the widget registry + feature flags?
- Or generate a Figma-style wireframe description?
