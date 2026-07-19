## Migration Plan — REST → tRPC

### Phase 1: Low-hanging fruit (wire existing tRPC to UI)

**Done (10 files migrated):**
- `provider-queries.ts` → `trpc.providers.*` + `ProvidersLayer.tsx` error codes
- `NotificationsWidget` → `trpc.notifications.list`
- `CompetitionsWidget` → `trpc.competitions.listPublicCompetitions`
- `SurveysWidget` → `trpc.surveys.listSurveys`
- `AgentActivityWidget` → `trpc.agents.getActivity`
- `AgentDashboardWidget` → `trpc.agents.listManagedProperties`
- `MessagesLayer` → `trpc.chat.getMessageUrgency`
- `UserContentWidget` → `trpc.content.listContent`

**Remaining (need deeper work):**

| Widget | Issue |
|--------|-------|
| `AgentWidget` | Complex: useApiToast + mutation + tabs |
| `PremiumPortfolioWidget` | Complex: useApiToast + portfolio creation flow |
| `MyHomeSpace` | Gap: no tRPC user GET/PATCH procedure |
| `HomeLayer` | Embedded in Promise.all with 10+ fetches |
| `AchievementsWidget` | Needs combined listAchievements + getUnlocked |
| `MyAlbumWidget` | Multiple endpoints (albums + media — media has gap) |
| `CommunityGalleryWidget` | Same as MyAlbumWidget |
| `ServicesLayer` | Gap: no tRPC for `/api/services/urgency` |
| `MyDisputesWidget` | Non-trivial multi-status query params |
| `AdminDisputesWidget` | Needs multi-status support in tRPC input schema |
| `AdminRevenueWidget` | Gap: no admin billing tRPC router |
| `AdminBillingOverviewWidget` | Gap: no admin billing tRPC router |
| `AdminSubscriptionsWidget` | Gap: no admin billing tRPC router |
| `AdminActivityStream` | Gap: no admin activity tRPC procedure |

### Phase 2: Admin tRPC router (new)
- Create `src/server/routers/admin/` with billing, activity, system procedures

### Phase 3: Remaining gaps
- Media gallery, services urgency, user profiles

### Phase 4: API deprecation
- Add `deprecated: true` OpenAPI tags on superseded REST routes

### Phase 5: Delete REST duplicates
- Remove legacy REST route files fully covered by tRPC
