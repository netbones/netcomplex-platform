## Migration Plan — REST → tRPC

### Phase 1: Low-hanging fruit (wire existing tRPC to UI)

**Done (18 files migrated):**

- `provider-queries.ts` → `trpc.providers.*` + `ProvidersLayer.tsx` error codes
- `NotificationsWidget` → `trpc.notifications.list`
- `CompetitionsWidget` → `trpc.competitions.listPublicCompetitions`
- `SurveysWidget` → `trpc.surveys.listSurveys`
- `AgentActivityWidget` → `trpc.agents.getActivity`
- `AgentDashboardWidget` → `trpc.agents.listManagedProperties`
- `MessagesLayer` → `trpc.chat.getMessageUrgency`
- `UserContentWidget` → `trpc.content.listContent`
- `PremiumPortfolioWidget` → `trpc.marketplace.getPortfolio` + `activatePremiumSeat`
- `usePremiumListings` hook → `trpc.marketplace.listPremiumListings`
- `AgentWidget` → `trpc.agents.getMarketplaceActions` + `connectWithAgent`
- `MyHomeSpace` → `trpc.identity.getMyProfile` + `updateMyProfile`
- `AchievementsWidget` → `trpc.achievements.listAchievements` + `getUnlocked`
- `MyDisputesWidget` → `trpc.disputes.listDisputes`
- `AdminDisputesWidget` → multi-status support in `disputes` router

**Phase 1 remaining (need deeper work):**

| Widget                   | Issue                                               |
| ------------------------ | --------------------------------------------------- |
| `HomeLayer`              | Embedded in Promise.all with 10+ fetches            |
| `MyAlbumWidget`          | Multiple endpoints (albums + media — media has gap) |
| `CommunityGalleryWidget` | Same as MyAlbumWidget                               |
| `ServicesLayer`          | Gap: no tRPC for `/api/services/urgency`            |

### Phase 2: Admin tRPC router (new)

✅ **Done** — `src/server/routers/admin/` created with:

- `billing.ts` — `getRevenue`, `getBillingOverview`, `listSubscriptions`
- `activity.ts` — `listActivity`
- Registered in `appRouter`

**Phase 2 widgets wired to admin router:**

| Widget                       | tRPC Procedure                          |
| ---------------------------- | --------------------------------------- |
| `AdminRevenueWidget`         | `trpc.admin.billing.getRevenue`         |
| `AdminBillingOverviewWidget` | `trpc.admin.billing.getBillingOverview` |
| `AdminSubscriptionsWidget`   | `trpc.admin.billing.listSubscriptions`  |
| `AdminActivityStream`        | `trpc.admin.activity.listActivity`      |

### Phase 3: Remaining gaps

- Media gallery (`MyAlbumWidget`, `CommunityGalleryWidget`)
- Services urgency (`ServicesLayer`)
- User profiles (done — `identity.ts` has `getMyProfile`/`updateMyProfile`)
- `HomeLayer` Promise.all refactor

### Phase 4: API deprecation

- Add `deprecated: true` OpenAPI tags on superseded REST routes

### Phase 5: Delete REST duplicates

- Remove legacy REST route files fully covered by tRPC
