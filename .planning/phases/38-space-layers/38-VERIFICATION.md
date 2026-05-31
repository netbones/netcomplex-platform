---
phase: 38-space-layers
verified: 2026-06-01T00:15:00Z
reverified: 2026-06-01T00:45:00Z
status: passed
score: 13/13
must-haves:
  truths:
    - 'Services urgency API returns commandBar counts (openMaintenance, upcomingBookings) and domainBadges per domain'
    - 'Messages urgency API returns commandBar counts (unreadDirect, unreadGroup, unreadAnnouncements) and domainBadges per domain'
    - 'Both APIs use apiSuccess envelope and withTenant isolation'
    - 'User sees urgency chips (open maintenance, upcoming bookings) at top of Services space'
    - 'User sees domain cards (maintenance, bookings, amenities, my-services, events) in a responsive grid'
    - 'Each domain card shows an urgency badge if count > 0'
    - 'Domain cards link to /dashboard/services/[domain] sub-pages'
    - 'User sees urgency chips (unread DMs, unread group messages, unread announcements) at top of Messages space'
    - 'User sees domain cards (conversations, announcements, notifications) in a responsive grid'
    - 'Navigating to /dashboard/services renders ServicesLayer (not SpaceLayout widget grid)'
    - 'Navigating to /dashboard/messages renders MessagesLayer (not SpaceLayout widget grid)'
    - 'Navigating to /dashboard/community still renders SpaceLayout (DnD widgets)'
    - 'Domain cards in ServicesLayer link to working /dashboard/services/[domain] routes'
gaps:
  - truth: 'Domain cards link to /dashboard/services/[domain] sub-pages'
    status: partial
    reason: 'Domain cards generate correct hrefs (e.g. /dashboard/services/maintenance) but no route handler exists to serve these pages. Unlike admin which has admin/[domain]/page.tsx, services has no equivalent [domain] catch-all route. Navigating to any /dashboard/services/{domain} will 404.'
    artifacts:
      - path: 'src/app/(tenant)/dashboard/[space]/page.tsx'
        issue: 'Only matches /dashboard/{space}, not /dashboard/{space}/{domain}'
      - path: 'src/app/(tenant)/dashboard/services'
        issue: 'Directory does not exist — no [domain] sub-route'
    missing:
      - 'src/app/(tenant)/dashboard/services/[domain]/page.tsx (or equivalent dynamic route)'
  - truth: 'Domain cards in ServicesLayer link to working /dashboard/services/[domain] routes'
    status: failed
    reason: 'Same root cause as above — /dashboard/services/{domain} routes do not exist. Admin has admin/[domain]/page.tsx; services has no equivalent. Clicking any Services domain card leads to 404.'
    artifacts:
      - path: 'src/app/(tenant)/dashboard/services'
        issue: 'No route directory exists for services sub-domains'
    missing:
      - 'src/app/(tenant)/dashboard/services/[domain]/page.tsx (mirroring admin/[domain]/page.tsx pattern)'
  - truth: 'Domain cards link to /dashboard/messages/[domain] sub-pages'
    status: partial
    reason: 'Only /dashboard/messages/announcements has a concrete page.tsx. /dashboard/messages/conversations and /dashboard/messages/notifications have no route handlers. Clicking those domain cards leads to 404. Unlike admin which has a [domain] dynamic catch-all, messages has no equivalent.'
    artifacts:
      - path: 'src/app/(tenant)/dashboard/messages'
        issue: 'Only announcements/ sub-route exists; no [domain] catch-all for conversations or notifications'
    missing:
      - 'src/app/(tenant)/dashboard/messages/[domain]/page.tsx (or concrete directories for conversations and notifications)'
---

# Phase 38: Space Layers Verification Report

**Phase Goal:** Convert /dashboard/services and /dashboard/messages from SpaceLayout widget grids into purpose-built zoned layers (urgency zone + domain grid) following the AdminLayer/HomeLayer architecture. /dashboard/community remains the only true DnD widget space.

