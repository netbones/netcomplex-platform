# Project State

## Current Position

- **Phase:** 23-competitions-resources
- **Plan:** 01 (complete), 02 (planned), 03 (planned)
- **Status:** Plan 01 complete
- **Last Updated:** 2026-05-16

## Decisions Made

- **Self-service tenant signup:** Primary path is /platform/signup — Platform Admin–led inception replaced (DISCUSSION.md v2)
- **Trust boundary separation:** isPlatformAdmin flag on user model, never a Role enum value
- **Tenant ownership:** ownerId on Tenant schema for verifiable ownership
- **Setting uniqueness:** @@unique([tenantId, key]) — global @unique breaks with 2+ tenants
- **Resources as standalone model:** Not Content category — needs file attachments, visibility scoping, versioning
- **Competitions as standalone model:** Needs entry management, voting, deadlines
- **Module architecture:** Two-table design (platform_modules + tenant_modules)
- **Tier hierarchy:** standard (base) → premium → enterprise
- **Tier enforcement:** FeatureGate reads from tenant_modules filtered by tier
- **Hybrid feature gating:** TierGuard (tier baseline) + FeatureGate (per-tenant overrides)
- **Super-admin route:** /admin/platform/ is canonical
- **withTenant enforcement:** Applied to 11 tenant-scoped API routes
- **Tenant branding UI:** Uses API routes for updates with live client-side preview
- **Feature toggle UI:** Shows tier-allowed (green), tenant-overridden (yellow), locked (gray) states
- **Widget registry:** Map-based O(1) lookups, manifest-driven feature flags, backward-compatible exports
- **Real-time chat hooks:** useRealtimeMessages, useTypingIndicator, usePresence for Supabase Realtime
- **Email infrastructure:** MailerSend for transactional emails with graceful API key validation
- **Password reset:** Custom UUID token-based flow with 1-hour expiry
- **Email enumeration protection:** Password reset always returns success regardless of email existence
- **Toast unification:** Sonner as single toast system — Zustand toast removed, useApiToast retained for API operations
- **Events CRUD pattern:** Simplified form (no Tiptap, no i18n) vs ContentForm — events are single-language plain text
- **adminEventSchema:** Separate schema from existing eventSchema (different fields: title/description/date/location/organizer vs startDate/endDate/maxAttendees)
- [Phase 21-content-events]: Used simplified form pattern (no Tiptap, no i18n) vs ContentForm — events are single-language with plain text fields
- [Phase 21-content-events]: Extended events API with limit and upcoming query params for efficient widget data fetching — Client-side filtering would be inefficient; API should support server-side filtering
- [Phase 22-page-flag-expansion]: Expanding page visibility flags to Groups, Services, Resources, Maintenance, Surveys, and Competitions.
- [Phase 22-page-flag-expansion]: Centralized flag fetching via `usePageFlags` hook to ensure consistency across Header, Footer, and Mobile Menu.
- [Phase 22-page-flag-expansion]: Added 6 new page visibility flags to PlatformPageFlags interface with default value 'true'
- [Phase 22-page-flag-expansion]: Implemented a simple client-side hook 'usePageFlags' using native fetch
- [Phase 22]: Added Page Settings toggle and localized navigation labels.
- [Phase 23-competitions-resources-01]: Used Events CRUD pattern as template for competition admin pages (adminEventSchema → adminCompetitionSchema)
- [Phase 23-competitions-resources-01]: Public /competition page fetches upcoming competitions (startDate <= now AND endDate >= now)
- [Phase 23-competitions-resources-01]: Entry submission button kept as placeholder — entry management is future work

## Notes

- Phase 01 enforcement: tenant isolation enforced in API routes
- Dynamic tenant theming wired via layout.tsx
- FeatureGate ready for navigation integration
- Phase 02-01 complete: Admin UI for tenant management implemented
- **09-real-time-chat-01:** Complete - Tasks 1-5 verified (user approved)
- **10-email-notifications-01:** Complete - Tasks 1-5 committed, TypeScript errors fixed
- Task 5 checkpoint: human verification passed
- Email sending is async and non-blocking to not affect main flows
- **18-toast-unification-01:** Complete - Zustand toast removed, Sonner unified, ADR-018 added
- **19-schema-corrections-01:** Complete - Setting @@unique, Tenant.ownerId, user.isPlatformAdmin — migration applied
- **19-schema-corrections-02:** Complete - Header role case-sensitivity bug fixed with isAdmin() helper
- **19-schema-corrections-03:** Complete - Platform Admin tenant CRUD wired, isPlatformAdmin guard added
- **20-self-service-inception-01:** Complete - Signup API uses Better Auth for password, sets ownerId, redirects to onboarding
- **20-self-service-inception-02:** Complete - 5-step onboarding wizard built with state management, API persistence, and admin redirect
- **20-self-service-inception-03:** Complete - AssistSession model + API for time-limited staff access with dual revocation
- **20-self-service-inception-04:** Complete - Gap closure: InviteStep sends invitations, auth-guard enforces AssistSession scope
- **21-content-events-01:** Complete — ContentForm date pickers, API date filtering for public queries, admin bypass
- **21-content-events-02:** Complete — Events CRUD admin pages, EventForm, EventList, API routes (3 commits)
- **21-content-events-03:** Planned — Events dashboard tab and upcoming events widget
- **22-page-flag-expansion:** Planned — 3 plans created to expand visibility flags and update navigation.
- **23-competitions-resources-01:** Complete — Competition model, API routes, admin pages.
- **23-competitions-resources-02:** Complete — Resource model with file attachments, visibility scoping, admin CRUD.
