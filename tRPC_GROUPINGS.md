**Proposed tRPC Router Groupings for NetComplex**

As your high-level architecture consultant, here is a clean, scalable, and domain-aligned proposal for organizing your **tRPC routers**. This builds directly on the current structure (`identityRouter`, `competitionRouter`, etc.), the service domain re-arrangement I suggested earlier, the Prisma schema, and our Feature-Sliced Design (FSD) principles.

### Guiding Principles

- **Domain-Driven Grouping**: One router per major bounded context (aligns with schema models and UI sections).
- **Single Responsibility**: Keep routers focused (< ~300–400 LOC each where possible).
- **Tier & Permission Awareness**: Procedures should declare required modules/roles via `.meta({ openapi, requiredModule, requiredRole })`.
- **Shared Concerns**: Extract common patterns (tenant scoping, pagination, audit logging) into `shared/api` helpers.
- **OpenAPI Compatibility**: All routers should support `@trpc/openapi` metadata for external/mobile clients.
- **Future-Proofing**: Easy to add sub-routers (e.g., `maintenance.teamRouter`) and support multi-tenant isolation via `withTenant()`.

### Recommended Router Structure

```ts
src/server/routers/
├── index.ts                 # Root router composition
├── core/                    # Foundation-tier essentials
│   ├── identity.ts          # Users, Properties, Households, Profiles, Seats
│   ├── directory.ts         # (if split from identity)
│   ├── content.ts           # Announcements, News, Resources
│   └── settings.ts          # Tenant & user settings
├── community/               # Engagement & social
│   ├── events.ts
│   ├── groups.ts
│   ├── chat.ts              # Conversations + Messages
│   ├── notifications.ts
│   └── competitions.ts      # (already exists)
├── operations/              # Action-oriented modules
│   ├── maintenance.ts       # Requests, Teams, Providers, History
│   ├── bookings.ts          # Facilities + Reservations
│   └── surveys.ts           # Internal + External surveys
├── marketplace/             # Finance & Services
│   ├── services.ts          # CommunityServiceListing, Inquiries, Reviews
│   ├── wallet.ts            # dWallet
│   ├── listings.ts          # Property listings
│   └── agents.ts            # AgentAccess, AgentProfile
├── admin/                   # Platform & tenant admin
│   ├── platform.ts          # Tenant management, modules, feature flags
│   ├── users.ts             # Admin user management
│   └── analytics.ts         # Stats, reports
└── shared/                  # Reusable procedures (not mounted directly)
    ├── base.ts              # Common CRUD, pagination, tenant filters
    └── audit.ts
```

### Root Router (`index.ts`)

```ts
import { router } from '@trpc/server';
import { identityRouter } from './core/identity';
import { competitionsRouter } from './community/competitions';
// ... import others

export const appRouter = router({
  identity: identityRouter,
  competitions: competitionsRouter,
  maintenance: maintenanceRouter,
  bookings: bookingsRouter,
  // ... etc.
});
```

### Detailed Grouping Rationale & Mapping

