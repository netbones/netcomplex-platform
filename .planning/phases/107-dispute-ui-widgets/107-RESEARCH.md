# Phase 107: Dispute UI & Widgets — Research

**Researched:** 2026-06-26
**Domain:** React/Next.js UI composition — multi-step wizard, widget system, dispute detail page
**Confidence:** HIGH

## Summary

Phase 107 is an integration/composition phase — it assembles existing entity-layer UI components (built in Phase 105) and API routes (built in Phase 106) into a user-facing dispute resolution experience. No new external dependencies are required; all necessary libraries (React Hook Form, Zod, usehooks-ts, Zustand, lucide-react, Tailwind CSS) are already installed and battle-tested in the project.

The phase has two major deliverables:

1. **Intake Wizard (DISPUTE-06):** A 6-stage state-machine-driven wizard that gates dispute creation behind a psychological de-escalation flow (emotion check-in → self-resolution → AI frivolity screen → conflict tips → dispute form → review). Renders inline in the `my-disputes` widget, replacing widget content during the flow.
2. **Dashboard Widgets & Detail Page (DISPUTE-07):** Two dashboard widgets (my-disputes, admin-disputes), a dedicated dispute detail page at `/disputes/[id]`, and feature flag registration.

**Primary recommendation:** Build the Workflow engine from scratch using TypeScript generics (as specified by CONTEXT.md), leverage existing `usehooks-ts` `useLocalStorage` + `useDebounceValue` for auto-save, and follow the existing chat detail page pattern for the dispute detail page. All entity UI components are pre-built and need only layout composition.

## Architectural Responsibility Map

| Capability                           | Primary Tier          | Secondary Tier        | Rationale                                                                                              |
| ------------------------------------ | --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| Intake Wizard (state machine)        | Browser / Client      | —                     | Multi-step form with localStorage persistence — purely client-side UX                                  |
| AI Frivolity Screen                  | Browser / Client      | API / Backend         | Client renders results; server determines AI availability via `isAiCapabilityEnabled()` passed as prop |
| Dispute Form (React Hook Form + Zod) | Browser / Client      | API / Backend         | Client-side validation with Zod schema; submits to `POST /api/disputes`                                |
| Evidence Uploader                    | Browser / Client      | API / Backend         | Client drag-and-drop UI; uploads to `POST /api/disputes/[id]/evidence`                                 |
| Mediation Thread                     | Browser / Client      | API / Backend         | Client component with Supabase Realtime (existing entity component)                                    |
| Dispute Detail Page                  | Frontend Server (SSR) | Browser / Client      | Server component wrapper; client components for interactive elements (matches chat pattern)            |
| Dashboard Widgets                    | Browser / Client      | Frontend Server (SSR) | Widget components lazy-loaded via registry; data fetched from API by client                            |
| Widget Registration                  | Browser / Client      | —                     | `registerAllWidgets()` runs client-side at dashboard mount                                             |
| Feature Flag (`disputes`)            | API / Backend         | Browser / Client      | Tenant-level flag; gates widget visibility and page access                                             |
| localStorage Auto-Save               | Browser / Client      | —                     | Wizard form state persisted to localStorage with debounce                                              |

## Standard Stack

### Core (No New Dependencies — All Pre-Installed)

| Library         | Version                  | Purpose                               | Why Standard                                                                         |
| --------------- | ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| React           | 19.x (via Preact compat) | UI framework                          | Project standard                                                                     |
| Next.js         | 14 (App Router)          | Framework, routing, SSR               | Project standard                                                                     |
| TypeScript      | 5.x strict               | Type safety                           | Project standard                                                                     |
| React Hook Form | ^7.x                     | Form state management                 | Existing pattern for surveys, events, etc. [VERIFIED: npm registry]                  |
| Zod             | ^3.x                     | Schema validation                     | Existing pattern, dispute schemas already defined in entity layer                    |
| usehooks-ts     | ^3.1.1                   | `useLocalStorage`, `useDebounceValue` | Already installed, AGENTS.md mandates use over custom hooks [VERIFIED: npm registry] |
| Tailwind CSS    | ^3.x                     | Styling                               | Project standard                                                                     |
| lucide-react    | latest                   | Icons (Scale, Gavel)                  | Project standard for widget icons                                                    |

### Supporting (Pre-Installed)

| Library           | Version  | Purpose                                | When to Use                                                              |
| ----------------- | -------- | -------------------------------------- | ------------------------------------------------------------------------ |
| Zustand           | ^5.0.12  | Client state (if needed beyond wizard) | For cross-component state; wizard state is self-contained via useReducer |
| TanStack Query    | ^5.x     | Server state (dispute lists, detail)   | For data fetching in widgets and detail page                             |
| Supabase Realtime | existing | Live mediation updates                 | Already wired in MediationThread entity component                        |

### Alternatives Considered

| Instead of                                  | Could Use                           | Tradeoff                                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom Workflow engine (built from scratch) | XState v5                           | XState is heavier (~12KB gzipped), adds dependency; CONTEXT.md explicitly mandates building reusable engine. Custom engine is lighter and fits the project's TypeScript patterns.                                                |
| `useMultiStep` sub-hook                     | `useStateMachine` (cassiozen, <1KB) | Both are micro-libraries; CONTEXT.md requires a reusable Workflow framework, not just step navigation. Custom build avoids dependency and allows domain-specific features (Condition guards, Validation hooks, Transition maps). |
| Custom localStorage hook                    | `usehooks-ts` `useLocalStorage`     | AGENTS.md §Hooks Best Practices mandates usehooks-ts for common hooks. Already installed.                                                                                                                                        |

**Installation:**

```bash
# No new packages needed. All dependencies are pre-installed.
pnpm install  # verify lockfile is current
```

## Package Legitimacy Audit

> No new packages are introduced in this phase. All required libraries are pre-installed and verified.