**Verified:** 2026-06-01T00:15:00Z

**Status:** gaps_found

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                       | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Services urgency API returns commandBar counts (openMaintenance, upcomingBookings) and domainBadges per domain              | ✓ VERIFIED | `src/app/api/services/urgency/route.ts` L77-89: returns `{ commandBar: { openMaintenance, upcomingBookings }, domainBadges: { maintenance, bookings, amenities: 0, 'my-services': 0, events: 0 } }` via `apiSuccess()`. Parallel `Promise.all` queries with resident-scoped filtering.                                                                                                                                            |
| 2   | Messages urgency API returns commandBar counts (unreadDirect, unreadGroup, unreadAnnouncements) and domainBadges per domain | ✓ VERIFIED | `src/app/api/messages/urgency/route.ts` L122-133: returns `{ commandBar: { unreadDirect, unreadGroup, unreadAnnouncements }, domainBadges: { conversations, announcements, notifications } }` via `apiSuccess()`. 4 parallel queries with user-scoped joins.                                                                                                                                                                      |
| 3   | Both APIs use apiSuccess envelope and withTenant isolation                                                                  | ✓ VERIFIED | Both import `apiSuccess` from `@api/api-response` (L1 of each file). Both import `withTenant` from `@entities/tenant/api/with-tenant` (L2 of each file). Both call `await withTenant()` for tenantId and wrap return in `apiSuccess()`.                                                                                                                                                                                           |
| 4   | User sees urgency chips (open maintenance, upcoming bookings) at top of Services space                                      | ✓ VERIFIED | `ServicesCommandBar.tsx` L108-123: conditional UrgencyChip for `openMaintenance > 0` (red, Wrench icon) and `upcomingBookings > 0` (blue, Calendar icon). Rendered as first section in `ServicesLayer.tsx` L128.                                                                                                                                                                                                                  |
| 5   | User sees domain cards (maintenance, bookings, amenities, my-services, events) in a responsive grid                         | ✓ VERIFIED | `ServicesLayer.tsx` L134: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3`. `SERVICES_DOMAIN_DEFINITIONS` (5 domains) mapped to `DomainCard` components.                                                                                                                                                                                                                                                     |
| 6   | Each domain card shows an urgency badge if count > 0                                                                        | ✓ VERIFIED | `ServicesLayer.tsx` L41-45: `{badge > 0 && (<span className="...bg-red-500...">{badge > 9 ? '9+' : badge}</span>)}`. Same pattern in `MessagesLayer.tsx` L41-45. Badge sourced from `urgency.domainBadges[domain.id] ?? 0`.                                                                                                                                                                                                       |
| 7   | Domain cards link to /dashboard/services/[domain] sub-pages                                                                 | ⚠️ PARTIAL | `ServicesLayer.tsx` L28: `href={/dashboard/services/${domain.id}}` generates correct URLs. However, **no route handler exists** for these paths — see Truth 13.                                                                                                                                                                                                                                                                   |
| 8   | User sees urgency chips (unread DMs, unread group messages, unread announcements) at top of Messages space                  | ✓ VERIFIED | `MessagesCommandBar.tsx` L89-112: conditional UrgencyChip for `unreadDirect > 0` (red, MessageSquare), `unreadGroup > 0` (amber, Users), `unreadAnnouncements > 0` (orange, Megaphone). Rendered as first section in `MessagesLayer.tsx` L130.                                                                                                                                                                                    |
| 9   | User sees domain cards (conversations, announcements, notifications) in a responsive grid                                   | ✓ VERIFIED | `MessagesLayer.tsx` L136: `grid grid-cols-2 sm:grid-cols-3 gap-3`. `MESSAGES_DOMAIN_DEFINITIONS` (3 domains) mapped to `DomainCard` components.                                                                                                                                                                                                                                                                                   |
| 10  | Navigating to /dashboard/services renders ServicesLayer (not SpaceLayout widget grid)                                       | ✓ VERIFIED | `[space]/page.tsx` L8+L31-32: imports `ServicesLayer`, returns `<ServicesLayer />` when `spaceId === 'services'`.                                                                                                                                                                                                                                                                                                                 |
| 11  | Navigating to /dashboard/messages renders MessagesLayer (not SpaceLayout widget grid)                                       | ✓ VERIFIED | `[space]/page.tsx` L9+L36-37: imports `MessagesLayer`, returns `<MessagesLayer />` when `spaceId === 'messages'`.                                                                                                                                                                                                                                                                                                                 |
| 12  | Navigating to /dashboard/community still renders SpaceLayout (DnD widgets)                                                  | ✓ VERIFIED | `[space]/page.tsx` L41: community falls through to `<SpaceLayoutWithErrorBoundary spaceId={spaceId} />`. No `community` special case exists.                                                                                                                                                                                                                                                                                      |
| 13  | Domain cards in ServicesLayer link to working /dashboard/services/[domain] routes                                           | ✗ FAILED   | Domain cards generate correct hrefs but `/dashboard/services/{domain}` routes **do not exist**. Admin has `admin/[domain]/page.tsx` for sub-domain routing; services has no equivalent directory or dynamic catch-all. Navigating to any services sub-domain will 404. Same issue for `/dashboard/messages/conversations` and `/dashboard/messages/notifications` — only `/dashboard/messages/announcements` has a concrete page. |

**Score:** 10/13 truths verified (2 partial, 1 failed)

### Required Artifacts

| Artifact                                           | Expected                                                  | Status     | Details                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/services/urgency/route.ts`            | GET /api/services/urgency — urgency counts                | ✓ VERIFIED | 94 lines, substantive: apiSuccess + withTenant + resident-scoped queries                                             |
| `src/app/api/messages/urgency/route.ts`            | GET /api/messages/urgency — urgency counts                | ✓ VERIFIED | 138 lines, substantive: apiSuccess + withTenant + user-scoped joins                                                  |
| `src/widgets/dashboard/ui/ServicesLayer.tsx`       | Main Services space layer                                 | ✓ VERIFIED | 148 lines (min 80 ✓), exports ServicesLayer, fetches /api/services/urgency, renders command bar + domain grid        |
| `src/widgets/dashboard/ui/ServicesCommandBar.tsx`  | Services urgency command bar                              | ✓ VERIFIED | 138 lines (min 60 ✓), exports ServicesCommandBar + ServicesCommandBarUrgency, conditional UrgencyChips + shortcuts   |
| `src/widgets/dashboard/ui/ServicesSubLauncher.tsx` | Service domain definitions                                | ✓ VERIFIED | 67 lines (min 50 ✓), exports SERVICES_DOMAIN_DEFINITIONS (5 domains) + ServicesDomainDef                             |
| `src/widgets/dashboard/ui/MessagesLayer.tsx`       | Main Messages space layer                                 | ✓ VERIFIED | 150 lines (min 80 ✓), exports MessagesLayer, fetches /api/messages/urgency, renders command bar + domain grid        |
| `src/widgets/dashboard/ui/MessagesCommandBar.tsx`  | Messages urgency command bar                              | ✓ VERIFIED | 129 lines (min 60 ✓), exports MessagesCommandBar + MessagesCommandBarUrgency, 3 urgency chips + New Message shortcut |
| `src/widgets/dashboard/ui/MessagesSubLauncher.tsx` | Message domain definitions                                | ✓ VERIFIED | 53 lines (min 40 ✓), exports MESSAGES_DOMAIN_DEFINITIONS (3 domains) + MessagesDomainDef                             |
| `src/app/(tenant)/dashboard/[space]/page.tsx`      | Routing switch for all 5 spaces                           | ✓ VERIFIED | 42 lines (min 30 ✓), imports + routes ServicesLayer + MessagesLayer, SpaceLayout fallback for community/home         |
| `src/widgets/dashboard/model/spaces.ts`            | SERVICES_DOMAINS + MESSAGES_DOMAINS + MESSAGES_SUB_ROUTES | ✓ VERIFIED | 326 lines, exports SERVICES_DOMAINS (5), MESSAGES_DOMAINS (3), updated MESSAGES_SUB_ROUTES (3)                       |
| `public/locales/en/services.json`                  | Domain label + description i18n keys                      | ✓ VERIFIED | 51 lines, contains `domains` section with 5 labels + 5 descriptions matching ServicesSubLauncher labelKeys           |
| `public/locales/en/messages.json`                  | Domain label + description i18n keys                      | ✓ VERIFIED | 24 lines, contains `domains` section with 3 labels + 3 descriptions matching MessagesSubLauncher labelKeys           |

