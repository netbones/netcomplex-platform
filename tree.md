.
├── 1
├── AGENTS.md
├── COMMUNITY_SERVICES_UI_PLAN.md
├── DATABASE_MIGRATION_v2.1.md
├── LICENSE
├── PremiumModelNote.md
├── README.md
├── TECH_DEBT_REMEDIATION_PLAN.md
├── components.json
├── coverage
│   ├── base.css
│   ├── block-navigation.js
│   ├── components
│   │   ├── admin
│   │   │   ├── ContentForm.tsx.html
│   │   │   ├── GroupForm.tsx.html
│   │   │   └── index.html
│   │   ├── auth
│   │   │   ├── AuthCheck.tsx.html
│   │   │   └── index.html
│   │   ├── booking
│   │   │   ├── BookingForm.tsx.html
│   │   │   └── index.html
│   │   ├── chat
│   │   │   ├── ChatWindow.tsx.html
│   │   │   └── index.html
│   │   ├── directory
│   │   │   ├── DirectoryChatModal.tsx.html
│   │   │   ├── DirectoryGrid.tsx.html
│   │   │   └── index.html
│   │   ├── layout
│   │   │   ├── Footer.tsx.html
│   │   │   ├── Header.tsx.html
│   │   │   └── index.html
│   │   ├── maintenance
│   │   │   ├── MaintenanceForm.tsx.html
│   │   │   └── index.html
│   │   └── ui
│   │   ├── Breadcrumbs.tsx.html
│   │   ├── CommunityMap.tsx.html
│   │   ├── LanguageSwitcher.tsx.html
│   │   ├── RichTextEditor.tsx.html
│   │   ├── SideDrawer.tsx.html
│   │   ├── Toast.tsx.html
│   │   └── index.html
│   ├── coverage-final.json
│   ├── favicon.png
│   ├── index.html
│   ├── lib
│   │   ├── auth-client.ts.html
│   │   ├── auth-utils.ts.html
│   │   ├── auth.ts.html
│   │   ├── constants.ts.html
│   │   ├── i18n.ts.html
│   │   ├── index.html
│   │   ├── permissions.ts.html
│   │   ├── prisma.ts.html
│   │   ├── schemas.ts.html
│   │   ├── supabase.ts.html
│   │   ├── useContactSettings.ts.html
│   │   └── useTranslation.ts.html
│   ├── prettify.css
│   ├── prettify.js
│   ├── sort-arrow-sprite.png
│   └── sorter.js
├── drizzle
│   └── meta
│   └── \_journal.json
├── drizzle.config.ts
├── eslint.config.js
├── migrate-renter-relationships.ts
├── next-env.d.ts
├── next.config.mjs
├── opencode.json
├── package.json
├── pnpm-lock.yaml
├── postcss.config.cjs
├── prisma
│   ├── drizzle
│   │   ├── accounts-relations.ts
│   │   ├── accounts.ts
│   │   ├── agent-access-level-enum.ts
│   │   ├── agent-accesses-relations.ts
│   │   ├── agent-accesses.ts
│   │   ├── agent-permission-enum.ts
│   │   ├── agent-profiles-relations.ts
│   │   ├── agent-profiles.ts
│   │   ├── albums-relations.ts
│   │   ├── albums.ts
│   │   ├── announcements.ts
│   │   ├── booking-status-enum.ts
│   │   ├── bookings-relations.ts
│   │   ├── bookings.ts
│   │   ├── community-service-inquiries-relations.ts
│   │   ├── community-service-inquiries.ts
│   │   ├── community-service-listings-relations.ts
│   │   ├── community-service-listings.ts
│   │   ├── community-service-reviews-relations.ts
│   │   ├── community-service-reviews.ts
│   │   ├── content-category-enum.ts
│   │   ├── contents-relations.ts
│   │   ├── contents.ts
│   │   ├── conversation-participants-relations.ts
│   │   ├── conversation-participants.ts
│   │   ├── conversation-type-enum.ts
│   │   ├── conversations-relations.ts
│   │   ├── conversations.ts
│   │   ├── custom-bytes.ts
│   │   ├── events.ts
│   │   ├── external-surveys.ts
│   │   ├── group-access-enum.ts
│   │   ├── group-membership-requests-relations.ts
│   │   ├── group-membership-requests.ts
│   │   ├── group-role-enum.ts
│   │   ├── groups-relations.ts
│   │   ├── groups.ts
│   │   ├── household-status-enum.ts
│   │   ├── households-relations.ts
│   │   ├── households-topremium-seats-relations.ts
│   │   ├── households-topremium-seats.ts
│   │   ├── households.ts
│   │   ├── inquiry-status-enum.ts
│   │   ├── invitation-status-enum.ts
│   │   ├── invitations-relations.ts
│   │   ├── invitations.ts
│   │   ├── listing-status-enum.ts
│   │   ├── listing-type-enum.ts
│   │   ├── maintenance-requests-relations.ts
│   │   ├── maintenance-requests.ts
│   │   ├── members-relations.ts
│   │   ├── members.ts
│   │   ├── membership-status-enum.ts
│   │   ├── message-type-enum.ts
│   │   ├── messages-relations.ts
│   │   ├── messages.ts
│   │   ├── notifications-relations.ts
│   │   ├── notifications.ts
│   │   ├── occupant-type-enum.ts
│   │   ├── organizations-relations.ts
│   │   ├── organizations.ts
│   │   ├── passkeys-relations.ts
│   │   ├── passkeys.ts
│   │   ├── platform-suspensions-relations.ts
│   │   ├── platform-suspensions.ts
│   │   ├── premium-seats-relations.ts
│   │   ├── premium-seats.ts
│   │   ├── price-type-enum.ts
│   │   ├── priority-enum.ts
│   │   ├── profile-status-enum.ts
│   │   ├── profiles-relations.ts
│   │   ├── profiles.ts
│   │   ├── property-listings-relations.ts
│   │   ├── property-listings.ts
│   │   ├── question-type-enum.ts
│   │   ├── questions-relations.ts
│   │   ├── questions.ts
│   │   ├── request-status-enum.ts
│   │   ├── residency-type-enum.ts
│   │   ├── resident-filter-enum.ts
│   │   ├── resident-type-enum.ts
│   │   ├── responses-relations.ts
│   │   ├── responses.ts
│   │   ├── role-enum.ts
│   │   ├── schema.ts
│   │   ├── service-category-enum.ts
│   │   ├── sessions-relations.ts
│   │   ├── sessions.ts
│   │   ├── settings.ts
│   │   ├── solo-seat-type-enum.ts
│   │   ├── solo-seats-relations.ts
│   │   ├── solo-seats.ts
│   │   ├── standard-seats-relations.ts
│   │   ├── standard-seats.ts
│   │   ├── survey-status-enum.ts
│   │   ├── survey-type-enum.ts
│   │   ├── surveys-relations.ts
│   │   ├── surveys.ts
│   │   ├── suspension-type-enum.ts
│   │   ├── tenants.ts
│   │   ├── two-factors-relations.ts
│   │   ├── two-factors.ts
│   │   ├── user-groups-relations.ts
│   │   ├── user-groups.ts
│   │   ├── users-relations.ts
│   │   ├── users.ts
│   │   └── verifications.ts
│   ├── migrations
│   │   ├── 20240829232929_user_table
│   │   │   └── migration.sql
│   │   ├── 20260331000000_add_organization_id_to_identity_tables
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   ├── schema.prisma.bak
│   └── seed.ts
├── prod-ca-2021.crt
├── public
│   ├── carousel
│   │   ├── 1.jpg
│   │   ├── 2.jpg
│   │   ├── 3.jpg
│   │   ├── 4.jpg
│   │   ├── 5.jpg
│   │   ├── 6.jpg
│   │   ├── 7.jpg
│   │   └── 8.jpg
│   ├── conservation.webp
│   ├── house.webp
│   ├── images
│   ├── locales
│   │   ├── af
│   │   │   ├── admin.json
│   │   │   ├── bookings.json
│   │   │   ├── common.json
│   │   │   ├── conservation.json
│   │   │   ├── dashboard.json
│   │   │   ├── directory.json
│   │   │   ├── forms.json
│   │   │   ├── groups.json
│   │   │   ├── interest.json
│   │   │   ├── maintenance.json
│   │   │   ├── messages.json
│   │   │   ├── notifications.json
│   │   │   ├── resources.json
│   │   │   └── services.json
│   │   ├── en
│   │   │   ├── admin.json
│   │   │   ├── bookings.json
│   │   │   ├── common.json
│   │   │   ├── conservation.json
│   │   │   ├── dashboard.json
│   │   │   ├── directory.json
│   │   │   ├── forms.json
│   │   │   ├── groups.json
│   │   │   ├── interest.json
│   │   │   ├── maintenance.json
│   │   │   ├── messages.json
│   │   │   ├── notifications.json
│   │   │   ├── resources.json
│   │   │   └── services.json
│   │   ├── xh
│   │   │   ├── admin.json
│   │   │   ├── bookings.json
│   │   │   ├── common.json
│   │   │   ├── conservation.json
│   │   │   ├── dashboard.json
│   │   │   ├── directory.json
│   │   │   ├── forms.json
│   │   │   ├── groups.json
│   │   │   ├── interest.json
│   │   │   ├── maintenance.json
│   │   │   ├── messages.json
│   │   │   ├── notifications.json
│   │   │   ├── resources.json
│   │   │   └── services.json
│   │   └── zu
│   │   ├── admin.json
│   │   ├── bookings.json
│   │   ├── common.json
│   │   ├── conservation.json
│   │   ├── dashboard.json
│   │   ├── directory.json
│   │   ├── forms.json
│   │   ├── groups.json
│   │   ├── interest.json
│   │   ├── maintenance.json
│   │   ├── messages.json
│   │   ├── notifications.json
│   │   ├── resources.json
│   │   └── services.json
│   ├── logo.png
│   ├── muizenberg-single-residential-homes-soralia-village-377x288.webp
│   └── soralia.jpg
├── scripts
│   └── seed-drizzle.ts
├── src
│   ├── LICENSE
│   ├── README.md
│   ├── app
│   │   ├── (auth)
│   │   │   ├── forgot-password
│   │   │   │   └── page.tsx
│   │   │   ├── sign-in
│   │   │   │   └── page.tsx
│   │   │   └── sign-up
│   │   │   └── page.tsx
│   │   ├── [lng]
│   │   │   └── locales
│   │   │   ├── af
│   │   │   ├── en
│   │   │   ├── xh
│   │   │   └── zu
│   │   ├── admin
│   │   │   ├── categories
│   │   │   │   └── page.tsx
│   │   │   ├── content
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── external-surveys
│   │   │   │   └── page.tsx
│   │   │   ├── groups
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── platform
│   │   │   │   ├── [id]
│   │   │   │   │   └── features
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── requests
│   │   │   │   ├── analytics
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── surveys
│   │   │   │   ├── new
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── users
│   │   │   └── page.tsx
│   │   ├── api
│   │   │   ├── admin
│   │   │   │   ├── board-members
│   │   │   │   │   └── route.ts
│   │   │   │   ├── maintenance-stats
│   │   │   │   │   └── route.ts
│   │   │   │   └── platform
│   │   │   │   └── tenants
│   │   │   │   └── route.ts
│   │   │   ├── agents
│   │   │   │   └── marketplace
│   │   │   │   └── route.ts
│   │   │   ├── auth
│   │   │   │   └── [...all]
│   │   │   │   └── route.ts
│   │   │   ├── bookings
│   │   │   │   └── route.ts
│   │   │   ├── community-services
│   │   │   │   ├── analytics
│   │   │   │   │   └── route.ts
│   │   │   │   ├── inquiries
│   │   │   │   │   └── route.ts
│   │   │   │   ├── listings
│   │   │   │   │   ├── [id]
│   │   │   │   │   │   ├── publish
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── related
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── moderation
│   │   │   │   │   └── listings
│   │   │   │   │   └── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   ├── provider
│   │   │   │   │   └── inquiries
│   │   │   │   │   └── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   └── reviews
│   │   │   │   └── [listingId]
│   │   │   │   └── route.ts
│   │   │   ├── conservation
│   │   │   │   └── route.ts
│   │   │   ├── content
│   │   │   │   ├── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── conversations
│   │   │   │   ├── find
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── dashboard
│   │   │   │   └── stats
│   │   │   │   └── route.ts
│   │   │   ├── debug-auth
│   │   │   ├── external-surveys
│   │   │   │   └── route.ts
│   │   │   ├── groups
│   │   │   │   ├── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   ├── members
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── health
│   │   │   │   └── route.ts
│   │   │   ├── households
│   │   │   │   └── [id]
│   │   │   │   └── route.ts
│   │   │   ├── invitations
│   │   │   │   ├── [id]
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── maintenance
│   │   │   │   ├── [id]
│   │   │   │   │   ├── history
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── notes
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── notify
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── media
│   │   │   │   └── route.ts
│   │   │   ├── messages
│   │   │   │   ├── route.ts
│   │   │   │   └── unread
│   │   │   │   └── route.ts
│   │   │   ├── notifications
│   │   │   │   └── route.ts
│   │   │   ├── premium
│   │   │   │   ├── listings
│   │   │   │   │   └── route.ts
│   │   │   │   └── portfolio
│   │   │   │   └── route.ts
│   │   │   ├── settings
│   │   │   │   ├── contact
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── stats
│   │   │   │   └── route.ts
│   │   │   ├── surveys
│   │   │   │   └── route.ts
│   │   │   ├── test-user
│   │   │   ├── trpc
│   │   │   │   └── [trpc]
│   │   │   │   └── route.ts
│   │   │   ├── upload
│   │   │   │   └── route.ts
│   │   │   ├── user
│   │   │   │   ├── albums
│   │   │   │   │   └── route.ts
│   │   │   │   └── tags
│   │   │   │   └── route.ts
│   │   │   └── users
│   │   │   ├── [id]
│   │   │   │   ├── books
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── bookings
│   │   │   └── page.tsx
│   │   ├── competition
│   │   │   └── page.tsx
│   │   ├── conservation
│   │   │   └── page.tsx
│   │   ├── dashboard
│   │   │   ├── page-original.tsx
│   │   │   └── page.tsx
│   │   ├── directory
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── groups
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── guidelines
│   │   │   └── page.tsx
│   │   ├── interest
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── maintenance
│   │   │   └── page.tsx
│   │   ├── member
│   │   │   └── [id]
│   │   │   └── page.tsx
│   │   ├── messages
│   │   │   └── page.tsx
│   │   ├── news
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── notifications
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── privacy
│   │   │   └── page.tsx
│   │   ├── proudly-soralia
│   │   │   └── page.tsx
│   │   ├── providers.tsx
│   │   ├── proxy.ts
│   │   ├── resident
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── resources
│   │   │   └── page.tsx
│   │   ├── services
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── settings
│   │   │   └── page.tsx
│   │   ├── terms
│   │   │   └── page.tsx
│   │   └── unit
│   │   └── [id]
│   │   ├── member
│   │   │   └── [profileId]
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── admin
│   │   │   ├── AdminActivityWidget.tsx
│   │   │   ├── AdminContentWidget.tsx
│   │   │   ├── AdminQuickLinksWidget.tsx
│   │   │   ├── AdminStatsWidget.tsx
│   │   │   ├── AdminSystemWidget.tsx
│   │   │   ├── AdminUserWidget.tsx
│   │   │   ├── AdminWidgetRenderer.tsx
│   │   │   ├── ContentForm.tsx
│   │   │   ├── GroupForm.tsx
│   │   │   ├── MaintenanceAnalyticsWidget.tsx
│   │   │   ├── MaintenanceRequestsWidget.tsx
│   │   │   ├── MarketplaceAnalyticsWidget.tsx
│   │   │   ├── ModerationQueueWidget.tsx
│   │   │   ├── ServiceQualityWidget.tsx
│   │   │   └── index.ts
│   │   ├── auth
│   │   │   └── AuthCheck.tsx
│   │   ├── booking
│   │   │   └── BookingForm.tsx
│   │   ├── chat
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── EmojiPickerButton.tsx
│   │   │   └── useChat.ts
│   │   ├── dashboard
│   │   │   ├── AgentDashboardWidget.tsx
│   │   │   ├── AgentWidget.tsx
│   │   │   ├── BookshelfWidget.tsx
│   │   │   ├── CreateListingForm.tsx
│   │   │   ├── DashboardSkeleton.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── DashboardTabs.tsx
│   │   │   ├── DraggableWidget.tsx
│   │   │   ├── EventsWidget.tsx
│   │   │   ├── HouseholdsWidget.tsx
│   │   │   ├── MediaWidget.tsx
│   │   │   ├── MessagesWidget.tsx
│   │   │   ├── MyAlbumWidget.tsx
│   │   │   ├── MyServicesWidget.tsx
│   │   │   ├── NotificationsWidget.tsx
│   │   │   ├── PremiumPortfolioWidget.tsx
│   │   │   ├── QuickActionsWidget.tsx
│   │   │   ├── RecentActivityWidget.tsx
│   │   │   ├── ServiceInquiriesWidget.tsx
│   │   │   ├── SidebarWidgetBox.tsx
│   │   │   ├── SoloSeatWidget.tsx
│   │   │   ├── StatsWidget.tsx
│   │   │   ├── UserContentWidget.tsx
│   │   │   ├── WidgetRenderer.tsx
│   │   │   └── index.ts
│   │   ├── directory
│   │   │   ├── DirectoryChatModal.tsx
│   │   │   ├── DirectoryGrid.tsx
│   │   │   └── index.ts
│   │   ├── layout
│   │   │   ├── Footer.tsx
│   │   │   └── Header.tsx
│   │   ├── maintenance
│   │   │   └── MaintenanceForm.tsx
│   │   ├── providers
│   │   ├── services
│   │   │   ├── CategoryBadge.tsx
│   │   │   ├── PricingDisplay.tsx
│   │   │   ├── RelatedServices.tsx
│   │   │   ├── ReviewStars.tsx
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── ServiceTypeBadge.tsx
│   │   │   ├── ServicesGrid.tsx
│   │   │   └── index.ts
│   │   ├── shared
│   │   │   ├── UnifiedResidentCard.tsx
│   │   │   └── index.ts
│   │   └── ui
│   │   ├── Bookshelf.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── Carousel.tsx
│   │   ├── CommunityMap.tsx
│   │   ├── EmojiMartPicker.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FontFamily.ts
│   │   ├── FontSize.ts
│   │   ├── FrimoussePicker.tsx
│   │   ├── Honeypot.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── Loading.tsx
│   │   ├── MediaLibrary.tsx
│   │   ├── Pagination.tsx
│   │   ├── RichTextEditor.tsx
│   │   ├── SideDrawer.tsx
│   │   ├── TagCloud.tsx
│   │   ├── TagInput.tsx
│   │   ├── TenantProvider.tsx
│   │   ├── TenantStyles.tsx
│   │   ├── TierGuard.tsx
│   │   ├── Toast.tsx
│   │   ├── Turnstile.tsx
│   │   ├── index.ts
│   │   └── tooltip.tsx
│   ├── drizzle
│   ├── hooks
│   │   ├── useIdentity.ts
│   │   └── usePageLoading.tsx
│   ├── lib
│   │   ├── admin-config.ts
│   │   ├── auth-client.ts
│   │   ├── auth-utils.ts
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── dashboard-config.ts
│   │   ├── data-fetching.ts
│   │   ├── db.ts
│   │   ├── features
│   │   │   └── registry.ts
│   │   ├── i18n.ts
│   │   ├── logger.ts
│   │   ├── permissions.ts
│   │   ├── prisma.ts
│   │   ├── revalidation.ts
│   │   ├── schemas.ts
│   │   ├── storage.ts
│   │   ├── stores
│   │   │   └── widget-store.ts
│   │   ├── supabase.ts
│   │   ├── tenant.ts
│   │   ├── trpc
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── useContactSettings.ts
│   │   ├── useTranslation.ts
│   │   └── utils.ts
│   ├── middleware.ts
│   ├── server
│   │   ├── index.ts
│   │   └── routers
│   │   └── identity.ts
│   ├── test
│   │   ├── chat.test.ts
│   │   ├── constants.test.ts
│   │   ├── permissions.test.ts
│   │   ├── schemas.test.ts
│   │   └── setup.ts
│   └── types
│   ├── enums.ts
│   └── identity.ts
├── tailwind.config.cjs
├── tree.md
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vitest.config.ts

179 directories, 480 files