| Package         | Registry | Age    | Downloads | Source Repo                                | Verdict | Disposition                                     |
| --------------- | -------- | ------ | --------- | ------------------------------------------ | ------- | ----------------------------------------------- |
| usehooks-ts     | npm      | ~8 yrs | ~4.9M/wk  | github.com/juliencrn/usehooks-ts           | OK      | Pre-installed — used via AGENTS.md mandate      |
| react-hook-form | npm      | ~7 yrs | ~55M/wk   | github.com/react-hook-form/react-hook-form | OK      | Pre-installed — existing project pattern        |
| zod             | npm      | ~6 yrs | ~209M/wk  | github.com/colinhacks/zod                  | OK      | Pre-installed — existing project pattern        |
| zustand         | npm      | ~7 yrs | ~43M/wk   | github.com/pmndrs/zustand                  | OK      | Pre-installed — existing project pattern        |
| lucide-react    | npm      | ~4 yrs | ~84M/wk   | github.com/lucide-icons/lucide             | OK      | Pre-installed — Scale and Gavel icons available |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious:** none (all are established, pre-installed project dependencies; "too-new" automated flags reflect recent version publishes, not suspicious packages)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (SpaceLayout)                        │
│                                                                       │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │   my-disputes Widget      │  │   admin-disputes Widget          │  │
│  │                           │  │                                  │  │
│  │  ┌─────────────────────┐ │  │  Filter Tabs: Pending / Active   │  │
│  │  │ DisputeListTable     │ │  │  ┌────────────────────────────┐ │  │
│  │  │ (entity component)   │ │  │  │ Moderation Queue Rows      │ │  │
│  │  │                     │ │  │  │ (status, category, SLA)     │ │  │
│  │  │ Status cards +      │ │  │  └────────────────────────────┘ │  │
│  │  │ "File a Dispute" CTA │ │  │                                  │  │
│  │  └─────────────────────┘ │  └──────────────────────────────────┘  │
│  │          │                │                                         │
│  │          ▼ (CTA click)    │                                         │
│  │  ┌─────────────────────┐ │                                         │
│  │  │ DisputeIntakeWizard  │ │  Widget content replaced during wizard  │
│  │  │ (6-stage state       │ │  "← Back to My Disputes" breadcrumb    │
│  │  │  machine)            │ │                                         │
│  │  │                     │ │                                         │
│  │  │ emotion → checklist │ │                                         │
│  │  │   → frivolity(AI)   │ │                                         │
│  │  │   → tips → form     │ │                                         │
│  │  │   → review → submit │ │                                         │
│  │  └─────────┬───────────┘ │                                         │
│  │            │ navigate     │                                         │
│  │            ▼              │                                         │
│  └──────────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                  /disputes/[id] (Detail Page)                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  HEADER: DisputeTimeline | DisputeStatusBadge |                   │ │
│  │          DisputeCategoryBadge | SeverityIndicator | CSOSExportBtn │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────┬─────────────────────────────────────┐ │
│  │  LEFT (main)               │  RIGHT (sidebar)                     │ │
│  │                            │                                      │ │
│  │  ┌──────────────────────┐ │  ┌─────────────────────────────────┐ │ │
│  │  │ MediationThread       │ │  │ EvidenceUploadZone              │ │ │
│  │  │ (entity component,    │ │  │ (entity component)              │ │ │
│  │  │  Supabase Realtime)   │ │  └─────────────────────────────────┘ │ │
│  │  └──────────────────────┘ │  ┌─────────────────────────────────┐ │ │
│  │  ┌──────────────────────┐ │  │ EvidencePreviewGrid             │ │ │
│  │  │ DisputeActionsBar     │ │  │ (entity component)              │ │ │
│  │  │ (entity component)    │ │  └─────────────────────────────────┘ │ │
│  │  └──────────────────────┘ │  ┌─────────────────────────────────┐ │ │
│  │                            │  │ AIFrivolityCheckPanel           │ │ │
│  │                            │  │ (entity component)              │ │ │
│  │                            │  └─────────────────────────────────┘ │ │
│  │                            │  ┌─────────────────────────────────┐ │ │
│  │                            │  │ CoolingOffTimer                 │ │ │
│  │                            │  │ (entity component)              │ │ │
│  │                            │  └─────────────────────────────────┘ │ │
│  └────────────────────────────┴─────────────────────────────────────┘ │
│  Mobile: Stacked single column with tabs (Timeline/Thread/Evidence)    │
└──────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (FSD)

```
src/
├── shared/lib/workflow/          # NEW: Reusable Workflow engine
│   ├── types.ts                  # Workflow, Step, Condition, Validation, Transition types
│   ├── createWorkflow.ts         # Factory: creates workflow from config
│   ├── useWorkflow.ts            # Hook: drives workflow state + transitions
│   └── index.ts                  # Public API barrel
├── shared/lib/useAutoSave.ts     # NEW: localStorage auto-save hook
├── shared/lib/types/
│   └── platform-page-flags.ts    # MODIFIED: add disputes flag
├── shared/lib/nav/
│   └── index.ts                  # MODIFIED: add admin_disputes entry (exists)
├── features/dispute/
│   ├── model/
│   │   ├── useDisputeIntake.ts   # NEW: intake wizard state + API calls
│   │   ├── useDisputeThread.ts   # NEW: wraps MediationThread with page-level logic
│   │   └── useDisputeActions.ts  # NEW: action dispatching for DisputeActionsBar
│   └── ui/
│       └── intake/               # NEW: wizard stage components
│           ├── EmotionCheckIn.tsx
│           ├── SelfResolutionChecklist.tsx
│           ├── FrivolityScreen.tsx
│           ├── ConflictTipsPanel.tsx
│           ├── DisputeForm.tsx    # Wraps React Hook Form + submits to API
│           ├── ReviewScreen.tsx
│           └── DisputeIntakeWizard.tsx  # Orchestrator: state machine controller
├── entities/dispute/ui/          # EXISTING: 13 components (no new files)
├── widgets/dashboard/
│   ├── model/widgets.ts          # MODIFIED: add my-disputes, admin-disputes registrations
│   └── ui/
│       ├── MyDisputesWidget.tsx   # NEW
│       └── AdminDisputesWidget.tsx # NEW
├── page-modules/disputes/        # NEW: dispute detail page module
│   └── ui/
│       └── DisputeDetailPage.tsx  # Server component wrapper + client composition
└── app/(dashboard)/disputes/
    └── [id]/
        └── page.tsx               # NEW: route (imports from @pages/disputes)
```

