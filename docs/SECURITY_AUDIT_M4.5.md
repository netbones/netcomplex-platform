# M4.5 Tenant Isolation Audit

**Generated:** 2026-06-06T11:10:10Z
**Source:** `pnpm exec tsx scripts/audit-tenant-isolation.ts`
**BD issue:** `e0w` — Fix route-level cross-tenant data leakage
**Plan:** 43-03 (M4.5 Blockers)

## Summary

| Status          | Count |
| --------------- | ----- |
| Total routes    | 157   |
| PASS            | 136   |
| FAIL            | 0     |
| WHITELISTED     | 8     |
| NEEDS-FOLLOW-UP | 0     |
| N/A             | 13    |

**Outcome:** All 90 tenant-scoped routes use `withTenant()` (or `withTenantOptional()` where the route legitimately may not have a tenant). The 8 platform-admin routes are whitelisted as cross-tenant by design. The 43 `v1/tenant/*` and 2 `v1/platform/*` re-exports inherit the audit result of their canonical target. **No tenant-isolation bypasses detected.** The 7-day M4.5 production soak is unblocked on this audit.

## Methodology

The audit script (`scripts/audit-tenant-isolation.ts`) walks every `route.ts` file under `src/app/api/` (157 files at M4.5 cutoff) and classifies each route by:

1. **Path prefix** — `/api/auth/*`, `/api/v1/public/*`, `/api/v1/system/*`, and a small set of token-based / infra / admin-explicit endpoints are classified as `N/A` (no tenant filter required).
2. **Whitelist membership** — 8 platform-admin routes under `/api/admin/platform/*` and `/api/platform/*` are classified as `WHITELISTED` (cross-tenant by design, gated by `requirePlatformAdmin` or `isPlatformAdmin`).
3. **Re-export recursion** — Single-line re-exports of the form `export { GET, POST } from '@/app/api/.../route';` (max 5 hops to prevent cycles) are followed to their canonical target, and the classification of the canonical is inherited by the re-export.
4. **Tenant-scoped classification** — All other routes are tenant-scoped. They pass if they call `withTenant()` or `withTenantOptional()`; they fail if they call `db.{select,update,delete,insert}` (or the transaction variant `tx.*`) without first calling either helper.

The script is regex-based (not AST-based) by design: it must be runnable from a fresh checkout with only Node built-ins, must complete in under 5 seconds on a developer laptop, and must produce a paper trail suitable for the 7-day soak. The script preserves any human-curated header above the auto-generated per-route section across re-runs (line-anchored marker detection).

## Follow-up Required

_None — all routes are PASS, WHITELISTED, or N/A at M4.5 cutoff._

### Known Stubs (not tenant-isolation failures)

The audit also surfaced one v1 stub route that has placeholder handlers (not a tenant-isolation failure, but tracked here for awareness):

