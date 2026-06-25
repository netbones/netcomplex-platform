# Phase 107: Dispute UI & Widgets - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Source:** ADVISORY-017.md Phases 4 + 5

<domain>
## Phase Boundary

Build the dispute resolution user interface — the psychological intake wizard, dispute creation form, mediation thread UI, evidence uploader, and dashboard widgets. The intake wizard implements the 4-stage de-escalation gate (emotion check-in → self-resolution checklist → AI frivolity screen → conflict tips) before the dispute form. Dashboard widgets surface disputes to residents and provide moderation tools to board/admin.

Depends on: Phase 106 (Dispute API Routes).
</domain>

<decisions>
## Implementation Decisions

### Intake Wizard (Phase 4)

- Multi-step form gated before DisputeForm.tsx
- State machine: `emotion` → `checklist` → `frivolity` (conditional on AI) → `tips` → `form`
- 5 components: EmotionCheckIn, SelfResolutionChecklist, FrivolityScreen, ConflictTipsPanel, DisputeIntakeWizard
- FrivolityScreen calls `POST /api/disputes/intake-screen` (Phase 106 route, Phase 104 AI pool)
- Frivolity step skipped when AI disabled — wizard collapses from 4 to 3 stages
- Emotional state NOT persisted (only intakeCompletedAt timestamp)
- AI-enabled resolved server-side, passed as prop — no client-side loading flash

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

- DisputeForm.tsx — category, title, description, desired outcome, respondent selection, severity
- EvidenceUploader.tsx — file upload with preview
- DisputeThread.tsx — mediation messages (hides isInternal from non-moderators)

### Widgets (Phase 5)

- `my-disputes` — resident: active dispute cases, status badges
- `admin-disputes` — admin/board: moderation queue, assign moderator, issue rulings
- Icons: Scale (my-disputes), Gavel (admin-disputes)
- Feature flag: `disputes`
- Space assignment: my-disputes→home/community, admin-disputes→admin
- FeatureRegistry entries: page.disputes, feature.disputes.intake, feature.disputes.csos, widget.disputes.my, widget.disputes.admin

### FSD Placement

- `src/features/dispute/model/` — useDisputeIntake, useDisputeThread, useDisputeActions
- `src/features/dispute/ui/intake/` — wizard components
- `src/features/dispute/ui/` — form, thread, evidence, CSOS export button
- `src/entities/dispute/ui/` — status badge, category badge, severity indicator

### the agent's Discretion

- Exact widget lazy-loading pattern (follow existing widgets.ts conventions)
- CSOS export button placement (on dispute detail view)
- Mediation thread UI approach (follow chat patterns from Phase 09)
  </decisions>

<canonical_refs>

## Canonical References

- `docs/advisories/ADVISORY-017.md` — §7 (Intake Gate), §9 (FSD Placement), §11 (Widget Registration)
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` — AI pool degradation pattern
- `.planning/phases/106-dispute-api-routes-intake-screen/` — API routes (prerequisite)
- `src/widgets/dashboard/model/widgets.ts` — Widget registration pattern + Scale/Gavel icons
- `src/features/i18n/ui/LocaleAwareEditor.tsx` — Degraded state pattern (from Phase 104)
  </canonical_refs>

<deferred>
## Deferred Ideas

- CSOS export button implementation (Phase 108 generates the PDF)
- Multi-language dispute forms (af, xh, zu — future i18n pass)
- Mediator capacity management widget (future admin settings)
  </deferred>

---

_Phase: 107-dispute-ui-widgets_
_Context gathered: 2026-06-25 from ADVISORY-017.md_