### Pattern 1: Workflow Engine (State Machine)

**What:** A generic, type-safe guided-process framework built from scratch. Encodes a directed graph of steps connected by conditions and transitions. Each step has optional validation and can be conditionally skipped.

**When to use:** Any multi-step guided process — dispute intake, onboarding, maintenance diagnostics, CSOS applications.

**Core types (design contract):**

```typescript
// Source: CONTEXT.md §Intake Wizard + this research
// Location: src/shared/lib/workflow/types.ts

interface WorkflowStep<S extends string, C extends Record<string, unknown>> {
  id: S;
  component: React.ComponentType<WorkflowStepProps<C>>;
  /** Condition evaluated before entering this step. If returns false, step is auto-skipped. */
  condition?: (ctx: C) => boolean;
  /** Validation run before allowing transition forward. Returns error string or null. */
  validate?: (ctx: C) => string | null;
}

interface WorkflowTransition<S extends string, C extends Record<string, unknown>> {
  from: S;
  to: S;
  /** Guard: return false to block the transition */
  guard?: (ctx: C) => boolean;
  /** Side effect executed during transition */
  effect?: (ctx: C) => void;
}

interface WorkflowConfig<S extends string, C extends Record<string, unknown>> {
  steps: WorkflowStep<S, C>[];
  transitions: WorkflowTransition<S, C>[];
  initialStep: S;
  /** Called when workflow completes (reaches terminal state) */
  onComplete: (ctx: C) => void | Promise<void>;
}
```

**Hook API:**

```typescript
// Source: CONTEXT.md + codebase patterns (useReducer for state machines)
// Location: src/shared/lib/workflow/useWorkflow.ts

function useWorkflow<S extends string, C extends Record<string, unknown>>(
  config: WorkflowConfig<S, C>
): {
  // Current step ID
  currentStep: S;
  // Current step config (for rendering)
  currentStepConfig: WorkflowStep<S, C>;
  // Accumulated context (form data + metadata)
  ctx: C;
  // Update context (from step components)
  updateCtx: (patch: Partial<C>) => void;
  // Advance to next step (respects conditions + transitions)
  next: () => void;
  // Completed step IDs (for checkmark display)
  completedSteps: S[];
  // Whether workflow is complete
  isComplete: boolean;
  // Error from last validation
  validationError: string | null;
};
```

**Example (dispute intake):**

```typescript
// Source: CONTEXT.md state machine specification
const intakeWorkflow: WorkflowConfig<IntakeStep, IntakeContext> = {
  initialStep: 'emotion',
  steps: [
    { id: 'emotion', component: EmotionCheckIn },
    { id: 'checklist', component: SelfResolutionChecklist },
    {
      id: 'frivolity',
      component: FrivolityScreen,
      condition: ctx => ctx.aiEnabled, // auto-skipped when AI disabled
    },
    { id: 'tips', component: ConflictTipsPanel },
    { id: 'form', component: DisputeForm, validate: validateDisputeForm },
    { id: 'review', component: ReviewScreen },
  ],
  transitions: [
    { from: 'emotion', to: 'checklist' },
    { from: 'checklist', to: 'frivolity' },
    { from: 'checklist', to: 'tips', guard: ctx => !ctx.aiEnabled },
    { from: 'frivolity', to: 'tips' },
    { from: 'tips', to: 'form' },
    { from: 'form', to: 'review' },
    { from: 'review', to: '__complete__', effect: submitDispute },
  ],
  onComplete: ctx => {
    /* navigate to /disputes/[id] */
  },
};
```

### Pattern 2: localStorage Auto-Save

**What:** Debounced persistence of wizard form state to localStorage so users don't lose progress on accidental navigation or page refresh.

**When to use:** Any multi-step form where data loss would be frustrating. The dispute intake wizard is the first consumer.

**Implementation using pre-installed usehooks-ts:**

```typescript
// Source: usehooks-ts v3.1.1 API + CONTEXT.md auto-save spec
// Location: src/shared/lib/useAutoSave.ts

import { useLocalStorage, useDebounceValue } from 'usehooks-ts';
import { useEffect, useRef } from 'react';

interface UseAutoSaveOptions<T> {
  key: string; // localStorage key
  data: T; // data to persist
  delay?: number; // debounce delay in ms (default: 2000)
  enabled?: boolean; // conditional auto-save
}

export function useAutoSave<T>({ key, data, delay = 2000, enabled = true }: UseAutoSaveOptions<T>) {
  const [debouncedData, setDebouncedData] = useDebounceValue(data, delay);
  const [savedData, setSavedData] = useLocalStorage<T | null>(key, null);
  const lastSavedAt = useRef<number | null>(null);
  const [secondsSinceSave, setSecondsSinceSave] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setSavedData(debouncedData);
    lastSavedAt.current = Date.now();
    setSecondsSinceSave(0);
  }, [debouncedData, enabled, setSavedData]);

  // Update "saved N seconds ago" indicator every second
  useEffect(() => {
    if (lastSavedAt.current === null) return;
    const interval = setInterval(() => {
      setSecondsSinceSave(Math.floor((Date.now() - lastSavedAt.current!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    savedData, // restored data on mount
    secondsSinceSave, // for "Saved N seconds ago" indicator
    clearSaved: () => setSavedData(null),
  };
}
```

### Pattern 3: Widget with Content Replacement (Intake Wizard)

**What:** A widget that replaces its default content with a multi-step wizard when the user clicks a CTA, then returns to the default view on completion.

