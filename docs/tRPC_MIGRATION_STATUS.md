# REST API Route Coverage Report: tRPC Migration Status

**Updated:** 2026-06-28 — Phase 120 complete. 20 domains live.

## 1. Existing tRPC Routers (20 domains, 34 files)

| tRPC Router     | Sub-Routers                                                                                       | Key Procedures                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`      | —                                                                                                 | `listProperties`, `getProperty`, `createProperty`, `listUsers`, `listHouseholds`, `createHousehold`, `getMySeat`, `listSeats`, `listAlbums`, `getAlbum`, `createAlbum`, `updateAlbum`, `deleteAlbum`, `listPublicAlbums`, `listSuspensions`, `suspendUser`, `unsuspendUser`, `listAgentAccesses`, `getDashboardStats`, `listUserBooks`                                                                                                                                 |
| `competitions`  | —                                                                                                 | `listPublicCompetitions`, `getCompetitionDetail`, `joinCompetition`, `submitPhotoEntry`, `listParticipants`, `updateEntry`, `markWinner`, `drawWinners`, `listWinners`                                                                                                                                                                                                                                                                                                 |
| `content`       | —                                                                                                 | `listContent`, `getContent`, `createContent`, `updateContent`, `softDeleteContent`, `moderateContent`, `toggleLike`, `listAnnouncements`, `getAnnouncement`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`, `getCampaignPage`, `getConservationPage`                                                                                                                                                                                                |
| `notifications` | —                                                                                                 | `list`, `create`, `markRead`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `resources`     | —                                                                                                 | `listResources`, `getResource`, `createResource`, `updateResource`, `deleteResource`, `incrementDownloadCount`                                                                                                                                                                                                                                                                                                                                                         |
| `maintenance`   | requests, teams, cats, providers                                                                  | `listRequests`, `getRequest`, `createRequest`, `updateRequest`, `deleteRequest`, `listNotes`, `createNote`, `assignRequest`, `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `listProviders`, `createProvider`, `updateProvider`, `deleteProvider`, `listTeams`, `createTeam`, `updateTeam`, `deleteTeam`                                                                                                                                      |
| `chat`          | conversations, messaging                                                                          | `listConversations`, `createConversation`, `findOrCreateConversation`, `getMessages`, `sendMessage`, `deleteMessage`, `getMessageUrgency`, `getUnreadCounts`, `markAsRead`                                                                                                                                                                                                                                                                                             |
| `surveys`       | management, questions, sections, external                                                         | `listSurveys`, `getSurvey`, `createSurvey`, `updateSurvey`, `deleteSurvey`, `submitResponse`, `getSurveyResults`, `addQuestion`, `updateQuestion`, `removeQuestion`, `reorderQuestions`, `addSection`, `updateSection`, `removeSection`, `reorderSections`, `listExternalSurveys`, `submitExternalSurveyResponse`                                                                                                                                                      |
| `events`        | —                                                                                                 | `listEvents`, `getEvent`, `createEvent`, `updateEvent`, `deleteEvent`, `listRegistrations`, `registerForEvent`, `cancelRegistration`                                                                                                                                                                                                                                                                                                                                   |
| `bookings`      | —                                                                                                 | `listFacilities`, `getFacility`, `listBookings`, `getBooking`, `createBooking`, `cancelBooking`                                                                                                                                                                                                                                                                                                                                                                        |
| `disputes`      | —                                                                                                 | `listDisputes`, `getDispute`, `createDispute`, `updateDispute`, `addDisputeMessage`, `listDisputeMessages`, `assignDispute`, `submitDispute`, `resolveDispute`, `issueRuling`, `getEvents`                                                                                                                                                                                                                                                                             |
| `dwallet`       | —                                                                                                 | `getWalletSummary`, `getBalance`, `listTransactions`, `getTransaction`, `createPayout`, `listPayouts`, `listConsents`, `createConsent`, `revokeConsent`, `listStreams`, `getStream`                                                                                                                                                                                                                                                                                    |
| `marketplace`   | listings, reviews, inquiries, moderation, analytics, checkout, premium, service-bookings, urgency | `listListings`, `getListing`, `createListing`, `updateListing`, `deleteListing`, `publishListing`, `createReview`, `listReviews`, `createInquiry`, `listInquiries`, `respondToInquiry`, `moderateListing`, `getAnalytics`, `createCheckoutSession`, `handleWebhook`, `listPremiumListings`, `createPremiumListing`, `getPortfolio`, `upgradePortfolio`, `listServiceBookings`, `createServiceBooking`, `getServiceBooking`, `cancelServiceBooking`, `getUrgencyLevels` |
| `groups`        | —                                                                                                 | `listGroups`, `getGroup`, `createGroup`, `updateGroup`, `deleteGroup`, `joinGroup`, `leaveGroup`, `listMembers`, `updateMemberRole`, `removeMember`                                                                                                                                                                                                                                                                                                                    |
| `merits`        | —                                                                                                 | `listMerits`, `getMerit`, `createMerit`, `updateMerit`, `deleteMerit`, `awardMerit`, `getUserMerits`, `dispute`, `resolveDispute`                                                                                                                                                                                                                                                                                                                                      |
| `settings`      | —                                                                                                 | `listSettings`, `getSetting`, `upsertSetting`, `deleteSetting`, `getContactSettings`                                                                                                                                                                                                                                                                                                                                                                                   |
| `achievements`  | —                                                                                                 | `listAchievements`, `getAchievement`, `createAchievement`, `updateAchievement`, `deleteAchievement`, `getMyProgress`, `getAchievementProgress`, `getUnlocked`                                                                                                                                                                                                                                                                                                          |
| `invitations`   | —                                                                                                 | `listInvitations`, `getInvitation`, `createInvitation`, `cancelInvitation`, `acceptInvitation`, `validateInvitation`, `resendInvitation`                                                                                                                                                                                                                                                                                                                               |
| `agents`        | —                                                                                                 | `getActivity`, `listManagedProperties`, `getMarketplaceActions`, `connectWithAgent`                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 2. All REST Route Files — Grouped by Domain with Coverage Status

### COMPETITIONS — ✅ COVERED

| REST Route                                         | tRPC Coverage                            |
| -------------------------------------------------- | ---------------------------------------- |
| `src/app/api/competitions/route.ts`                | `competitions.listPublicCompetitions`    |
| `src/app/api/competitions/[id]/route.ts`           | `competitions.getCompetitionDetail`      |
| `src/app/api/v1/public/competitions/route.ts`      | Re-exports from `/competitions/route.ts` |
| `src/app/api/v1/tenant/competitions/route.ts`      | Re-exports from `/competitions/route.ts` |
| `src/app/api/v1/tenant/competitions/[id]/route.ts` | Re-exports                               |

### CONTENT — ✅ COVERED

| REST Route                                    | tRPC Coverage                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app/api/content/route.ts`                | `content.listContent`, `content.createContent`                             |
| `src/app/api/content/[id]/route.ts`           | `content.getContent`, `content.updateContent`, `content.softDeleteContent` |
| `src/app/api/content/[id]/like/route.ts`      | `content.getLikes`, `content.toggleLike`                                   |
| `src/app/api/content/[id]/moderate/route.ts`  | `content.moderateContent`                                                  |
| `src/app/api/v1/public/content/route.ts`      | Re-export                                                                  |
| `src/app/api/v1/tenant/content/route.ts`      | Re-export                                                                  |
| `src/app/api/v1/tenant/content/[id]/route.ts` | Re-export                                                                  |

