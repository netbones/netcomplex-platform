# Phase 107: Dispute UI & Widgets - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** ADVISORY-017.md Phases 4 + 5

<domain>
## Phase Boundary

Build the dispute resolution user interface — the psychological intake wizard, dispute creation form, mediation thread UI, evidence uploader, dispute detail page, and dashboard widgets. The intake wizard implements the 4-stage de-escalation gate (emotion check-in → self-resolution checklist → AI frivolity screen → conflict tips) inline within the my-disputes widget. The wizard transitions directly into the DisputeForm, which creates a DRAFT and navigates to a dedicated /disputes/[id] detail page. Dashboard widgets surface disputes to residents and provide moderation tools to board/admin.

Depends on: Phase 106 (Dispute API Routes). Reuses entity-layer UI components from Phase 105.
</domain>

<decisions>
## Implementation Decisions

### Page Architecture

- No dedicated `/disputes/new` route — intake wizard opens inline in `my-disputes` widget
- Dedicated detail page at `/disputes/[id]` — full page route wrapping entity components
- No top-level nav item for "Disputes" — discovery is widget-only
- DisputeListTable (entity layer) used as data source for dispute lists in widgets and pages

### Intake Wizard (Phase 4)

- Multi-step form gated before DisputeForm.tsx, renders inline in my-disputes widget
- Widget replaces content when wizard starts: list hides, wizard shows. "Back to list" cancels.
- State machine: `emotion` → `checklist` → `frivolity` (conditional on AI) → `tips` → `form`
- 5 components: EmotionCheckIn, SelfResolutionChecklist, FrivolityScreen, ConflictTipsPanel, DisputeIntakeWizard
- FrivolityScreen calls `POST /api/disputes/intake-screen` (Phase 106 route, Phase 104 AI pool)
- Frivolity step skipped when AI disabled — wizard collapses from 4 to 3 stages
- Emotional state NOT persisted (only intakeCompletedAt timestamp)
- AI-enabled resolved server-side, passed as prop — no client-side loading flash
- Forward-only transitions (no back navigation). AI step auto-skipped when disabled.
- Numbered inline steps (1. Emotion, 2. Checklist, etc.) — no sidebar stepper or horizontal progress bar
- Completed steps show checkmark, current step highlighted
- Mobile: widget expands to full width during wizard (bypasses widget grid constraints)
- Extract reusable `useMultiStep` hook to `src/shared/lib/` for step progression, skip logic, validation

### Stage 1 — EmotionCheckIn

- Emoji scale: 😤 Very angry → 😟 Upset → 😐 Neutral → 🙂 Calm → 😌 Resolved
- Soft gate on "Very angry" or "Upset": offer save draft, read conflict tips, continue filing
- Never blocking — compassionate nudge only

### Stage 2 — SelfResolutionChecklist

- 4 checkboxes: spoke to other party, checked rules, gave time, need third-party help
- <2 boxes checked → contextual tip surfaced
- Links to ConflictTips resource

### Stage 3 — FrivolityScreen (AI-assisted, conditional on Phase 104)

- Calls intake-screen API, renders toneScore, likelyFrivolous, deEscalationTip
- Always advisory — user can always proceed
- Renders de-escalation tips for toneScore >= 7

### Stage 4 — ConflictTipsPanel

- Static content, collapsible, contextual per emotion score
- Tips for heated disputes (noise, pets, parking), HOA rule disputes, escalation-ready

### Dispute Form

- DisputeForm.tsx — uses React Hook Form + Zod (existing pattern)
- Fields: category, title, description, desired outcome, respondent selection, severity
- On submit: POST to `/api/disputes` to create a DRAFT, then navigate to `/disputes/[id]`
- Renders inline in widget after wizard completes (same widget space)

### Dispute Detail Page (/disputes/[id])

- 3-column admin-style layout:
  - **Header (above all):** DisputeStatusBadge, DisputeCategoryBadge, SeverityIndicator, CSOSExportButton
  - **Left sidebar:** DisputeTimeline, DisputeActionsBar, CoolingOffTimer
  - **Center (main):** MediationThread (full height)
  - **Right sidebar:** EvidenceUploadZone, EvidencePreviewGrid, AIFrivolityCheckPanel
- Client component with server data fetch (matches existing chat detail page patterns)
- Mobile: stacked single column with tabs (Timeline, Thread, Evidence). Thread tab is default. Actions/CoolingOff/CSOS as sticky bottom bar.

### Widgets (Phase 5)

- `my-disputes` widget:
  - Content: Status cards with quick actions (reference number, category badge, status badge, last updated)
  - Each card has "View" action → `/disputes/[id]`
  - "File a Dispute" CTA button triggers intake wizard inline
  - After wizard/form completes, widget returns to list view
  - Widget content replaced during wizard/form flow; "Back to list" to cancel
- `admin-disputes` widget:
  - Content: Moderation queue with filter tabs (Pending Assignment, In Mediation, Awaiting Ruling)
  - Each row: status badge, category, filed date, complainant name
  - Quick actions: Assign Moderator, View Detail
  - Purely moderation — no "File a Dispute" CTA (board members use their own my-disputes widget)