**When to use:** Widgets that host modal-like flows without actual modals — the widget frame provides spatial orientation.

```typescript
// Source: Existing widget patterns in src/widgets/dashboard/ui/*Widget.tsx
// Pattern: useState for view mode, conditional rendering

'use client';

export function MyDisputesWidget() {
  const [view, setView] = useState<'list' | 'wizard'>('list');

  if (view === 'wizard') {
    return (
      <DisputeIntakeWizard
        aiEnabled={aiEnabled}  // passed as prop, resolved server-side
        onComplete={(disputeId) => {
          setView('list');
          router.push(`/disputes/${disputeId}`);
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  return (
    <div>
      <DisputeListTable />
      <button onClick={() => setView('wizard')}>File a Dispute</button>
    </div>
  );
}
```

### Pattern 4: Dispute Detail Page (Server Component Wrapper + Client Composition)

**What:** Follows the existing MessagesPage pattern — a server component wrapper in `src/app/(dashboard)/disputes/[id]/page.tsx` that imports the page module from `@pages/disputes`.

**When to use:** Any dedicated detail page with real-time features that need client-side interactivity.

```typescript
// Source: src/app/messages/page.tsx pattern
// Location: src/app/(dashboard)/disputes/[id]/page.tsx

import { DisputeDetailPage } from '@pages/disputes';
import { Suspense } from 'react';
import { LoadingSpinner } from '@shared/ui';

export default function DisputeDetailRoute({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DisputeDetailPage disputeId={params.id} />
    </Suspense>
  );
}
```

### Pattern 5: Widget Registration

**What:** Follows existing `registerAllWidgets()` conventions with lazy imports, lucide-react icons, feature flags, space assignments, and permission gating.

```typescript
// Source: src/widgets/dashboard/model/widgets.ts existing patterns
// Add inside registerAllWidgets():

import { Scale, Gavel } from 'lucide-react';

registry.register({
  id: 'my-disputes',
  version: '1.0.0',
  name: 'My Disputes',
  description: 'Your filed disputes and their status',
  author: 'internal',
  category: 'core',
  icon: Scale,
  featureFlag: 'disputes',
  component: lazy(() =>
    import('../ui/MyDisputesWidget').then(m => ({ default: m.MyDisputesWidget }))
  ),
  defaultSize: { width: 3, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['home', 'community'],
});

registry.register({
  id: 'admin-disputes',
  version: '1.0.0',
  name: 'Dispute Moderation',
  description: 'Moderation queue for dispute resolution',
  author: 'internal',
  category: 'core',
  icon: Gavel,
  featureFlag: 'disputes',
  permissions: ['admin', 'board'],
  component: lazy(() =>
    import('../ui/AdminDisputesWidget').then(m => ({ default: m.AdminDisputesWidget }))
  ),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 3, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['admin'],
});
```

### Anti-Patterns to Avoid

- **useState for wizard step tracking:** Leads to scattered navigation logic. Use `useReducer` with a state machine (the Workflow engine) for predictable transitions and forward-only enforcement. [CITED: medium.com/@ignatovich.dm — State Machines in React, Dec 2024]
- **Hand-written localStorage sync:** Leads to stale reads and race conditions. Use `usehooks-ts` `useLocalStorage` which handles SSR safety, cross-tab sync via storage events, and JSON serialization. [CITED: usehooks-ts.com/react-hook/use-local-storage]
- **Props drilling AI configuration:** Pass `aiEnabled` as a single boolean prop resolved server-side via `isAiCapabilityEnabled()`. Avoid client-side fetch for feature flags that are available at request time.
- **Deeply nested conditional rendering in widgets:** Use a view state enum (`'list' | 'wizard'`) with early returns for each view. Keeps widget code flat and readable.
- **Creating new page routes for wizard steps:** The wizard is inline in the widget. Only the dispute detail page gets a route (`/disputes/[id]`). No `/disputes/new` route per CONTEXT.md.

## Don't Hand-Roll

| Problem                  | Don't Build                                     | Use Instead                                                             | Why                                                                                                                                                                   |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| localStorage persistence | Custom `useLocalStorage` hook                   | `usehooks-ts` `useLocalStorage`                                         | Handles SSR safety, cross-tab sync via `storage` events, JSON serialization edge cases, and `initializeWithValue` option. Already installed. [CITED: usehooks-ts.com] |
| Debounced auto-save      | Custom debounce with `useEffect` + `setTimeout` | `usehooks-ts` `useDebounceValue` + `useLocalStorage`                    | Manages cleanup on unmount, stable callback references. AGENTS.md mandates usehooks-ts for common patterns. [CITED: usehooks-ts.com]                                  |
| State machine for wizard | Manual `useState` + if/else chains              | Custom Workflow engine (`src/shared/lib/workflow/`)                     | CONTEXT.md explicitly mandates a reusable engine, not ad-hoc state. Built from scratch per the design contract, not a 3rd-party library.                              |
| Form validation schema   | Hand-written validation                         | Zod schemas from entity layer (`src/entities/dispute/model/schemas.ts`) | Single source of truth — schemas already exist and are shared between API and client.                                                                                 |
| File upload UI           | Custom drag-and-drop                            | Existing `EvidenceUploadZone` entity component                          | Already built in Phase 105 — handles validation, toast feedback, rate limiting.                                                                                       |
| Real-time messaging      | Custom WebSocket                                | Existing `MediationThread` with Supabase Realtime                       | Already built in Phase 105 — channel `dispute:{id}`, broadcast events.                                                                                                |

**Key insight:** This phase is 80% composition of existing entity components. The only truly new code is the Workflow engine, wizard stage components, auto-save hook, and the two widget shell components. Everything else (thread, uploader, badges, timeline, actions bar) is pre-built and tested.

## Runtime State Inventory

> This is a greenfield UI phase (not a rename/refactor/migration). No runtime state migration needed.