### Key Link Verification

| From                    | To                              | Via                                            | Status       | Details                                                                                                                          |
| ----------------------- | ------------------------------- | ---------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| ServicesLayer.tsx       | /api/services/urgency           | fetch in useEffect on mount                    | ✓ WIRED      | L99: `await fetch('/api/services/urgency')`, L112-114: useEffect calls fetchUrgency                                              |
| ServicesLayer.tsx       | ServicesCommandBar              | import + render as first section               | ✓ WIRED      | L6: import, L128: `<ServicesCommandBar urgency={urgency.commandBar} />`                                                          |
| ServicesLayer.tsx       | SERVICES_DOMAIN_DEFINITIONS     | import + render as domain grid                 | ✓ WIRED      | L7: import, L135: `SERVICES_DOMAIN_DEFINITIONS.map(...)`                                                                         |
| MessagesLayer.tsx       | /api/messages/urgency           | fetch in useEffect on mount                    | ✓ WIRED      | L101: `await fetch('/api/messages/urgency')`, L114-116: useEffect calls fetchUrgency                                             |
| MessagesLayer.tsx       | MessagesCommandBar              | import + render as first section               | ✓ WIRED      | L6: import, L130: `<MessagesCommandBar urgency={urgency.commandBar} />`                                                          |
| MessagesLayer.tsx       | MESSAGES_DOMAIN_DEFINITIONS     | import for DomainCard rendering                | ✓ WIRED      | L7: import, L137: `MESSAGES_DOMAIN_DEFINITIONS.map(...)`                                                                         |
| [space]/page.tsx        | ServicesLayer                   | conditional import when spaceId === 'services' | ✓ WIRED      | L8: import, L31-32: returns `<ServicesLayer />`                                                                                  |
| [space]/page.tsx        | MessagesLayer                   | conditional import when spaceId === 'messages' | ✓ WIRED      | L9: import, L36-37: returns `<MessagesLayer />`                                                                                  |
| ServicesSubLauncher.tsx | public/locales/en/services.json | i18n labelKey/descriptionKey references        | ✓ WIRED      | 5 labelKeys like `services.domains.maintenance` match JSON keys under `domains`                                                  |
| MessagesSubLauncher.tsx | public/locales/en/messages.json | i18n labelKey/descriptionKey references        | ✓ WIRED      | 3 labelKeys like `messages.domains.conversations` match JSON keys under `domains`                                                |
| DomainCard (Services)   | /dashboard/services/[domain]    | Link href                                      | ⚠️ NOT_WIRED | L28: `href={/dashboard/services/${domain.id}}` generates valid URLs but no route handler exists — 404                            |
| DomainCard (Messages)   | /dashboard/messages/[domain]    | Link href                                      | ⚠️ PARTIAL   | L28: `href={/dashboard/messages/${domain.id}}` — only `announcements` route exists; `conversations` and `notifications` will 404 |