- Icons: Scale (my-disputes), Gavel (admin-disputes)
- Feature flag: `disputes`
- Space assignment: my-disputes→home/community, admin-disputes→admin
- FeatureRegistry entries: page.disputes, feature.disputes.intake, feature.disputes.csos, widget.disputes.my, widget.disputes.admin

### FSD Placement

- `src/features/dispute/model/` — useDisputeIntake, useDisputeThread, useDisputeActions
- `src/features/dispute/ui/intake/` — wizard components (EmotionCheckIn, SelfResolutionChecklist, FrivolityScreen, ConflictTipsPanel, DisputeIntakeWizard)
- `src/features/dispute/ui/` — DisputeForm (form, submits to API)
- `src/entities/dispute/ui/` — status badge, category badge, severity indicator (already built)
- `src/shared/lib/useMultiStep.ts` — reusable multi-step hook extracted from wizard
- `src/widgets/dashboard/ui/` — MyDisputesWidget, AdminDisputesWidget
- `src/app/(dashboard)/disputes/[id]/page.tsx` — dedicated dispute detail page

### the agent's Discretion

- Exact widget lazy-loading pattern (follow existing widgets.ts conventions)
- CSOS export button placement (on dispute detail view header)
- Mediation thread UI approach (follow chat patterns from Phase 09 — MediationThread exists in entity layer)
- Exact `useMultiStep` hook API design (step progression, validation, skip conditions)
  </decisions>

<canonical_refs>

## Canonical References

- `docs/advisories/ADVISORY-017.md` — §7 (Intake Gate), §9 (FSD Placement), §11 (Widget Registration), §17 (Phase Execution Plan)
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` — AI pool degradation pattern
- `.planning/phases/106-dispute-api-routes-intake-screen/` — API routes (prerequisite)
- `.planning/phases/105-dispute-schema-entity-layer/` — Schema + entity layer with 13 existing UI components
- `src/widgets/dashboard/model/widgets.ts` — Widget registration pattern + Scale/Gavel icons
- `src/entities/dispute/ui/` — 13 existing entity UI components (AIFrivolityCheckPanel, CoolingOffTimer, CSOSExportButton, DisputeActionsBar, DisputeCategoryBadge, DisputeListTable, DisputeStatusBadge, DisputeTimeline, EvidencePreviewGrid, EvidenceUploadZone, MediationMessageBubble, MediationThread, SeverityIndicator)
- `src/entities/dispute/model/` — types, constants, lifecycle, schemas
- `src/features/i18n/ui/LocaleAwareEditor.tsx` — Degraded state pattern (from Phase 104)
  </canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/entities/dispute/ui/MediationThread.tsx` — Full mediation thread with Supabase Realtime, message send/scroll. Phase 107 wraps it in the detail page layout.
- `src/entities/dispute/ui/EvidenceUploadZone.tsx` — Drag-and-drop evidence upload with validation, toast feedback. Phase 107 places it in the detail page right column.
- `src/entities/dispute/ui/DisputeActionsBar.tsx` — Action buttons (382 lines). Phase 107 places it in the detail page left column.
- `src/entities/dispute/ui/DisputeTimeline.tsx` — Timeline visualization. Placed in left column.
- `src/entities/dispute/ui/EvidencePreviewGrid.tsx` — Evidence file previews. Placed in right column.
- `src/entities/dispute/ui/AIFrivolityCheckPanel.tsx` — Standalone AI check panel. Placed in right column.
- `src/entities/dispute/ui/DisputeStatusBadge.tsx`, `DisputeCategoryBadge.tsx`, `SeverityIndicator.tsx` — Badge components. Used in widgets, detail page header, and form.
- `src/entities/dispute/ui/DisputeListTable.tsx` — Data table for dispute lists (309 lines). Can be used as data source for widgets.

### Established Patterns

- Widget registration: `registry.register()` in `widgets.ts` with lazy imports, icon from lucide-react, defaultSize/minSize, spaces, featureFlag, permissions
- Multi-space widgets: `spaces: ['home', 'community']` for cross-space placement
- FSD layering: Entity UI components in `src/entities/dispute/ui/`, feature components in `src/features/dispute/ui/`, widget components in `src/widgets/dashboard/ui/`
- React Hook Form + Zod for forms (survey builder, events, etc.)
- Client component with server data fetch for real-time pages (chat pattern)

### Integration Points

- `POST /api/disputes/intake-screen` — FrivolityScreen calls this (Phase 106 route)
- `POST /api/disputes` — DisputeForm creates DRAFT
- `GET/POST /api/disputes/[id]/messages` — MediationThread fetches and posts messages
- Supabase Realtime channel `dispute:{id}` — Live mediation updates (already in MediationThread)
- Widget registry: `registerAllWidgets()` in widgets.ts — add my-disputes and admin-disputes registrations
- FeatureRegistry: add entries for page.disputes, feature.disputes.intake, feature.disputes.csos, widget.disputes.my, widget.disputes.admin
  </code_context>

<deferred>
## Deferred Ideas

- CSOS export button implementation (Phase 108 generates the PDF)
- Multi-language dispute forms (af, xh, zu — future i18n pass)
- Mediator capacity management widget (future admin settings)
  </deferred>

---

_Phase: 107-dispute-ui-widgets_
_Context gathered: 2026-06-26 from ADVISORY-017.md + interactive discussion_