| Router Group      | Key Procedures / Models                                                        | UI Section Alignment                  | Tier Priority     | Notes                                  |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------- | ----------------- | -------------------------------------- |
| **core/identity** | `listProperties`, `getMyProperties`, `listUsers`, profiles, seats, agentAccess | Directory, My Home                    | Foundation        | Central to multi-tenant identity model |
| **core/content**  | Announcements, Resources, Pages                                                | News, Resources                       | Foundation        | Reusable across many pages             |
| **community/**    | Events, Groups, Chat, Competitions, Surveys                                    | Competitions & Surveys, Groups, Chat  | Foundation/Growth | High engagement cluster                |
| **operations/**   | Maintenance (full workflow), Bookings                                          | Service Areas (Maintenance, Bookings) | Growth            | Action-heavy with status/history       |
| **marketplace/**  | Services, Listings, dWallet, Agents                                            | Finance & Markets, My Services        | Depth/Enterprise  | Monetization & premium features        |
| **admin/**        | Platform config, tenant modules, analytics                                     | Settings + Admin views                | All (role-gated)  | Platform vs tenant admin split         |

### Additional Recommendations

1. **Procedure Metadata** (enhance existing pattern):

   ```ts
   .meta({
     openapi: { ... },
     requiredModule: 'page.maintenance',   // from FEATURE_REGISTRY
     requiredRole: ['RESIDENT', 'BOARD'],
   })
   ```

2. **Shared Utilities** (already partially in place):
   - `withTenant()`, `runWithRLS()`
   - Pagination + filtering helpers
   - Audit logging on mutations

3. **Migration Path** (Low Disruption):
   - **Short-term**: Move existing `identity.ts` and `competitions.ts` into the new folders. Update imports.
   - **Medium-term**: Split large routers (e.g., extract `chatRouter` from a future combined router).
   - **Long-term**: Consider nested routers for complex domains (`maintenance.teamRouter`).

4. **Performance & Caching**:
   - Use `unstable_cache` + tags per domain (e.g., `['maintenance', tenantId]`).
   - Separate query vs mutation routers where helpful for TanStack Query invalidation.

5. **Testing & OpenAPI**:
   - Keep `api:generate` working across all routers.
   - Update E2E tests (`e2e/`) and Vitest suites to reflect new structure.

### Benefits of This Grouping

- **Developer Experience**: Clear mental model — “Where do I put a new maintenance status update?” → `operations/maintenance.ts`.
- **Scalability**: Easy to add new tenants/modules without router bloat.
- **Security**: Easier to apply consistent tenant/RLS/permission guards per domain.
- **UI Alignment**: Direct mapping to the proposed dashboard sections and widget registry.
- **Mobile/API**: Clean OpenAPI paths like `/identity/properties`, `/operations/maintenance`, etc.

**✅ Optimized tRPC Router Groupings – Refined for Your Current Tree**

Thank you for sharing the actual `src/server/routers/` structure. Your current setup is already **quite good** (you have started nesting in `chat`, `maintenance`, `marketplace`, and `surveys`), but it can be made significantly cleaner, more maintainable, and better aligned with the **service domain arrangement** I proposed earlier.

### Proposed Final Structure (Recommended)

```bash
src/server/routers/
├── index.ts                          # Root composition only
│
├── core/                             # Foundation + Identity layer
│   ├── identity.ts                   # Users, Properties, Households, Profiles, Seats
│   ├── households.ts
│   ├── invitations.ts
│   ├── delegations.ts
│   ├── settings.ts
│   └── platform.ts                   # Tenant/platform config (moved here)
│
├── community/                        # Social & Engagement
│   ├── chat/
│   │   ├── conversations.ts
│   │   ├── messaging.ts
│   │   └── shared.ts
│   ├── groups.ts
│   ├── events.ts
│   ├── competitions.ts
│   ├── merits.ts                     # Merits & Behavior
│   ├── achievements.ts
│   ├── notifications.ts
│   └── content.ts                    # Announcements, Resources, etc.
│
├── operations/                       # Action & Workflow heavy
│   ├── maintenance/
│   │   ├── maintenance-requests.ts
│   │   ├── maintenance-teams.ts
│   │   ├── maintenance-providers.ts
│   │   ├── maintenance-categories.ts
│   │   └── shared.ts
│   ├── bookings.ts
│   ├── surveys/
│   │   ├── survey-management.ts
│   │   ├── survey-questions.ts
│   │   ├── survey-sections.ts
│   │   ├── external.ts
│   │   └── shared.ts
│   ├── disputes.ts
│   └── providers.ts                  # General service providers
│
├── marketplace/                      # Finance, Services & Premium
│   ├── marketplace.ts                # Main entry (if needed)
│   ├── listings.ts
│   ├── inquiries.ts
│   ├── reviews.ts
│   ├── service-bookings.ts
│   ├── analytics.ts
│   ├── moderation.ts
│   ├── urgency.ts
│   ├── checkout.ts
│   ├── premium.ts
│   └── shared.ts
│
├── education/                        # Learning & Growth
│   └── education.ts
│
├── admin/                            # Admin-only (platform + tenant)
│   ├── users.ts                      # (if split)
│   └── admin-specific logic
│
└── shared/                           # Reusable base procedures
    ├── base.ts
    ├── audit.ts
    └── utils.ts
```

### Why This Grouping?

| Group            | Purpose                             | Current Files Covered                                                                              | Alignment with UI / Architecture      |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **core/**        | Identity + foundational tenant data | `identity`, `households`, `invitations`, `settings`, `platform`                                    | Directory, My Home, Settings          |
| **community/**   | Social, content, engagement         | `chat/*`, `groups`, `events`, `competitions`, `merits`, `achievements`, `notifications`, `content` | Community & Engagement section        |
| **operations/**  | Workflow & operational services     | `maintenance/*`, `bookings`, `surveys/*`, `disputes`, `providers`                                  | Core Services (Maintenance, Bookings) |
| **marketplace/** | Commercial & financial features     | All `marketplace/*` + `dwallet`                                                                    | Finance & Markets                     |
| **education/**   | Learning-specific modules           | `education.ts`                                                                                     | My Learning                           |
| **admin/**       | Administrative tools                | Future split                                                                                       | Settings + Admin                      |

### Migration Steps (Low Risk)

1. **Create new folders**:

   ```bash
   mkdir -p src/server/routers/core \
             src/server/routers/community \
             src/server/routers/operations \
             src/server/routers/education \
             src/server/routers/admin \
             src/server/routers/shared
   ```

2. **Move files** (example commands):

   ```bash
   mv src/server/routers/identity.ts src/server/routers/core/
   mv src/server/routers/households.ts src/server/routers/core/
   mv src/server/routers/chat src/server/routers/community/
   mv src/server/routers/competitions.ts src/server/routers/community/
   mv src/server/routers/maintenance src/server/routers/operations/
   # ... continue for others
   ```

3. **Update imports** in `index.ts` and all files that import routers.

4. **Update root `index.ts`**:

   ```ts
   import { router } from '@trpc/server';
   import { identityRouter } from './core/identity';
   import { communityRouter } from './community'; // or individual
   // ...

   export const appRouter = router({
     core: identityRouter, // or flatten as you prefer
     community: communityRouter,
     operations: operationsRouter,
     marketplace: marketplaceRouter,
     education: educationRouter,
     // admin, etc.
   });
   ```

### Optional Refinements

- **Flatten vs Nested**: You can keep `router({ identity: identityRouter, ... })` (flat paths) or nest further for cleaner URLs.
- **Shared Sub-Routers**: Keep `shared.ts` inside domains when logic is domain-specific (as you already do).
- **Feature Flags**: Add `.meta({ requiredModule: 'page.maintenance' })` to procedures.

---

**Would you like me to**:

1. Write the full updated `index.ts` for you?
2. Provide a complete migration script / step-by-step commands?
3. Refactor one specific router (e.g. `maintenance` or `marketplace`) as an example?
4. Update the OpenAPI generator or registry to match?

Just say the word and I’ll deliver the exact code/files. This reorganization will make future development much smoother and better aligned with the dashboard domains.