| Category            | Items Found                                     | Action Required |
| ------------------- | ----------------------------------------------- | --------------- |
| Stored data         | None — new feature, no existing dispute UI data | None            |
| Live service config | None                                            | None            |
| OS-registered state | None                                            | None            |
| Secrets/env vars    | None — no new env vars needed                   | None            |
| Build artifacts     | None                                            | None            |

**Nothing found in category:** All five categories confirmed empty — this is a pure UI composition phase with no runtime state dependencies.

## Common Pitfalls

### Pitfall 1: localStorage QuotaExceededError

**What goes wrong:** `useLocalStorage` throws when localStorage is full (5-10MB browser limit). Wizard form data with evidence previews could approach this.
**Why it happens:** Repeated saves of large JSON blobs (base64 evidence data). The auto-save hook persists every 2 seconds.
**How to avoid:** Store only form field VALUES (text, selections), not file data. Evidence files are uploaded via the dedicated uploader and referenced by ID. Wrap `setSavedData` in try/catch; show a toast warning if save fails.
**Warning signs:** Console error "QuotaExceededError", silent save failures.

### Pitfall 2: SSR Mismatch with localStorage

**What goes wrong:** Next.js server render produces different HTML than client hydration because localStorage values differ.
**Why it happens:** `useLocalStorage` returns `initialValue` on server, stored value on client. If the stored value changes the rendered UI structure, React hydration fails.
**How to avoid:** `usehooks-ts` `useLocalStorage` handles this via `initializeWithValue` option and `IS_SERVER` checks. For wizard state, only render step content after `useIsMounted()` returns true (another usehooks-ts hook, already installed).
**Warning signs:** "Hydration failed" console errors, "Text content does not match" warnings.

### Pitfall 3: Widget Content Replacement Losing State

**What goes wrong:** User is mid-wizard, clicks "Back to My Disputes" breadcrumb, wizard state is lost.
**Why it happens:** Widget unmounts the wizard component when switching views, clearing React state.
**How to avoid:** The `useAutoSave` hook persists to localStorage on every debounced change. On wizard mount, restore from localStorage. The wizard component checks for saved state and offers to resume.
**Warning signs:** User reports losing filled form data after accidental navigation.

### Pitfall 4: AI Step Loading Flash

**What goes wrong:** FrivolityScreen shows a loading spinner for a split second while checking if AI is enabled, causing layout shift.
**Why it happens:** Client-side fetch to determine AI availability has network latency.
**How to avoid:** Resolve `aiEnabled` server-side (via `isAiCapabilityEnabled()`) and pass as a prop to the widget. The `DisputeIntakeWizard` receives it as a prop — no client-side fetch. The workflow's `condition` on the `frivolity` step evaluates synchronously from context.
**Warning signs:** Brief spinner flash before the frivolity step, layout shift on wizard mount.

### Pitfall 5: Admin Widget SLA Calculation Overhead

**What goes wrong:** The admin-disputes widget re-calculates "oldest pending age" and "SLA indicator" on every render, causing sluggish scrolling.
**Why it happens:** Computing time differences from ISO strings is cheap per-item but expensive when done inline in render for dozens of disputes.
**How to avoid:** Pre-compute SLA metadata when disputes are fetched (in `useDisputeActions` or a TanStack Query selector). Use `useMemo` to memoize computed columns. The DisputeListTable already handles this well — follow its pattern.
**Warning signs:** Janky scrolling in admin disputes widget with 50+ items, React DevTools showing frequent re-renders.

## Code Examples

### Workflow Engine — `useWorkflow` Hook (Core Pattern)

```typescript
// Source: CONTEXT.md state machine spec + React useReducer best practices
// Location: src/shared/lib/workflow/useWorkflow.ts

import { useReducer, useCallback, useMemo } from 'react';

type WorkflowAction<S extends string, C> =
  | { type: 'NEXT' }
  | { type: 'UPDATE_CTX'; patch: Partial<C> }
  | { type: 'SET_ERROR'; error: string | null };

interface WorkflowState<S extends string, C> {
  currentStep: S;
  ctx: C;
  completedSteps: S[];
  isComplete: boolean;
  validationError: string | null;
}

function createWorkflowReducer<S extends string, C>(config: WorkflowConfig<S, C>) {
  return (state: WorkflowState<S, C>, action: WorkflowAction<S, C>): WorkflowState<S, C> => {
    switch (action.type) {
      case 'UPDATE_CTX':
        return { ...state, ctx: { ...state.ctx, ...action.patch } };

      case 'SET_ERROR':
        return { ...state, validationError: action.error };

      case 'NEXT': {
        const currentStepConfig = config.steps.find(s => s.id === state.currentStep);
        if (!currentStepConfig) return state;

        // Run validation
        if (currentStepConfig.validate) {
          const error = currentStepConfig.validate(state.ctx);
          if (error) return { ...state, validationError: error };
        }

        // Find matching transition
        const transition = config.transitions.find(t => {
          if (t.from !== state.currentStep) return false;
          if (t.guard && !t.guard(state.ctx)) return false;
          return true;
        });

        if (!transition) return state;

        // Execute side effect
        transition.effect?.(state.ctx);

        // Update completed steps
        const newCompleted = [...state.completedSteps, state.currentStep];

        // Check if complete
        if (transition.to === ('__complete__' as S)) {
          config.onComplete?.(state.ctx);
          return {
            ...state,
            isComplete: true,
            completedSteps: newCompleted,
            validationError: null,
          };
        }

        return {
          ...state,
          currentStep: transition.to,
          completedSteps: newCompleted,
          validationError: null,
        };
      }

      default:
        return state;
    }
  };
}
```

### EmotionCheckIn Stage Component

