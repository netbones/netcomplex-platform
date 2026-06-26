---
phase: 106-dispute-api-routes-intake-screen
plan: 04
subsystem: ui
tags: [react, nextjs, tailwind, supabase-realtime, dispute-management, csos]

# Dependency graph
requires:
  - phase: 105-dispute-schema-entity-layer
    provides: Dispute entity types, constants, lifecycle, schemas, badge components
  - phase: 106-01
    provides: Core CRUD API routes (GET/POST/PATCH /api/disputes)
  - phase: 106-02
    provides: Sub-resource API routes (submit, messages, evidence, assign, ruling)
  - phase: 106-03
    provides: Intake screen AI route + CSOS export route
provides:
  - Admin dispute list page at /admin/disputes with searchable/sortable DisputeListTable
  - Admin dispute detail page at /admin/disputes/[id] with two-column layout
  - 10 new UI components (DisputeListTable, DisputeTimeline, MediationThread, MediationMessageBubble, AIFrivolityCheckPanel, CoolingOffTimer, EvidenceUploadZone, EvidencePreviewGrid, DisputeActionsBar, CSOSExportButton)
  - Supabase Realtime subscription in MediationThread for live message updates
  - AI frivolity check advisory panel with tone score, frivolity indicator, de-escalation tip
  - Cooling-off countdown timer for DRAFT disputes
  - Evidence drag-and-drop upload with MIME validation and preview grid
  - Role-based action bar with confirmation dialogs for destructive actions
  - CSOS JSON export button with rate-limit awareness
