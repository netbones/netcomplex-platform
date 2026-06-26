# Phase 107: Dispute UI & Widgets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 107-dispute-ui-widgets
**Areas discussed:** Intake launch & page flow, Widget content & behavior, Wizard UX pattern, Mediation detail page layout

---

## Intake Launch & Page Flow

| Option                            | Description                                                                             | Selected |
| --------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| Dedicated page at /disputes/new   | Separate route. Navigate via button/widget.                                             |          |
| Inline in a widget area           | Wizard opens inline in the my-disputes widget or a dashboard modal. No dedicated route. | ✓        |
| Button in widget -> /disputes/new | Widget shows 'File a Dispute' CTA that navigates to the dedicated page.                 |          |

**User's choice:** Inline in a widget area

| Option                                                | Description                                                                                           | Selected |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| Inline — wizard collapses, form renders in same space | The widget transforms: wizard steps disappear, DisputeForm renders in the same widget area.           | ✓        |
| Widget launches a modal/drawer                        | Widget shows the wizard inline, but when the form step begins, it transitions to a full-screen modal. |          |

**User's choice:** Inline — wizard collapses, form renders in same space

| Option                                | Description                                                     | Selected |
| ------------------------------------- | --------------------------------------------------------------- | -------- |
| Dedicated page at /disputes/[id]      | Full-page route wrapping existing entity components.            | ✓        |
| Detail panel expands inline in widget | Clicking a dispute expands it inline — no dedicated route.      |          |
| Dedicated page, nav entry widget-only | /disputes/[id] exists but no top-level nav item for 'Disputes'. |          |

**User's choice:** Dedicated page at /disputes/[id]

| Option                      | Description                                                                    | Selected |
| --------------------------- | ------------------------------------------------------------------------------ | -------- |
| 3-column admin-style layout | Left: timeline + actions. Center: mediation thread. Right: evidence + AI.      | ✓        |
| 2-column layout             | Main content: mediation thread + evidence. Sidebar: status, timeline, actions. |          |
| Stacked single-column       | Mobile-first stacked layout in one scrollable column.                          |          |

**User's choice:** 3-column admin-style layout

---

## Widget Content & Behavior

| Option                          | Description                                                                           | Selected |
| ------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| Status cards with quick actions | Cards with reference, category, status, last updated. Quick action: View. CTA button. | ✓        |
| Minimal count + list            | Summary header with counts + compact list + 'View All' link.                          |          |
| Full table with filters         | Data table with columns: Reference, Category, Status, Updated. Filterable.            |          |

**User's choice:** Status cards with quick actions

| Option                           | Description                                                                                          | Selected |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- |
| Moderation queue + quick actions | Pending disputes needing assignment. Filter tabs: Pending Assignment, In Mediation, Awaiting Ruling. | ✓        |
| Dashboard-style summary cards    | Summary cards showing counts by status. Click to filter below.                                       |          |

**User's choice:** Moderation queue + quick actions

| Option                           | Description                                                                              | Selected |
| -------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Filing only from my-disputes     | Only the resident-facing widget has the intake/CTA. Admin-disputes is purely moderation. | ✓        |
| Admin can file from both widgets | Both widgets have the 'File a Dispute' CTA.                                              |          |

**User's choice:** Filing only from my-disputes

| Option                                             | Description                                                                                             | Selected |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| Widget replaces content — list hides, wizard shows | Clicking 'File a Dispute' replaces the entire widget content with the wizard. 'Back to list' to cancel. | ✓        |
| Wizard overlays the list                           | Wizard opens as a slide-over/panel that overlays the list.                                              |          |

**User's choice:** Widget replaces content — list hides, wizard shows

---

## Wizard UX Pattern

| Option                              | Description                                                                              | Selected |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Numbered inline steps               | Each stage as a numbered section. Completed steps checked off, current step highlighted. | ✓        |
| Horizontal step progress bar at top | Thin progress bar across the top showing current step.                                   |          |
| Vertical sidebar stepper            | Left sidebar showing 4 steps with icons + labels. Content panel on the right.            |          |

**User's choice:** Numbered inline steps

| Option                        | Description                                                                                         | Selected |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| Forward-only with skip for AI | User clicks 'Continue' at each stage to advance. Can't go back. Frivolity skipped when AI disabled. | ✓        |
| Forward with back navigation  | 'Continue' and 'Back' buttons at each stage. Can revisit earlier stages.                            |          |

**User's choice:** Forward-only with skip for AI

| Option                             | Description                                                                             | Selected |
| ---------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| Extract reusable useMultiStep hook | Create a useMultiStep hook in @shared/lib for step progression, skip logic, validation. | ✓        |
| Self-contained in dispute feature  | Build directly in DisputeIntakeWizard.tsx with local state. No abstraction.             |          |

**User's choice:** Extract reusable useMultiStep hook

| Option                          | Description                                             | Selected |
| ------------------------------- | ------------------------------------------------------- | -------- |
| Full-widget takeover on mobile  | Widget temporarily expands to full width during wizard. | ✓        |
| Same inline flow, just narrower | No structural difference on mobile.                     |          |

**User's choice:** Full-widget takeover on mobile

---

## Mediation Detail Page Layout

| Option                                                         | Description                                    | Selected |
| -------------------------------------------------------------- | ---------------------------------------------- | -------- |
| Left: timeline + actions. Center: thread. Right: evidence + AI | Header above all: badges + CSOS export button. | ✓        |
| Left: info + evidence. Center: thread. Right: actions + AI     | Different column assignments.                  |          |

**User's choice:** Left: timeline + actions. Center: thread. Right: evidence + AI

| Option                               | Description                                                                  | Selected |
| ------------------------------------ | ---------------------------------------------------------------------------- | -------- |
| Stacked single column with tabs      | Tabs at top: Timeline, Thread, Evidence. Thread default. Sticky bottom bar.  | ✓        |
| Thread-first with collapsible panels | MediationThread full width. Timeline and Evidence as collapsible accordions. |          |

**User's choice:** Stacked single column with tabs

| Option                                  | Description                                                                       | Selected |
| --------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| Client component with server data fetch | Initial data fetched server-side. Client handles real-time, forms, role-based UI. | ✓        |
| Mixed — server shell, client islands    | Server component fetches initial data. Client islands for real-time/forms.        |          |

**User's choice:** Client component with server data fetch

| Option                                                    | Description                                                                          | Selected |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| React Hook Form + Zod, creates DRAFT, navigates to detail | Existing RHF+Zod pattern. On submit: POST creates DRAFT, navigate to /disputes/[id]. | ✓        |
| Simpler inline form with just creation                    | Lightweight form without RHF. POST creates DRAFT. Widget returns to list.            |          |

**User's choice:** React Hook Form + Zod, creates DRAFT, navigates to detail

---

## the agent's Discretion

- Exact widget lazy-loading pattern (follow existing widgets.ts conventions)
- CSOS export button placement (on dispute detail view header)
- Mediation thread UI approach (follow chat patterns from Phase 09 — MediationThread exists in entity layer)
- Exact `useMultiStep` hook API design (step progression, validation, skip conditions)

## Deferred Ideas

- CSOS export button implementation (Phase 108 generates the PDF)
- Multi-language dispute forms (af, xh, zu — future i18n pass)
- Mediator capacity management widget (future admin settings)