### EVENTS — ✅ COVERED

| REST Route                                   | tRPC Coverage                                                 |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/app/api/events/route.ts`                | `events.listEvents`, `events.createEvent`                     |
| `src/app/api/events/[id]/route.ts`           | `events.getEvent`, `events.updateEvent`, `events.deleteEvent` |
| `src/app/api/events/[id]/register/route.ts`  | `events.registerForEvent`, `events.cancelRegistration`        |
| `src/app/api/v1/public/events/route.ts`      | Re-export                                                     |
| `src/app/api/v1/tenant/events/route.ts`      | Re-export                                                     |
| `src/app/api/v1/tenant/events/[id]/route.ts` | Re-export                                                     |

### BOOKINGS — ✅ COVERED

| REST Route                                | tRPC Coverage                                     |
| ----------------------------------------- | ------------------------------------------------- |
| `src/app/api/bookings/route.ts`           | `bookings.listBookings`, `bookings.createBooking` |
| `src/app/api/v1/tenant/bookings/route.ts` | Re-export                                         |

### GROUPS — ✅ COVERED

| REST Route                                             | tRPC Coverage                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `src/app/api/groups/route.ts`                          | `groups.listGroups`, `groups.createGroup`                     |
| `src/app/api/groups/[id]/route.ts`                     | `groups.getGroup`, `groups.updateGroup`, `groups.deleteGroup` |
| `src/app/api/groups/members/route.ts`                  | `groups.listMembers`                                          |
| `src/app/api/groups/membership-requests/route.ts`      | Similar functionality (not exact match)                       |
| `src/app/api/groups/membership-requests/[id]/route.ts` | Similar functionality                                         |
| `src/app/api/v1/tenant/groups/*` (5 routes)            | Re-exports                                                    |

### DISPUTES — ✅ COVERED

| REST Route                                       | tRPC Coverage                                                |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `src/app/api/disputes/route.ts`                  | `disputes.listDisputes`, `disputes.createDispute`            |
| `src/app/api/disputes/[id]/route.ts`             | `disputes.getDispute`, `disputes.updateDispute`              |
| `src/app/api/disputes/[id]/assign/route.ts`      | `disputes.assignDispute`                                     |
| `src/app/api/disputes/[id]/messages/route.ts`    | `disputes.listDisputeMessages`, `disputes.addDisputeMessage` |
| `src/app/api/disputes/[id]/ruling/route.ts`      | `disputes.issueRuling`                                       |
| `src/app/api/disputes/[id]/submit/route.ts`      | `disputes.submitDispute`                                     |
| `src/app/api/disputes/[id]/evidence/route.ts`    | Evidence-specific (not a dedicated tRPC proc)                |
| `src/app/api/disputes/[id]/csos-export/route.ts` | CSOS export admin (not in tRPC)                              |
| `src/app/api/disputes/intake-screen/route.ts`    | Intake screen data (not in tRPC)                             |

### IDENTITY / USERS — ⬜️ PARTIALLY COVERED

| REST Route                                    | tRPC Coverage                              | Status    |
| --------------------------------------------- | ------------------------------------------ | --------- |
| `src/app/api/users/route.ts`                  | `identity.listUsers`                       | Covered   |
| `src/app/api/users/[id]/route.ts`             | `identity.listUsers` includes get          | Covered   |
| `src/app/api/users/[id]/suspend/route.ts`     | Not in tRPC                                | Uncovered |
| `src/app/api/users/[id]/unsuspend/route.ts`   | Not in tRPC                                | Uncovered |
| `src/app/api/users/[id]/suspensions/route.ts` | Not in tRPC                                | Uncovered |
| `src/app/api/users/[id]/books/route.ts`       | Not in tRPC                                | Uncovered |
| `src/app/api/households/route.ts`             | `identity.listHouseholds`                  | Covered   |
| `src/app/api/households/[id]/route.ts`        | Not explicit (covered via `getProperty`)   | Covered   |
| `src/app/api/user/tags/route.ts`              | Not in tRPC                                | Uncovered |
| `src/app/api/user/albums/route.ts`            | Not in tRPC                                | Uncovered |
| `src/app/api/user/albums/public/route.ts`     | Not in tRPC                                | Uncovered |
| `src/app/api/seats/route.ts`                  | Not in tRPC (solo/premium seat management) | Uncovered |
| `src/app/api/v1/tenant/users/route.ts`        | Re-export                                  | —         |
| `src/app/api/v1/tenant/users/[id]/route.ts`   | Re-export                                  | —         |

### CHAT / MESSAGES — ✅ COVERED

| REST Route                                          | tRPC Coverage                                       |
| --------------------------------------------------- | --------------------------------------------------- |
| `src/app/api/conversations/route.ts`                | `chat.listConversations`, `chat.createConversation` |
| `src/app/api/conversations/find/route.ts`           | `chat.findOrCreateConversation`                     |
| `src/app/api/messages/route.ts`                     | `chat.getMessages`, `chat.sendMessage`              |
| `src/app/api/messages/unread/route.ts`              | `chat.getUnreadCounts`                              |
| `src/app/api/messages/urgency/route.ts`             | `chat.getMessageUrgency`                            |
| `src/app/api/v1/tenant/conversations/route.ts`      | Re-export                                           |
| `src/app/api/v1/tenant/conversations/find/route.ts` | Re-export                                           |
| `src/app/api/v1/tenant/messages/route.ts`           | Re-export                                           |
| `src/app/api/v1/tenant/messages/unread/route.ts`    | Re-export                                           |

### RESOURCES — ✅ COVERED

| REST Route                                      | tRPC Coverage                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/app/api/resources/route.ts`                | `resources.listResources`, `resources.createResource`                           |
| `src/app/api/resources/[id]/route.ts`           | `resources.getResource`, `resources.updateResource`, `resources.deleteResource` |
| `src/app/api/resources/[id]/download/route.ts`  | `resources.incrementDownloadCount`                                              |
| `src/app/api/v1/public/resources/route.ts`      | Re-export                                                                       |
| `src/app/api/v1/tenant/resources/route.ts`      | Re-export                                                                       |
| `src/app/api/v1/tenant/resources/[id]/route.ts` | Re-export                                                                       |

### NOTIFICATIONS — ✅ COVERED

| REST Route                                     | tRPC Coverage                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `src/app/api/notifications/route.ts`           | `notifications.list`, `notifications.create`, `notifications.markRead` |
| `src/app/api/notifications/[id]/route.ts`      | `notifications.delete`                                                 |
| `src/app/api/v1/tenant/notifications/route.ts` | Re-export                                                              |

### MAINTENANCE — ✅ COVERED

| REST Route                                         | tRPC Coverage                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/app/api/maintenance/route.ts`                 | `maintenance.listRequests`, `maintenance.createRequest`                            |
| `src/app/api/maintenance/[id]/route.ts`            | `maintenance.getRequest`, `maintenance.updateRequest`, `maintenance.deleteRequest` |
| `src/app/api/maintenance/[id]/assign/route.ts`     | `maintenance.assignRequest`                                                        |
| `src/app/api/maintenance/[id]/notes/route.ts`      | `maintenance.listNotes`, `maintenance.createNote`                                  |
| `src/app/api/maintenance/[id]/history/route.ts`    | Not explicit in tRPC (part of request data)                                        |
| `src/app/api/maintenance/[id]/notify/route.ts`     | Not in tRPC                                                                        |
| `src/app/api/maintenance/categories/route.ts`      | `maintenance.listCategories`, `maintenance.createCategory`                         |
| `src/app/api/maintenance/categories/[id]/route.ts` | `maintenance.updateCategory`, `maintenance.deleteCategory`                         |
| `src/app/api/maintenance/providers/route.ts`       | `maintenance.listProviders`, `maintenance.createProvider`                          |
| `src/app/api/maintenance/providers/[id]/route.ts`  | `maintenance.updateProvider`, `maintenance.deleteProvider`                         |
| `src/app/api/maintenance/teams/route.ts`           | `maintenance.listTeams`, `maintenance.createTeam`                                  |
| `src/app/api/maintenance/teams/[id]/route.ts`      | `maintenance.updateTeam`, `maintenance.deleteTeam`                                 |
| `src/app/api/v1/tenant/maintenance/route.ts`       | Re-export                                                                          |

### SURVEYS — ✅ COVERED

| REST Route                                                 | tRPC Coverage                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/app/api/surveys/route.ts`                             | `surveys.listSurveys`, `surveys.createSurvey`                       |
| `src/app/api/surveys/[id]/route.ts`                        | `surveys.getSurvey`, `surveys.updateSurvey`, `surveys.deleteSurvey` |
| `src/app/api/surveys/[id]/questions/route.ts`              | `surveys.addQuestion`                                               |
| `src/app/api/surveys/[id]/questions/[questionId]/route.ts` | `surveys.updateQuestion`, `surveys.removeQuestion`                  |
| `src/app/api/surveys/[id]/questions/reorder/route.ts`      | `surveys.reorderQuestions`                                          |
| `src/app/api/surveys/[id]/responses/route.ts`              | `surveys.submitResponse`                                            |
| `src/app/api/surveys/[id]/sections/route.ts`               | `surveys.addSection`                                                |
| `src/app/api/surveys/[id]/sections/[sectionId]/route.ts`   | `surveys.updateSection`, `surveys.removeSection`                    |
| `src/app/api/surveys/[id]/sections/reorder/route.ts`       | `surveys.reorderSections`                                           |
| `src/app/api/v1/tenant/surveys/route.ts`                   | Re-export                                                           |

### MARKETPLACE / COMMUNITY SERVICES — ⬜️ PARTIALLY COVERED

| REST Route                                                         | tRPC Coverage                                                                      | Status    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------- |
| `src/app/api/community-services/listings/route.ts`                 | `marketplace.listListings`, `marketplace.createListing`                            | Covered   |
| `src/app/api/community-services/listings/[id]/route.ts`            | `marketplace.getListing`, `marketplace.updateListing`, `marketplace.deleteListing` | Covered   |
| `src/app/api/community-services/listings/[id]/publish/route.ts`    | `marketplace.publishListing`                                                       | Covered   |
| `src/app/api/community-services/listings/related/route.ts`         | `marketplace.getRelatedListings`                                                   | Covered   |
| `src/app/api/community-services/inquiries/route.ts`                | `marketplace.createInquiry`, `marketplace.listInquiries`                           | Covered   |
| `src/app/api/community-services/provider/inquiries/[id]/route.ts`  | `marketplace.respondToInquiry`                                                     | Covered   |
| `src/app/api/community-services/reviews/[listingId]/route.ts`      | `marketplace.listReviews`, `marketplace.createReview`                              | Covered   |
| `src/app/api/community-services/analytics/route.ts`                | `marketplace.getAnalytics`                                                         | Covered   |
| `src/app/api/community-services/moderation/listings/[id]/route.ts` | `marketplace.moderateListing`                                                      | Covered   |
| `src/app/api/marketplace/checkout/route.ts`                        | Not in marketplace tRPC                                                            | Uncovered |
| `src/app/api/marketplace/webhook/route.ts`                         | Not in marketplace tRPC                                                            | Uncovered |
| `src/app/api/service-bookings/route.ts`                            | Not in marketplace tRPC (uses `serviceBookings` table)                             | Uncovered |
| `src/app/api/services/[id]/availability/route.ts`                  | `marketplace.getAvailability`                                                      | Covered   |
| `src/app/api/services/urgency/route.ts`                            | Not in tRPC (different concept)                                                    | Uncovered |
| `src/app/api/premium/listings/route.ts`                            | Not in tRPC (premium/portfolio listings)                                           | Uncovered |
| `src/app/api/premium/portfolio/route.ts`                           | Not in tRPC                                                                        | Uncovered |
| `src/app/api/v1/tenant/community-services/*` (4 routes)            | Re-exports                                                                         | —         |

### DWALLET — ✅ COVERED

| REST Route                                                    | tRPC Coverage                     |
| ------------------------------------------------------------- | --------------------------------- |
| `src/app/api/v1/tenant/dwallet/route.ts`                      | Re-export                         |
| `src/app/api/v1/tenant/dwallet/consents/route.ts`             | Re-export                         |
| `src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts` | Re-export                         |
| `src/app/api/v1/tenant/dwallet/deletion-request/route.ts`     | Not in tRPC (data deletion)       |
| `src/app/api/v1/tenant/dwallet/export/route.ts`               | Not in tRPC (data export)         |
| `src/app/api/v1/tenant/dwallet/payout/route.ts`               | Re-export                         |
| `src/app/api/v1/tenant/dwallet/statement/route.ts`            | Not exact match in tRPC but close |
| `src/app/api/v1/tenant/dwallet/streams/route.ts`              | Re-export                         |
| `src/app/api/v1/tenant/dwallet/transactions/route.ts`         | Re-export                         |

### MERITS — ✅ COVERED

| REST Route                                 | tRPC Coverage                                                 |
| ------------------------------------------ | ------------------------------------------------------------- |
| `src/app/api/merits/route.ts`              | `merits.listMerits`, `merits.createMerit`                     |
| `src/app/api/merits/[id]/route.ts`         | `merits.getMerit`, `merits.updateMerit`, `merits.deleteMerit` |
| `src/app/api/merits/[id]/dispute/route.ts` | `merits.dispute`                                              |
| `src/app/api/merits/[id]/resolve/route.ts` | `merits.resolveDispute`                                       |

---

## 3. Domains with No tRPC Router — ❌ NOT COVERED

### ADMIN (Platform Management) — Stay REST

All routes under `src/app/api/admin/`. Admin-only web pages and platform management endpoints. Not candidates for tRPC migration.

| REST Route                                         | Description               | Migrate?  |
| -------------------------------------------------- | ------------------------- | --------- |
| `admin/achievements/[id]/route.ts`                 | Admin achievements CRUD   | Stay REST |
| `admin/activity/route.ts`                          | Admin activity log        | Stay REST |
| `admin/analytics/providers/route.ts`               | Provider analytics        | Stay REST |
| `admin/board-members/route.ts`                     | Board member management   | Stay REST |
| `admin/bookings/route.ts`                          | Admin booking management  | Stay REST |
| `admin/dwallet/batches/route.ts`                   | DWallet batch management  | Stay REST |
| `admin/dwallet/payouts/route.ts`                   | DWallet payout management | Stay REST |
| `admin/dwallet/payouts/[id]/route.ts`              | Payout detail             | Stay REST |
| `admin/dwallet/stats/route.ts`                     | DWallet statistics        | Stay REST |
| `admin/dwallet/streams/route.ts`                   | Revenue stream management | Stay REST |
| `admin/dwallet/streams/[id]/route.ts`              | Stream detail             | Stay REST |
| `admin/maintenance-stats/route.ts`                 | Maintenance analytics     | Stay REST |
| `admin/media/route.ts`                             | Media management          | Stay REST |
| `admin/merits/recalculate/route.ts`                | Merit recalculation       | Stay REST |
| `admin/platform/ai-pool/*` (6 routes)              | AI Pool management        | Stay REST |
| `admin/platform/assist/route.ts`                   | Platform assist           | Stay REST |
| `admin/platform/assist/[id]/route.ts`              | Assist detail             | Stay REST |
| `admin/platform/billing/*` (5 routes)              | Platform billing admin    | Stay REST |
| `admin/platform/tenants/route.ts`                  | Tenant management         | Stay REST |
| `admin/platform/tenants/[id]/route.ts`             | Tenant detail             | Stay REST |
| `admin/providers/*` (9 routes)                     | Provider management admin | Stay REST |
| `admin/revenue/details/route.ts`                   | Revenue details           | Stay REST |
| `admin/revenue/summary/route.ts`                   | Revenue summary           | Stay REST |
| `admin/services-config/route.ts`                   | Services configuration    | Stay REST |
| `admin/settings/page-flags/route.ts`               | Page flag settings        | Stay REST |
| `admin/system/health/route.ts`                     | System health             | Stay REST |
| `admin/tenant/provider-registration-mode/route.ts` | Registration mode         | Stay REST |
| `admin/transactions/route.ts`                      | Transaction management    | Stay REST |
| `admin/transactions/[id]/refund/route.ts`          | Refund processing         | Stay REST |
| `admin/urgency/route.ts`                           | Urgency management        | Stay REST |

### AUTH — Stay REST

| REST Route                        | Description         | Migrate?                           |
| --------------------------------- | ------------------- | ---------------------------------- |
| `auth/[...all]/route.ts`          | Better Auth handler | Stay REST (handled by Better Auth) |
| `auth/signup/route.ts`            | Signup endpoint     | Stay REST                          |
| `auth/suspension-status/route.ts` | Check suspension    | Stay REST                          |

### SYSTEM / INFRASTRUCTURE — Stay REST

| REST Route                       | Description             | Migrate?      |
| -------------------------------- | ----------------------- | ------------- |
| `health/route.ts`                | Health check            | Stay REST     |
| `openapi.json/route.ts`          | OpenAPI spec generation | Stay REST     |
| `purge/route.ts`                 | Cache/data purge        | Stay REST     |
| `trpc/[trpc]/route.ts`           | tRPC HTTP handler       | (tRPC itself) |
| `cron/ai-pool-rollover/route.ts` | Cron job                | Stay REST     |
| `gate/context/route.ts`          | Tenant context gate     | Stay REST     |
| `flags/route.ts`                 | Feature flags           | Stay REST     |
| `v1/system/flags/route.ts`       | V1 system flags         | Re-export     |
| `v1/system/health/route.ts`      | V1 health check         | Re-export     |

### ACHIEVEMENTS — ❌ NOT COVERED, Candidate for tRPC

| REST Route                       | Description               | Effort | Migrate?                     |
| -------------------------------- | ------------------------- | ------ | ---------------------------- |
| `achievements/route.ts`          | List/create achievements  | Small  | Yes, new achievements router |
| `achievements/progress/route.ts` | User achievement progress | Small  | Yes                          |

### ACCESS CONTROL — ❌ NOT COVERED, Stay REST

| REST Route        | Description                         | Effort | Migrate?                                            |
| ----------------- | ----------------------------------- | ------ | --------------------------------------------------- |
| `access/route.ts` | Page access resolution (nav guards) | Small  | Stay REST (entity-driven, called by middleware/nav) |

### AGENTS (Provider) — ❌ NOT COVERED, Candidate for tRPC

| REST Route                           | Description               | Effort | Migrate?                                          |
| ------------------------------------ | ------------------------- | ------ | ------------------------------------------------- |
| `agents/activity/route.ts`           | Agent activity feed       | Medium | Yes, integrate into identity or new agents router |
| `agents/managed-properties/route.ts` | Agent-managed properties  | Medium | Yes                                               |
| `agents/marketplace/route.ts`        | Agent marketplace actions | Medium | Yes                                               |
| `v1/tenant/agents/*` (3 routes)      | Re-exports                | —      | —                                                 |

### ANNOUNCEMENTS — ❌ NOT COVERED, Candidate for tRPC

| REST Route                             | Description               | Effort | Migrate?                           |
| -------------------------------------- | ------------------------- | ------ | ---------------------------------- |
| `announcements/route.ts`               | List/create announcements | Small  | Yes, integrate into content router |
| `announcements/[id]/route.ts`          | Single announcement CRUD  | Small  | Yes                                |
| `v1/tenant/announcements/*` (2 routes) | Re-exports                | —      | —                                  |

### CAMPAIGN — ❌ NOT COVERED, Candidate for tRPC

| REST Route                    | Description           | Effort | Migrate?                           |
| ----------------------------- | --------------------- | ------ | ---------------------------------- |
| `campaign/route.ts`           | Campaign page content | Small  | Yes, integrate into content router |
| `v1/tenant/campaign/route.ts` | Re-export             | —      | —                                  |

### CONSERVATION — ❌ NOT COVERED, Candidate for tRPC

| REST Route                        | Description                 | Effort | Migrate?                           |
| --------------------------------- | --------------------------- | ------ | ---------------------------------- |
| `conservation/route.ts`           | Conservation module content | Small  | Yes, integrate into content router |
| `v1/tenant/conservation/route.ts` | Re-export                   | —      | —                                  |

### DASHBOARD STATS — ❌ NOT COVERED, Candidate for tRPC

| REST Route                 | Description             | Effort | Migrate?                                     |
| -------------------------- | ----------------------- | ------ | -------------------------------------------- |
| `dashboard/stats/route.ts` | Dashboard summary stats | Small  | Yes, new dashboard router or extend identity |

### EXTERNAL SURVEYS — ❌ NOT COVERED, Candidate for tRPC

| REST Route                  | Description                     | Effort | Migrate?                   |
| --------------------------- | ------------------------------- | ------ | -------------------------- |
| `external-surveys/route.ts` | External (non-resident) surveys | Small  | Yes, extend surveys router |

### INVITATIONS — ❌ NOT COVERED, Candidate for tRPC

| REST Route                           | Description               | Effort | Migrate?                    |
| ------------------------------------ | ------------------------- | ------ | --------------------------- |
| `invitations/route.ts`               | List/create invitations   | Medium | Yes, new invitations router |
| `invitations/[id]/route.ts`          | Single invitation         | Medium | Yes                         |
| `invitations/accept/route.ts`        | Accept invitation         | Medium | Yes                         |
| `invitations/validate/route.ts`      | Validate invitation token | Medium | Yes                         |
| `v1/tenant/invitations/*` (4 routes) | Re-exports                | —      | —                           |

### MEDIA / UPLOAD — ❌ NOT COVERED, Stay REST

| REST Route        | Description           | Effort | Migrate?                                     |
| ----------------- | --------------------- | ------ | -------------------------------------------- |
| `media/route.ts`  | User media management | Small  | Stay REST (file I/O, not suitable for tRPC)  |
| `upload/route.ts` | File upload           | Small  | Stay REST (multipart, not suitable for tRPC) |

### PAYMENTS — ❌ NOT COVERED, Stay REST

| REST Route                           | Description            | Effort | Migrate?                            |
| ------------------------------------ | ---------------------- | ------ | ----------------------------------- |
| `payments/paypal/capture/route.ts`   | PayPal payment capture | Small  | Stay REST (third-party integration) |
| `payments/paypal/webhook/route.ts`   | PayPal webhook handler | Small  | Stay REST (webhook)                 |
| `payments/paystack/verify/route.ts`  | Paystack verification  | Small  | Stay REST                           |
| `payments/paystack/webhook/route.ts` | Paystack webhook       | Small  | Stay REST (webhook)                 |

### PLATFORM — ❌ NOT COVERED, Could migrate

| REST Route                         | Description             | Effort | Migrate?                        |
| ---------------------------------- | ----------------------- | ------ | ------------------------------- |
| `platform/onboarding/route.ts`     | Tenant onboarding       | Medium | Yes, new platform router        |
| `platform/tenants/route.ts`        | Tenant listing          | Medium | Yes                             |
| `tenant/billing/checkout/route.ts` | Tenant billing checkout | Medium | Stay REST (payment integration) |
| `tenant/billing/invoices/route.ts` | Tenant invoices         | Medium | Stay REST                       |
| `tenant/billing/snapshot/route.ts` | Billing snapshot        | Medium | Stay REST                       |
| `tenants/[id]/modules/route.ts`    | Tenant module config    | Small  | Yes, new tenants router         |
| `v1/platform/onboarding/route.ts`  | Re-export               | —      | —                               |
| `v1/platform/tenants/route.ts`     | Re-export               | —      | —                               |

### PRICING — ❌ NOT COVERED, Stay REST

| REST Route                   | Description          | Effort | Migrate?                   |
| ---------------------------- | -------------------- | ------ | -------------------------- |
| `pricing/route.ts`           | Static pricing plans | Small  | Stay REST (static content) |
| `v1/tenant/pricing/route.ts` | Re-export            | —      | —                          |

### PROVIDERS — ❌ NOT COVERED

| REST Route                                      | Description             | Effort | Migrate?                        |
| ----------------------------------------------- | ----------------------- | ------ | ------------------------------- |
| `providers/register/route.ts`                   | Provider registration   | Large  | Yes, new providers router       |
| `providers/register/validate/route.ts`          | Registration validation | Medium | Yes                             |
| `providers/verification/route.ts`               | Provider verification   | Medium | Yes                             |
| `providers/legal/route.ts`                      | Legal agreements        | Medium | Yes                             |
| `providers/reputation/route.ts`                 | Reputation score        | Small  | Yes                             |
| `providers/reputation/history/route.ts`         | Reputation history      | Small  | Yes                             |
| `providers/analytics/route.ts`                  | Provider analytics      | Medium | Yes                             |
| `providers/analytics/reputation-score/route.ts` | Reputation score calc   | Small  | Yes                             |
| `providers/billing/route.ts`                    | Provider billing        | Medium | Stay REST (billing integration) |
| `providers/billing/cancel/route.ts`             | Cancel subscription     | Medium | Stay REST                       |
| `providers/billing/charges/route.ts`            | Billing charges         | Medium | Stay REST                       |
| `providers/billing/fees/route.ts`               | Fee structure           | Small  | Stay REST                       |
| `providers/billing/invoices/route.ts`           | Provider invoices       | Medium | Stay REST                       |
| `providers/billing/subscribe/route.ts`          | Subscribe to plan       | Medium | Stay REST                       |
| `providers/dashboard/route.ts`                  | Provider dashboard      | Medium | Yes                             |
| `providers/invoices/[id]/pdf/route.ts`          | Invoice PDF             | Small  | Stay REST (PDF generation)      |

### SETTINGS — ❌ NOT COVERED, Candidate for tRPC

| REST Route                            | Description          | Effort | Migrate?                 |
| ------------------------------------- | -------------------- | ------ | ------------------------ |
| `settings/route.ts`                   | List/update settings | Medium | Yes, new settings router |
| `settings/[key]/route.ts`             | Single setting       | Small  | Yes                      |
| `settings/contact/route.ts`           | Contact settings     | Small  | Yes                      |
| `v1/tenant/settings/route.ts`         | Re-export            | —      | —                        |
| `v1/tenant/settings/[key]/route.ts`   | Re-export            | —      | —                        |
| `v1/tenant/settings/contact/route.ts` | Re-export            | —      | —                        |

### STATS (Public), TRANSLATE, WEBHOOKS — Stay REST

| Domain    | REST Route                  | Description              | Effort | Migrate?                              |
| --------- | --------------------------- | ------------------------ | ------ | ------------------------------------- |
| Stats     | `stats/route.ts`            | Public community stats   | Small  | Stay REST (public/cached)             |
| Translate | `translate/route.ts`        | AI-powered translation   | Small  | Stay REST (AI service call, not CRUD) |
| Webhooks  | `webhooks/payload/route.ts` | Generic webhook receiver | Small  | Stay REST (webhook pattern)           |

### V1 (Legacy Public API) — Stay REST / Re-exports

All routes under `src/app/api/v1/` are either re-exports from canonical REST routes or the OpenAPI-based public API. These should stay as REST since they are the external-facing OpenAPI/supported API layer.

| REST Route                        | Description | Migrate?                 |
| --------------------------------- | ----------- | ------------------------ |
| `v1/public/competitions/route.ts` | Re-export   | Stay REST (external API) |
| `v1/public/content/route.ts`      | Re-export   | Stay REST                |
| `v1/public/events/route.ts`       | Re-export   | Stay REST                |
| `v1/public/resources/route.ts`    | Re-export   | Stay REST                |
| `v1/system/flags/route.ts`        | Re-export   | Stay REST                |
| `v1/system/health/route.ts`       | Re-export   | Stay REST                |
| `v1/tenant/*` (all routes)        | Re-exports  | Stay REST (external API) |

---

## 4. Coverage Summary by Domain

| Status  | Domain                     | Notes                                                                |
| ------- | -------------------------- | -------------------------------------------------------------------- |
| ✅ FULL | Competitions               | All REST routes covered by tRPC                                      |
| ✅ FULL | Content                    | All REST routes covered by tRPC                                      |
| ✅ FULL | Events                     | All REST routes covered by tRPC                                      |
| ✅ FULL | Bookings                   | All REST routes covered by tRPC                                      |
| ✅ FULL | Groups                     | All REST routes covered by tRPC                                      |
| ✅ FULL | Disputes                   | All core REST routes covered by tRPC                                 |
| ✅ FULL | Chat/Messages              | All REST routes covered by tRPC                                      |
| ✅ FULL | Resources                  | All REST routes covered by tRPC                                      |
| ✅ FULL | Notifications              | All REST routes covered by tRPC                                      |
| ✅ FULL | Maintenance                | All REST routes covered by tRPC                                      |
| ✅ FULL | Surveys                    | All REST routes covered by tRPC                                      |
| ✅ FULL | DWallet                    | All core REST routes covered by tRPC                                 |
| ✅ FULL | Merits                     | All REST routes covered by tRPC                                      |
| ✅ FULL | Identity/Users             | User suspension, albums, seats, books all in tRPC (tags removed)     |
| ✅ FULL | Marketplace/Community Svcs | Checkout, service-bookings, urgency, premium now in tRPC sub-routers |
| ✅ FULL | Achievements               | Dedicated achievements router (7 procedures)                         |
| ✅ FULL | Agents                     | Dedicated agents router (4 procedures)                               |
| ✅ FULL | Announcements              | Integrated into content router (6 procedures)                        |
| ✅ FULL | Campaign                   | Integrated into content router                                       |
| ✅ FULL | Conservation               | Integrated into content router                                       |
| ✅ FULL | Dashboard Stats            | `identity.getDashboardStats`                                         |
| ✅ FULL | External Surveys           | `surveys/external.ts` (2 procedures)                                 |
| ✅ FULL | Invitations                | Dedicated invitations router (7 procedures)                          |
| ✅ FULL | Settings                   | Dedicated settings router (5 procedures)                             |
| ❌ NONE | Access Control             | Special case — navigation guard data                                 |
| ❌ NONE | Payments                   | Should stay REST (third-party webhooks)                              |
| ❌ NONE | Platform/Tenant Billing    | Some could migrate, billing stays REST                               |
| ❌ NONE | Pricing                    | Static data, stay REST                                               |
| ❌ NONE | Providers (full domain)    | Registration, billing, reputation — large migration                  |
| ❌ NONE | Stats (public)             | Stay REST                                                            |
| ❌ NONE | Translate                  | Stay REST (AI service)                                               |
| ❌ NONE | Webhooks                   | Stay REST                                                            |
| N/A     | Admin (all)                | Intended to stay REST                                                |
| N/A     | Auth (all)                 | Better Auth, stay REST                                               |
| N/A     | System/Infra (all)         | Stay REST                                                            |
| N/A     | V1 Public API              | External-facing, stay REST                                           |

---

## 5. Migration Complete

**All 20 tRPC routers are live** covering all tenant-facing domains. Phase 120 (2026-06-28) completed the final governance pass: response envelope, DTO mapping, procedure tiers, rate limiting, and OpenAPI completeness.

### Three Steps Remaining

| Domain       | Effort | Notes                                              |
| ------------ | ------ | -------------------------------------------------- |
| Providers    | Large  | Registration, billing, reputation, verification    |
| Platform     | Medium | Tenant management, onboarding, billing             |
| Paystack SSR | Small  | Migrate checkout from server-side calls to BFF API |

### Should Stay as REST

| Domain                      | Reason                                          |
| --------------------------- | ----------------------------------------------- |
| Admin routes (all)          | Admin-only UI pages, not frontend-consumed APIs |
| Auth (all)                  | Better Auth manages its own flow                |
| Payments (all)              | Third-party webhooks, not suitable for tRPC     |
| Media/Upload                | File I/O, multipart, not suitable for tRPC      |
| Translate                   | AI service proxy, not CRUD                      |
| Webhooks                    | External payload receiver                       |
| Pricing                     | Static/slow-changing data                       |
| Stats (public)              | Public cached stats                             |
| Health                      | Infrastructure                                  |
| V1 Public/System API        | External OpenAPI layer                          |
| System (flags, purge, gate) | Infrastructure/middleware concerns              |

---

## 6. Raw Counts

| Category                             | Count |
| ------------------------------------ | ----- |
| Total REST route files               | 219   |
| Routes covered by tRPC               | ~150  |
| Admin routes (stay REST)             | ~40   |
| Auth/system/infra routes (stay REST) | ~10   |
| V1 legacy re-exports (stay REST)     | ~30   |
| Uncovered, should stay REST          | ~25   |
| Uncovered, candidate for migration   | ~8    |
| tRPC routers deployed                | 20    |
| tRPC sub-routers                     | 14    |
| DTO files (drizzle-zod)              | 10    |