```typescript
// Source: CONTEXT.md §Stage 1 — EmotionCheckIn
// Location: src/features/dispute/ui/intake/EmotionCheckIn.tsx

interface EmotionCheckInProps {
  selected: string | null;
  onSelect: (emotion: string) => void;
}

const EMOTIONS = [
  { emoji: '😤', label: 'Very angry', value: 'very_angry' },
  { emoji: '😟', label: 'Upset', value: 'upset' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '🙂', label: 'Calm', value: 'calm' },
  { emoji: '😌', label: 'Resolved', value: 'resolved' },
] as const;

export function EmotionCheckIn({ selected, onSelect }: EmotionCheckInProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">How are you feeling about this situation?</h3>
      <p className="text-sm text-gray-500">
        This helps us understand your perspective. Your emotional state is not stored —
        only that you completed this check-in.
      </p>
      <div className="flex justify-center gap-4">
        {EMOTIONS.map(({ emoji, label, value }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all
              ${selected === value
                ? 'border-soralia-primary bg-indigo-50 scale-110'
                : 'border-gray-200 hover:border-gray-300'
              }`}
            aria-pressed={selected === value}
          >
            <span className="text-3xl" role="img" aria-label={label}>{emoji}</span>
            <span className="text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
      {selected && (selected === 'very_angry' || selected === 'upset') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800">We understand this is difficult.</p>
          <p className="text-amber-700 mt-1">
            You can save your progress and return later, read our conflict resolution tips,
            or continue filing your dispute. The choice is yours.
          </p>
        </div>
      )}
    </div>
  );
}
```

### Widget Registration — Feature Flag + Page Flag

```typescript
// Source: Existing PlatformPageFlags pattern + CONTEXT.md feature flag spec
// Location: src/shared/lib/types/platform-page-flags.ts (MODIFY)