affects: [Phase 107 (intake wizard UI), Phase 108 (CSOS PDF formatting)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin page pattern: ErrorBoundary + PageLayout + Breadcrumbs + usePageLoading
    - Self-fetching table component pattern (DisputeListTable)
    - Supabase Realtime channel subscription pattern for dispute messages
    - AI advisory panel pattern with idle/loading/result/error/quota states
    - Countdown timer pattern with setInterval cleanup
    - Drag-and-drop upload zone pattern with client-side MIME/size validation
    - Role-based action bar with modal confirmation dialogs
    - JSON file download via Blob+ObjectURL pattern

key-files:
  created:
    - src/app/(tenant)/admin/disputes/page.tsx — Admin dispute list page
    - src/app/(tenant)/admin/disputes/[id]/page.tsx — Admin dispute detail page
    - src/entities/dispute/ui/DisputeListTable.tsx — Searchable/sortable table with filter bar
    - src/entities/dispute/ui/DisputeTimeline.tsx — Vertical timeline of dispute events
    - src/entities/dispute/ui/MediationThread.tsx — Chat-like message list with Realtime
    - src/entities/dispute/ui/MediationMessageBubble.tsx — Individual message rendering
    - src/entities/dispute/ui/AIFrivolityCheckPanel.tsx — AI frivolity screening results
    - src/entities/dispute/ui/CoolingOffTimer.tsx — HHh MMm SSs countdown for DRAFT
    - src/entities/dispute/ui/EvidenceUploadZone.tsx — Drag-and-drop file upload
    - src/entities/dispute/ui/EvidencePreviewGrid.tsx — Evidence thumbnails with lightbox
    - src/entities/dispute/ui/DisputeActionsBar.tsx — Role-appropriate action buttons
    - src/entities/dispute/ui/CSOSExportButton.tsx — Rate-limited export button
  modified:
    - src/entities/dispute/index.ts — Added 10 component exports
    - src/shared/lib/nav/index.ts — Added admin_disputes to ADMIN_NAV_REGISTRY
    - public/locales/en/admin.json — Added disputes key
    - public/locales/af/admin.json — Added disputes key
    - public/locales/xh/admin.json — Added disputes key
    - public/locales/zu/admin.json — Added disputes key

key-decisions:
  - 'Used Supabase Realtime channel dispute:{id} for mediation thread live updates with scrolledUpRef pattern to avoid channel recreation'
  - 'AIFrivolityCheckPanel implements 5 states (idle/loading/result/error/quota) with graceful degradation per ADVISORY-017'
  - 'DisputeActionsBar uses modal pattern for assign/ruling/withdraw/delete with confirmation dialogs for destructive actions'
  - 'CSOSExportButton implements client-side rate limit tracking (MAX_EXPORTS_PER_DAY=3) with server enforcement as authoritative'
  - 'EvidencePreviewGrid includes lightbox for image preview and remove-per-file functionality'

patterns-established:
  - 'Self-fetching table: DisputeListTable pattern for admin list pages with searchable/filterable/sortable tables'
  - 'Supabase Realtime: MediationThread pattern for subscribing to dispute:{id} channel with auto-scroll'
  - 'AI advisory panel: AIFrivolityCheckPanel pattern for non-persisted AI results with 5-state rendering'
  - 'Countdown timer: CoolingOffTimer pattern with setInterval and aria-live accessibility'
  - 'Drag-and-drop upload: EvidenceUploadZone pattern with MIME validation and Sonner toasts'

requirements-completed: [DISPUTE-03, DISPUTE-04]

# Metrics
duration: 17min
completed: 2026-06-26
---

# Phase 106 Plan 04: Admin Dispute Management UI Summary

**Built admin dispute management UI with 2 new pages, 10 UI components, Supabase Realtime mediation thread, AI frivolity check panel, evidence upload, and CSOS export**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-26T10:50:28Z
- **Completed:** 2026-06-26T11:07:36Z
- **Tasks:** 3
- **Files created:** 12
- **Files modified:** 6

## Accomplishments

- Admin dispute list page at `/admin/disputes` with searchable, sortable, filterable table featuring status, category, and severity badges, responsive tables (md+) and cards (mobile)
- Admin dispute detail page at `/admin/disputes/[id]` with two-column layout: timeline + evidence (left), AI panel + timer + actions + mediation thread (right)
- MediationThread with Supabase Realtime subscription to `dispute:{id}` channel, auto-scroll, role-based `isInternal` visibility filtering, and "New messages ↓" indicator
- AIFrivolityCheckPanel with 5 states (idle/loading/result/error/quota), tone score bar (green/amber/red), likely frivolous indicator, and de-escalation tip
- CoolingOffTimer with `HHh MMm SSs` countdown for DRAFT status, transitioning to "Ready to Submit" when expired
- EvidenceUploadZone with drag-and-drop, client-side MIME validation via `ALLOWED_EVIDENCE_TYPES`, 2MB size limit, and Sonner toast feedback
- DisputeActionsBar with role-appropriate buttons: Submit, Assign Moderator, Issue Ruling, Withdraw, Delete (ADMIN only), and Export CSOS
- CSOSExportButton with client-side rate limit tracking (3/day), JSON blob download, and graceful error handling
- Navigation: `admin_disputes` added to `ADMIN_NAV_REGISTRY`, `admin.disputes` i18n key added to all 4 locales

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin Dispute List Page + DisputeListTable** - `1b1ca0b8` (feat)
2. **Task 2: Detail Page + Timeline + Mediation Thread + AI Panel** - `d7b18705` (feat)
3. **Task 3: Evidence Upload + Actions Bar + CSOS Export + Navigation** - `2738d89f` (feat)

## Files Created/Modified

- `src/app/(tenant)/admin/disputes/page.tsx` - Admin dispute list page with Breadcrumbs, ErrorBoundary, PageLayout, "File a Dispute" FAB
- `src/app/(tenant)/admin/disputes/[id]/page.tsx` - Admin dispute detail page with two-column layout and all sub-components
- `src/entities/dispute/ui/DisputeListTable.tsx` - Self-fetching, searchable/sortable/filterable table with status/category/severity badges
- `src/entities/dispute/ui/DisputeTimeline.tsx` - Vertical timeline of DisputeEvent entries with color-coded dots
- `src/entities/dispute/ui/MediationThread.tsx` - Chat-like message list with Supabase Realtime, auto-scroll, role-based filtering
- `src/entities/dispute/ui/MediationMessageBubble.tsx` - Individual message with isInternal amber badge, own/other alignment
- `src/entities/dispute/ui/AIFrivolityCheckPanel.tsx` - Advisory panel with tone score, frivolity indicator, de-escalation tip
- `src/entities/dispute/ui/CoolingOffTimer.tsx` - HHh MMm SSs countdown with aria-live="polite"
- `src/entities/dispute/ui/EvidenceUploadZone.tsx` - Drag-and-drop with MIME validation, 2MB limit, keyboard-activatable
- `src/entities/dispute/ui/EvidencePreviewGrid.tsx` - Responsive evidence grid with lightbox and per-file removal
- `src/entities/dispute/ui/DisputeActionsBar.tsx` - Role-appropriate action bar with modal confirmation dialogs
- `src/entities/dispute/ui/CSOSExportButton.tsx` - Rate-limited JSON export with blob download
- `src/entities/dispute/index.ts` (modified) - Added 10 component exports
- `src/shared/lib/nav/index.ts` (modified) - Added admin_disputes to ADMIN_NAV_REGISTRY
- `public/locales/{en,af,xh,zu}/admin.json` (modified) - Added "disputes" key

## Decisions Made

- Used Supabase Realtime channel `dispute:{id}` for mediation thread live updates with `scrolledUpRef` pattern to avoid channel recreation on scroll changes
- AIFrivolityCheckPanel implements 5 states (idle/loading/result/error/quota) with graceful degradation per ADVISORY-017
- DisputeActionsBar uses modal pattern for assign/ruling/withdraw/delete with confirmation dialogs (role="alertdialog") for destructive actions
- CSOSExportButton implements client-side rate limit tracking (MAX_EXPORTS_PER_DAY=3) with server enforcement as authoritative
- EvidencePreviewGrid includes lightbox for image preview and remove-per-file functionality
- All components follow existing admin page patterns: client components, ErrorBoundary, Breadcrumbs, PageLayout, usePageLoading
- Pre-existing component imports (DisputeStatusBadge, DisputeCategoryBadge, SeverityIndicator) reused from Phase 105

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript configuration prevents passing files directly to `npx tsc --noEmit` when tsconfig.json includes path aliases; used full project check which timed out due to project size. Verified via LSP diagnostics which only showed pre-existing errors in 106-03 test files.
- Breadcrumbs `usePageLoading` hook requires `href: string` (not optional) on its BreadcrumbItem interface; used explicit type annotation to resolve.
- `ALLOWED_EVIDENCE_TYPES` is a readonly tuple causing strict TypeScript `includes()` check; used type assertion to `ReadonlyArray<string>`.
- DisputeTimeline initially included `MEDIATED_RESOLVED` which is a `DisputeStatus` not a `DisputeEventType`; removed from the event dot color map.

## Threat Flags

| Flag                          | File                   | Description                                                                                                                                     |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| threat_flag: realtime-channel | MediationThread.tsx    | Supabase channel subscribed with anon key; visibility filtering applied client-side but server is authoritative (defense in depth per T-106-30) |
| threat_flag: file-upload      | EvidenceUploadZone.tsx | Client-side MIME/size validation is UX-only; server-side uploadImage() is authoritative (per T-106-29)                                          |

## Self-Check: PASSED

- All 12 created files exist on disk ✓
- All 3 task commits verified in git history (1b1ca0b8, d7b18705, 2738d89f) ✓

## Next Phase Readiness

- Phase 106 complete — all 4 plans shipped
- Ready for Phase 107 (intake wizard UI) which will consume the AIFrivolityCheckPanel component
- Ready for Phase 108 (CSOS PDF formatting) which will enhance the CSOSExportButton route

---

_Phase: 106-dispute-api-routes-intake-screen_
_Completed: 2026-06-26_