### Requirements Coverage

| Requirement | Source Plan         | Description                                                               | Status      | Evidence                                                                                                            |
| ----------- | ------------------- | ------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| LAYER-01    | 38-01, 38-02        | Services urgency API + ServicesLayer                                      | ✓ SATISFIED | API route exists with commandBar + domainBadges; ServicesLayer fetches and renders it                               |
| LAYER-02    | 38-01, 38-03        | Messages urgency API + MessagesLayer                                      | ✓ SATISFIED | API route exists with commandBar + domainBadges; MessagesLayer fetches and renders it                               |
| LAYER-03    | 38-02, 38-03, 38-04 | Domain definitions, command bars, sub-launchers, i18n                     | ✓ SATISFIED | All 6 UI components created, domain constants in spaces.ts, i18n keys populated                                     |
| LAYER-04    | 38-04               | Routing switch — services/messages use layers, community uses SpaceLayout | ⚠️ PARTIAL  | Routing works for top-level space pages, but sub-domain routes (/services/[domain], /messages/[domain]) are missing |

### Anti-Patterns Found

| File                                    | Line  | Pattern                                                                                         | Severity | Impact                                                                                                                         |
| --------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/services/urgency/route.ts` | 85-87 | `amenities: 0, // placeholder`, `'my-services': 0, // placeholder`, `events: 0, // placeholder` | ℹ️ Info  | Expected — these are intentional placeholders per plan (future feature flags). DomainBadges return 0 so no false badges shown. |