export interface PlatformPageFlags {
  // ... existing flags ...
  disputes: boolean; // ADD: gates dispute feature visibility
}
```

## State of the Art

| Old Approach                    | Current Approach                        | When Changed                            | Impact                                                                                                    |
| ------------------------------- | --------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `useState` for multi-step forms | `useReducer` with state machine pattern | Established React best practice (2020+) | Predictable state transitions, easier testing, no scattered navigation logic                              |
| `useDebounce` (usehooks-ts v2)  | `useDebounceValue` (usehooks-ts v3)     | usehooks-ts v3 (2024)                   | Project uses v3.1.1 — must use new API. `useDebounce` was removed in v3.                                  |
| Custom localStorage sync        | `usehooks-ts` `useLocalStorage`         | AGENTS.md mandate                       | SSR safety built-in, cross-tab sync, no race conditions                                                   |
| XState for state machines       | Custom lightweight Workflow engine      | CONTEXT.md decision                     | No external dependency, domain-specific features (auto-skip conditions, validation hooks), smaller bundle |

**Deprecated/outdated:**

- `useDebounce` from usehooks-ts: Removed in v3. Use `useDebounceValue` (for values) or `useDebounceCallback` (for callbacks). The project is on v3.1.1. [CITED: usehooks-ts.com/migrate-to-v3]
- `useFetch` from usehooks-ts: Removed in v3. Use TanStack Query for data fetching (already the project standard).

## Assumptions Log

> Claims tagged `[ASSUMED]` signal to the planner and discuss-phase that these need user confirmation.

| #   | Claim                                                                                                                                                                                                       | Section               | Risk if Wrong                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `Scale` and `Gavel` icons exist in the installed lucide-react version                                                                                                                                       | Standard Stack        | Low — both are standard lucide icons. Fallback: use `FileText` and `Shield` if unavailable.                                                                                                                 |
| A2  | `usehooks-ts` v3.1.1 `useLocalStorage` handles SSR hydration correctly in Next.js 14                                                                                                                        | Architecture Patterns | Low — documented behavior, project already uses usehooks-ts elsewhere.                                                                                                                                      |
| A3  | The `disputes` feature flag does not need to be added to `PlatformPageFlags` for widget gating alone — widgets use `featureFlag` on manifest, which gates via Vercel Feature Flags, not `PlatformPageFlags` | Standard Stack        | Medium — if page-level gating is also needed (e.g., hiding `/disputes/[id]` route), `PlatformPageFlags` must be extended. The `featureFlag: 'disputes'` on widget manifests handles widget visibility only. |
| A4  | `isAiCapabilityEnabled(tenantId, 'ai.disputes.frivolityScreen')` resolves on the server and is passed as a static prop to client components                                                                 | Architecture Patterns | Low — confirmed by reading `src/entities/tenant/api/ai-capabilities.ts`.                                                                                                                                    |
| A5  | `MediationThread` entity component's Supabase Realtime channel `dispute:{id}` works without additional setup on the dispute detail page                                                                     | Architecture Patterns | Low — the entity component is self-contained and handles its own subscription lifecycle.                                                                                                                    |

## Open Questions (RESOLVED)

1. **Where is the `disputes` feature flag defined?** — RESOLVED: The flag is registered via Vercel Feature Flags by Plan 03 Task 3 (`featureFlag: 'disputes'` on widget manifests). No pre-existing flag needed — the widget registration itself creates the gating mechanism.
   - What we know: Widget manifests reference `featureFlag: 'disputes'`. The project uses Vercel Feature Flags.
   - What's unclear: Whether the flag already exists in Vercel or needs to be created. Existing dispute entity code (Phase 105) may have already registered it.
   - Recommendation: Check Vercel Feature Flags dashboard or `src/shared/lib/flags/` for existing `disputes` flag. If absent, create it before this phase executes.

2. **Does the admin dispute route `/admin/disputes` already exist?** — RESOLVED: Admin dispute management is widget-only per CONTEXT.md. The `/admin/disputes` nav entry exists in `ADMIN_NAV_REGISTRY` but no page file is created — discovery is widget-only. No page stub needed.
   - What we know: `ADMIN_NAV_REGISTRY` includes `admin_disputes` → `/admin/disputes` with `permission: 'admin'`. But no page file exists at `src/app/admin/disputes/`.
   - What's unclear: Whether this page is in scope for Phase 107 or deferred. The CONTEXT.md mentions admin-disputes as a widget in the admin dashboard space, not a standalone page.
   - Recommendation: Admin dispute management is widget-only (admin-disputes widget in admin space). The `/admin/disputes` nav entry is already registered but may need a page stub if navigation is built out. Confirm with product owner.

3. **Should the Workflow engine handle back-navigation?** — RESOLVED: Engine supports optional back-navigation via `allowBack` config flag (default: false). Dispute wizard sets `allowBack: false` per CONTEXT.md forward-only requirement.
   - What we know: CONTEXT.md states "Forward-only transitions (no back navigation)."
   - What's unclear: Whether this is a permanent design constraint or just for the dispute intake wizard. A reusable engine should arguably support back-navigation for other use cases (onboarding, diagnostics).
   - Recommendation: Build the engine to support optional back-navigation via a `allowBack` config flag (default: false). The dispute wizard sets `allowBack: false`.

## Environment Availability

| Dependency           | Required By                       | Available | Version            | Fallback |
| -------------------- | --------------------------------- | --------- | ------------------ | -------- |
| Node.js              | Build/runtime                     | ✓         | (project standard) | —        |
| pnpm                 | Package management                | ✓         | (project standard) | —        |
| Next.js 14           | Framework                         | ✓         | (installed)        | —        |
| React Hook Form      | DisputeForm                       | ✓         | ^7.x (installed)   | —        |
| Zod                  | Form validation                   | ✓         | ^3.x (installed)   | —        |
| usehooks-ts          | useLocalStorage, useDebounceValue | ✓         | ^3.1.1 (installed) | —        |
| lucide-react         | Widget icons (Scale, Gavel)       | ✓         | latest (installed) | —        |
| Supabase             | MediationThread Realtime          | ✓         | (configured)       | —        |
| Vercel Feature Flags | Widget gating                     | ✓         | (configured)       | —        |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

All dependencies are pre-installed and configured. This phase introduces zero new external dependencies.

## Validation Architecture

### Test Framework

| Property           | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| Framework          | Vitest 4.1.2                                                   |
| Config file        | `vitest.config.ts` (project root)                              |
| Quick run command  | `pnpm vitest run src/features/dispute src/shared/lib/workflow` |
| Full suite command | `pnpm test:run`                                                |

### Phase Requirements → Test Map

| Req ID     | Behavior                                                                      | Test Type   | Automated Command                                                                           | File Exists? |
| ---------- | ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- | ------------ |
| DISPUTE-06 | Workflow engine: forward-only transitions, condition guards, validation hooks | unit        | `pnpm vitest run src/shared/lib/workflow/__tests__/useWorkflow.test.ts -t "forward-only"`   | ❌ Wave 0    |
| DISPUTE-06 | Workflow engine: auto-skip step when condition returns false                  | unit        | `pnpm vitest run src/shared/lib/workflow/__tests__/useWorkflow.test.ts -t "auto-skip"`      | ❌ Wave 0    |
| DISPUTE-06 | EmotionCheckIn: emoji selection, soft gate on upset/angry                     | component   | `pnpm vitest run src/features/dispute/ui/intake/__tests__/EmotionCheckIn.test.tsx`          | ❌ Wave 0    |
| DISPUTE-06 | SelfResolutionChecklist: <2 boxes → contextual tip                            | component   | `pnpm vitest run src/features/dispute/ui/intake/__tests__/SelfResolutionChecklist.test.tsx` | ❌ Wave 0    |
| DISPUTE-06 | FrivolityScreen: renders AI results, advisory banner, always allows proceed   | component   | `pnpm vitest run src/features/dispute/ui/intake/__tests__/FrivolityScreen.test.tsx`         | ❌ Wave 0    |
| DISPUTE-06 | DisputeForm: submits to POST /api/disputes, validates with Zod                | integration | `pnpm vitest run src/features/dispute/ui/intake/__tests__/DisputeForm.test.tsx`             | ❌ Wave 0    |
| DISPUTE-06 | useAutoSave: persists to localStorage, shows "saved N seconds ago"            | unit        | `pnpm vitest run src/shared/lib/__tests__/useAutoSave.test.ts`                              | ❌ Wave 0    |
| DISPUTE-07 | my-disputes widget: renders DisputeListTable, CTA triggers wizard             | integration | `pnpm vitest run src/widgets/dashboard/ui/__tests__/MyDisputesWidget.test.tsx`              | ❌ Wave 0    |
| DISPUTE-07 | admin-disputes widget: renders moderation queue with filter tabs              | integration | `pnpm vitest run src/widgets/dashboard/ui/__tests__/AdminDisputesWidget.test.tsx`           | ❌ Wave 0    |
| DISPUTE-07 | Dispute detail page: renders header + 2-column layout + entity components     | integration | `pnpm vitest run src/page-modules/disputes/ui/__tests__/DisputeDetailPage.test.tsx`         | ❌ Wave 0    |
| DISPUTE-07 | Widget registration: my-disputes and admin-disputes in registry               | unit        | `pnpm vitest run src/widgets/dashboard/model/__tests__/widgets.test.ts -t "disputes"`       | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `pnpm vitest run --reporter=verbose` on changed files only
- **Per wave merge:** `pnpm test:run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/shared/lib/workflow/__tests__/useWorkflow.test.ts` — covers REQ-DISPUTE-06 workflow engine behavior
- [ ] `src/shared/lib/__tests__/useAutoSave.test.ts` — covers auto-save hook
- [ ] `src/features/dispute/ui/intake/__tests__/EmotionCheckIn.test.tsx` — covers emotion stage
- [ ] `src/features/dispute/ui/intake/__tests__/SelfResolutionChecklist.test.tsx` — covers checklist stage
- [ ] `src/features/dispute/ui/intake/__tests__/FrivolityScreen.test.tsx` — covers AI screen
- [ ] `src/features/dispute/ui/intake/__tests__/DisputeForm.test.tsx` — covers form submission
- [ ] `src/widgets/dashboard/ui/__tests__/MyDisputesWidget.test.tsx` — covers resident widget
- [ ] `src/widgets/dashboard/ui/__tests__/AdminDisputesWidget.test.tsx` — covers admin widget
- [ ] `src/page-modules/disputes/ui/__tests__/DisputeDetailPage.test.tsx` — covers detail page
- [ ] `src/widgets/dashboard/model/__tests__/widgets.test.ts` — add dispute widget registration tests
- [ ] `src/test/setup.ts` — existing; verify localStorage mock is available for auto-save tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                                                                                                          |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth session — all dispute APIs require auth (Phase 106)                                                                                                                                           |
| V3 Session Management | yes     | Better Auth session tokens — managed by existing auth infrastructure                                                                                                                                      |
| V4 Access Control     | yes     | Role-based: residents see own disputes; admin/board see moderation queue. API routes enforce this (Phase 106). Widgets use `permissions: ['admin', 'board']` for admin-disputes.                          |
| V5 Input Validation   | yes     | Zod schemas in `src/entities/dispute/model/schemas.ts` — shared between client (React Hook Form) and server (API routes). Evidence upload validates file type and size client-side AND server-side.       |
| V6 Cryptography       | no      | No cryptographic operations in this UI phase                                                                                                                                                              |
| V7 Error Handling     | yes     | Toast notifications for user-facing errors; console.error for debugging. `ErrorBoundary` wraps widgets and detail page per AGENTS.md mandate.                                                             |
| V8 Data Protection    | yes     | Emotional state NOT persisted (only `intakeCompletedAt` timestamp). Dispute content is sensitive — shown only to authorized users. localStorage auto-save stores form field data only, not file contents. |
| V9 Communication      | yes     | All API calls use HTTPS (Vercel deployment). Supabase Realtime uses WSS.                                                                                                                                  |

### Known Threat Patterns for Next.js 14 + React

| Pattern                                      | STRIDE                 | Standard Mitigation                                                                                                                                                                            |
| -------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS via dispute description rendering        | Tampering              | React's JSX auto-escapes by default. Dispute descriptions are rendered as text, not HTML. No `dangerouslySetInnerHTML` for user content.                                                       |
| CSRF on form submission                      | Tampering              | Next.js Server Actions and API routes include CSRF protection by default. React Hook Form with `fetch` to API routes is standard.                                                              |
| Information disclosure via widget visibility | Information Disclosure | `admin-disputes` widget has `permissions: ['admin', 'board']` — registry enforces. API routes return 403 for unauthorized access (Phase 106).                                                  |
| localStorage data exposure                   | Information Disclosure | Auto-saved wizard data in localStorage is accessible to any JS on the same origin. Form fields stored are non-sensitive (category, title, description draft). No credentials or tokens stored. |
| Realtime subscription hijacking              | Elevation of Privilege | Supabase Realtime channel `dispute:{id}` uses RLS policies (Phase 106). Client can only subscribe to disputes they're authorized to view.                                                      |

## Sources

### Primary (HIGH confidence)

- `src/widgets/dashboard/model/widgets.ts` — Widget registration patterns, lazy imports, feature flags, permissions, space assignments
- `src/entities/dispute/ui/` — 13 pre-built entity UI components (MediationThread, EvidenceUploadZone, DisputeStatusBadge, etc.)
- `src/entities/dispute/model/types.ts` — DisputeCaseDTO, DisputeStatus, DisputeCategory, DisputeSeverity types
- `src/entities/dispute/model/constants.ts` — STATUS_LABELS, CATEGORY_LABELS, SEVERITY_LABELS, CSOS_ELIGIBLE_STATUSES
- `src/entities/tenant/api/ai-capabilities.ts` — `isAiCapabilityEnabled()`, `AiCapabilityKey` for `ai.disputes.frivolityScreen`
- `src/shared/lib/nav/index.ts` — NAV_REGISTRY, ADMIN_NAV_REGISTRY, `isNavItemVisible()` pattern
- `src/shared/lib/types/platform-page-flags.ts` — PlatformPageFlags interface
- `src/app/messages/page.tsx` — Detail page pattern (server wrapper + Suspense + page module import)
- `vitest.config.ts` — Test framework configuration, alias map, coverage thresholds
- `package.json` — Installed dependency versions (usehooks-ts@^3.1.1, react-hook-form, zod, zustand, lucide-react)

### Secondary (MEDIUM confidence)

- Brave WebSearch: "React multi-step wizard form state machine pattern best practices" — confirmed useReducer pattern for wizards, XState as alternative [CITED: medium.com/@ignatovich.dm, Dec 2024]
- Brave WebSearch: "localStorage auto-save React hook debounce pattern" — confirmed usehooks-ts useLocalStorage + useDebounceValue combination [CITED: usehooks-ts.com, dev.to, Jan 2025]
- Brave WebSearch: "usehooks-ts useLocalStorage API documentation" — confirmed v3 API (`useLocalStorage<T>(key, initialValue, options?)`) and migration from v2 (`useDebounce` → `useDebounceValue`)
- Brave WebSearch: "React workflow engine state machine reusable pattern typescript" — confirmed useReducer pattern, condition guards, validation hooks [CITED: medium.com/@roopak1234, Mar 2025]
- `usehooks-ts` npm page — confirmed v3.1.0+ API, `useDebounce` removal, `useDebounceValue` replacement

### Tertiary (LOW confidence)

- Brave WebSearch: "useStateMachine" (cassiozen) — referenced as alternative; not adopted per CONTEXT.md scratch-build decision
- XState documentation — referenced as alternative; not adopted (heavier, external dependency)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all dependencies pre-installed, zero new packages needed
- Architecture: HIGH — explicit decisions in CONTEXT.md, existing patterns in codebase, existing entity components confirmed
- Pitfalls: MEDIUM — identified via web search for common patterns; SSR hydration and localStorage edge cases verified via usehooks-ts docs
- Workflow engine design: MEDIUM — design contract derived from CONTEXT.md spec and best practices; implementation details at agent's discretion

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (30 days — stable Next.js/React patterns, no fast-moving external dependencies)
