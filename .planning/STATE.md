# Project State

## Current Position

- **Phase:** 19-schema-corrections
- **Plan:** 01 (complete), 02 (complete), 03 (complete)
- **Status:** Ready to plan
- **Last Updated:** 2026-05-15

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