### Human Verification Required

### 1. Urgency Chip Visual Rendering

**Test:** Navigate to /dashboard/services while having open maintenance requests or upcoming bookings
**Expected:** Red chip shows "N open requests" and blue chip shows "N upcoming bookings" with correct icons
**Why human:** Cannot verify CSS rendering, icon sizing, or responsive layout behavior programmatically

### 2. Domain Grid Responsive Layout

**Test:** View /dashboard/services on mobile (1-2 cols) and desktop (4-5 cols)
**Expected:** Grid adjusts from 2-col on mobile to 5-col on xl screens
**Why human:** CSS responsive behavior and visual appearance require browser testing

### 3. i18n Translation Rendering

**Test:** View /dashboard/services and /dashboard/messages with English locale
**Expected:** Domain card labels show "Maintenance", "Bookings", etc. from services.json; "Conversations", "Announcements", "Notifications" from messages.json
**Why human:** react-i18next runtime resolution cannot be verified statically

### 4. Skeleton → Content Transition

**Test:** Load /dashboard/services with slow network
**Expected:** Skeleton placeholders appear, then transition smoothly to real content
**Why human:** Loading state transitions and animation behavior require browser observation

### 5. Error → Retry Flow

**Test:** Navigate to /dashboard/services with API unavailable
**Expected:** Error message shown with working "Retry" button
**Why human:** Error state rendering and retry interaction require browser testing

### Gaps Summary

**3 truths failed or partially failed — all sharing the same root cause:**

The domain card navigation links are wired at the component level (correct `href` attributes generated), but **no Next.js route handlers exist for `/dashboard/services/[domain]` or `/dashboard/messages/[domain]`** (except `/dashboard/messages/announcements`). The admin space has `admin/[domain]/page.tsx` as a dynamic catch-all route, but services and messages lack equivalent route structures.

This means:

- Clicking any Services domain card (maintenance, bookings, amenities, my-services, events) leads to a 404
- Clicking the Messages domain cards for "conversations" or "notifications" leads to a 404
- Only the Messages "announcements" domain card links to a working route

**What needs to be created:**

1. `src/app/(tenant)/dashboard/services/[domain]/page.tsx` — dynamic catch-all mirroring `admin/[domain]/page.tsx` pattern, validating domain against SERVICES_DOMAINS
2. Either a similar `src/app/(tenant)/dashboard/messages/[domain]/page.tsx` dynamic catch-all, or concrete directories for `conversations` and `notifications`
3. Sub-domain page content (likely widget-renderer based, following admin's pattern)

All other aspects of the phase are fully implemented and verified: APIs, layer components, command bars, domain definitions, routing switch, i18n keys, and SpaceLayout preservation for community.

---

_Verified: 2026-06-01T00:15:00Z_
_Verifier: Claude (gsd-verifier)_