- `/api/v1/tenant/community-services/reviews` — GET returns a hardcoded empty `data: []` list; POST returns `501 NOT_IMPLEMENTED` with a pointer to the canonical `/api/community-services/reviews/[listingId]`. This route has no DB calls, so the audit correctly classifies it as PASS, but the implementation is a known stub from the v1 migration (see the file's comment: "_The [listingId]-scoped handlers cannot be re-exported here because this path has no [listingId] dynamic segment._"). Out of scope for the tenant-isolation audit; deferred to the v1 → tRPC migration (BD `fpc`).

## Audit Results

Total routes audited: **157**

| Status | Count |
| --- | --- |
| PASS | 136 |
| FAIL | 0 |
| WHITELISTED | 8 |
| NEEDS-FOLLOW-UP | 0 |
| N/A | 13 |

### Per-Route Compliance Table

| Route | Type | Status | Tenant Filter Source | Notes |
| --- | --- | --- | --- | --- |
| `/api/admin/platform/assist` | platform-cross-tenant | WHITELISTED | platform-admin-check | Cross-tenant; uses platform-admin guard |
| `/api/admin/platform/assist/[id]` | platform-cross-tenant | WHITELISTED | platform-admin-check | Cross-tenant; uses platform-admin guard |
| `/api/admin/platform/tenants` | platform-cross-tenant | WHITELISTED | platform-admin-check | Cross-tenant; uses platform-admin guard |
| `/api/admin/platform/tenants/[id]` | platform-cross-tenant | WHITELISTED | platform-admin-check | Cross-tenant; uses platform-admin guard |
| `/api/platform/onboarding` | platform-cross-tenant | WHITELISTED | platform-admin-check | Cross-tenant; not in tenant scope |
| `/api/platform/tenants` | platform-cross-tenant | WHITELISTED | platform-admin-check | Cross-tenant; uses platform-admin guard |
| `/api/v1/platform/onboarding` | v1-reexport | WHITELISTED | inherited | Re-export → /api/platform/onboarding (WHITELISTED) |
| `/api/v1/platform/tenants` | v1-reexport | WHITELISTED | inherited | Re-export → /api/platform/tenants (WHITELISTED) |
| `/api/admin/activity` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/admin/board-members` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/admin/maintenance-stats` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/admin/settings/page-flags` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/admin/urgency` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/agents/activity` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/agents/managed-properties` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/agents/marketplace` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/announcements` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/announcements/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/bookings` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/campaign` | tenant-scoped | PASS | withTenantOptional() | Calls withTenant() and filters DB |
| `/api/community-services/analytics` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/community-services/inquiries` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/community-services/listings` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/community-services/listings/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/community-services/listings/[id]/publish` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/community-services/listings/related` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/community-services/moderation/listings/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/community-services/provider/inquiries/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/community-services/reviews/[listingId]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/competitions` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/competitions/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/conservation` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/content` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/content/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/conversations` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/conversations/find` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/dashboard/stats` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/events` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/events/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/events/[id]/register` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/external-surveys` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/flags` | tenant-scoped | PASS | withTenantOptional() | Calls withTenant(); no DB calls |
| `/api/groups` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/groups/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/groups/members` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/groups/membership-requests` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/groups/membership-requests/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/households` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/households/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/invitations` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/invitations/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/maintenance` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/[id]/assign` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/[id]/history` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/[id]/notes` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/[id]/notify` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/categories` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/maintenance/categories/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/providers` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/maintenance/providers/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/maintenance/teams` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/maintenance/teams/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/media` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/messages` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/messages/unread` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/messages/urgency` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/notifications` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/premium/listings` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/premium/portfolio` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/pricing` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/resources` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/resources/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/resources/[id]/download` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/seats` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/services/urgency` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/settings` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/settings/[key]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/settings/contact` | tenant-scoped | PASS | withTenantOptional() | Calls withTenant() and filters DB |
| `/api/stats` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]/questions` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]/questions/[questionId]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]/questions/reorder` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]/responses` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/surveys/[id]/sections` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]/sections/[sectionId]` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/surveys/[id]/sections/reorder` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/upload` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/user/albums` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/user/tags` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/users` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/users/[id]` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/users/[id]/books` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/users/[id]/suspend` | tenant-scoped | PASS | withTenant() | Calls withTenant() and filters DB |
| `/api/users/[id]/suspensions` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/users/[id]/unsuspend` | tenant-scoped | PASS | withTenant() | Calls withTenant(); no DB calls |
| `/api/v1/public/competitions` | v1-reexport | PASS | inherited | Re-export → /api/competitions (PASS) |
| `/api/v1/public/content` | v1-reexport | PASS | inherited | Re-export → /api/content (PASS) |
| `/api/v1/public/events` | v1-reexport | PASS | inherited | Re-export → /api/events (PASS) |
| `/api/v1/public/resources` | v1-reexport | PASS | inherited | Re-export → /api/resources (PASS) |
| `/api/v1/system/flags` | v1-reexport | PASS | inherited | Re-export → /api/flags (PASS) |
| `/api/v1/tenant/agents/activity` | v1-reexport | PASS | inherited | Re-export → /api/agents/activity (PASS) |
| `/api/v1/tenant/agents/managed-properties` | v1-reexport | PASS | inherited | Re-export → /api/agents/managed-properties (PASS) |
| `/api/v1/tenant/agents/marketplace` | v1-reexport | PASS | inherited | Re-export → /api/agents/marketplace (PASS) |
| `/api/v1/tenant/announcements` | v1-reexport | PASS | inherited | Re-export → /api/announcements (PASS) |
| `/api/v1/tenant/announcements/[id]` | v1-reexport | PASS | inherited | Re-export → /api/announcements/[id] (PASS) |
| `/api/v1/tenant/bookings` | v1-reexport | PASS | inherited | Re-export → /api/bookings (PASS) |
| `/api/v1/tenant/campaign` | v1-reexport | PASS | inherited | Re-export → /api/campaign (PASS) |
| `/api/v1/tenant/community-services/inquiries` | v1-reexport | PASS | inherited | Re-export → /api/community-services/inquiries (PASS) |
| `/api/v1/tenant/community-services/listings` | v1-reexport | PASS | inherited | Re-export → /api/community-services/listings (PASS) |
| `/api/v1/tenant/community-services/reviews` | tenant-scoped | PASS | N/A | No DB calls; tenant filter not required |
| `/api/v1/tenant/competitions` | v1-reexport | PASS | inherited | Re-export → /api/competitions (PASS) |
| `/api/v1/tenant/competitions/[id]` | v1-reexport | PASS | inherited | Re-export → /api/competitions/[id] (PASS) |
| `/api/v1/tenant/conservation` | v1-reexport | PASS | inherited | Re-export → /api/conservation (PASS) |
| `/api/v1/tenant/content` | v1-reexport | PASS | inherited | Re-export → /api/content (PASS) |
| `/api/v1/tenant/content/[id]` | v1-reexport | PASS | inherited | Re-export → /api/content/[id] (PASS) |
| `/api/v1/tenant/conversations` | v1-reexport | PASS | inherited | Re-export → /api/conversations (PASS) |
| `/api/v1/tenant/conversations/find` | v1-reexport | PASS | inherited | Re-export → /api/conversations/find (PASS) |
| `/api/v1/tenant/events` | v1-reexport | PASS | inherited | Re-export → /api/events (PASS) |
| `/api/v1/tenant/events/[id]` | v1-reexport | PASS | inherited | Re-export → /api/events/[id] (PASS) |
| `/api/v1/tenant/groups` | v1-reexport | PASS | inherited | Re-export → /api/groups (PASS) |
| `/api/v1/tenant/groups/[id]` | v1-reexport | PASS | inherited | Re-export → /api/groups/[id] (PASS) |
| `/api/v1/tenant/groups/members` | v1-reexport | PASS | inherited | Re-export → /api/groups/members (PASS) |
| `/api/v1/tenant/groups/membership-requests` | v1-reexport | PASS | inherited | Re-export → /api/groups/membership-requests (PASS) |
| `/api/v1/tenant/groups/membership-requests/[id]` | v1-reexport | PASS | inherited | Re-export → /api/groups/membership-requests/[id] (PASS) |
| `/api/v1/tenant/households` | v1-reexport | PASS | inherited | Re-export → /api/households (PASS) |
| `/api/v1/tenant/households/[id]` | v1-reexport | PASS | inherited | Re-export → /api/households/[id] (PASS) |
| `/api/v1/tenant/invitations` | v1-reexport | PASS | inherited | Re-export → /api/invitations (PASS) |
| `/api/v1/tenant/invitations/[id]` | v1-reexport | PASS | inherited | Re-export → /api/invitations/[id] (PASS) |
| `/api/v1/tenant/maintenance` | v1-reexport | PASS | inherited | Re-export → /api/maintenance (PASS) |
| `/api/v1/tenant/messages` | v1-reexport | PASS | inherited | Re-export → /api/messages (PASS) |
| `/api/v1/tenant/messages/unread` | v1-reexport | PASS | inherited | Re-export → /api/messages/unread (PASS) |
| `/api/v1/tenant/notifications` | v1-reexport | PASS | inherited | Re-export → /api/notifications (PASS) |
| `/api/v1/tenant/pricing` | v1-reexport | PASS | inherited | Re-export → /api/pricing (PASS) |
| `/api/v1/tenant/resources` | v1-reexport | PASS | inherited | Re-export → /api/resources (PASS) |
| `/api/v1/tenant/resources/[id]` | v1-reexport | PASS | inherited | Re-export → /api/resources/[id] (PASS) |
| `/api/v1/tenant/settings` | v1-reexport | PASS | inherited | Re-export → /api/settings (PASS) |
| `/api/v1/tenant/settings/[key]` | v1-reexport | PASS | inherited | Re-export → /api/settings/[key] (PASS) |
| `/api/v1/tenant/settings/contact` | v1-reexport | PASS | inherited | Re-export → /api/settings/contact (PASS) |
| `/api/v1/tenant/surveys` | v1-reexport | PASS | inherited | Re-export → /api/surveys (PASS) |
| `/api/v1/tenant/users` | v1-reexport | PASS | inherited | Re-export → /api/users (PASS) |
| `/api/v1/tenant/users/[id]` | v1-reexport | PASS | inherited | Re-export → /api/users/[id] (PASS) |
| `/api/auth/[...all]` | auth | N/A | N/A | Better Auth flow |
| `/api/auth/signup` | auth | N/A | N/A | Better Auth flow |
| `/api/auth/suspension-status` | auth | N/A | N/A | Better Auth flow |
| `/api/health` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
| `/api/invitations/accept` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
| `/api/invitations/validate` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
| `/api/openapi.json` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
| `/api/tenants/[id]/modules` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
| `/api/trpc/[trpc]` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
| `/api/v1/system/health` | system | N/A | N/A | System v1 route |
| `/api/v1/tenant/invitations/accept` | v1-reexport | N/A | N/A | Re-export → /api/invitations/accept (N/A) |
| `/api/v1/tenant/invitations/validate` | v1-reexport | N/A | N/A | Re-export → /api/invitations/validate (N/A) |
| `/api/webhooks/payload` | other-na | N/A | N/A | Token-based, infra, or admin outside tenant scope |
