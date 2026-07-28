# Advisory — Phase 30: Dashboard Phase B (Focus Spaces)

**Reviewed:** 2026-05-24  
**Plans:** 30-01 through 30-05  
**Status:** Pre-execution review

---

## Summary

The five plans are well-structured and the dependency chain is sound. The feature flag coexistence strategy (Q5) and the Q1–Q4 user decisions are applied consistently throughout. The sequencing (01 → 02/03 → 04 → 05) is correct and the autonomous/checkpoint gating is appropriate.

The risks below are not blockers. They are targeted improvements — primarily around data source ambiguity, type safety surface area, safe-area CSS, and a cross-phase dependency gap. Address them before or during execution.

---

## Risk Register

| ID  | Plan  | Severity | Area                                                   |
| --- | ----- | -------- | ------------------------------------------------------ |
| A1  | 30-03 | High     | Mass breaking change to widget manifests               |
| A2  | 30-04 | High     | MyHomeSpace data source is ambiguous                   |
| A3  | 30-05 | Medium   | Safe-area inset not applied to content padding         |
| A4  | 30-02 | Medium   | Promise.all fetch pattern may not be followed          |
| A5  | 30-02 | Medium   | Key mapping inconsistency risk across two files        |
| A6  | 30-03 | Medium   | Registry populated at runtime, not module init         |
| A7  | 30-04 | Low      | ADMIN_DOMAINS duplicates governance doc                |
| A8  | 30-05 | Low      | Misleading truth statement about DashboardTabs removal |
| A9  | 30-05 | Low      | Mobile overflow (>5 spaces) not scoped                 |
| A10 | Cross | Low      | Phase 11 widget IDs referenced before they may exist   |

---

## Detailed Recommendations

---

### A1 — Mass breaking change to widget manifests (30-03, High)

**Issue:** Making `spaces: SpaceId[]` required on `WidgetManifest` is a breaking change across all ~30 `registry.register()` calls in `widgets.ts`. This is the correct final state, but the surface area for silent mistakes is large. A missed widget won't fail silently — TypeScript will catch it — but a wrongly-assigned widget (e.g. `spaces: ['home']` instead of `spaces: ['services']`) will not be caught by the type checker and will only surface as a UI bug.

**Recommendation:** Add a smoke-test assertion to the verify step for 30-03 Task 1. After the TypeScript check, run a node snippet that imports the registry and asserts each of the 5 spaces has at least one widget assigned. Something like:

```bash
node -e "
const widgets = require('./src/widgets/dashboard/model/widgets-test-helper');
const spaces = ['home','services','community','messages','admin'];
spaces.forEach(s => {
  const count = widgets.filter(w => w.spaces.includes(s)).length;
  if (count === 0) throw new Error('Space ' + s + ' has no widgets');
  console.log(s + ': ' + count + ' widgets');
});
"
```

Add the space assignments table from the plan as an inline comment block at the top of `widgets.ts` so the intent is explicit and reviewable alongside the code.

---

### A2 — MyHomeSpace data source is ambiguous (30-04, High)

**Issue:** The plan says to fetch from `/api/directory` or user profile for property/household data. `/api/directory` returns all residents (a listing endpoint) — it is not appropriate for fetching a single user's household. This will cause either an over-fetch or a 404 depending on the actual implementation.

**Recommendation:** Clarify the correct endpoints before the agent starts Task 1 of 30-04. Based on the schema and existing API structure, the correct sources are:

| Data                 | Endpoint                                                  |
| -------------------- | --------------------------------------------------------- |
| Current user profile | `/api/users/[id]` (already exists)                        |
| Household info       | `/api/households/[id]` (already exists)                   |
| Property details     | via household → `propertyId` → `/api/households` relation |

Update the task action to read:

> Fetch user data from `/api/users/[id]` using the session userId. The response includes household and property relations. Do not use `/api/directory` — that endpoint returns all residents and is not scoped to the current user.

---

### A3 — Safe-area inset not applied to content padding (30-05, Medium)

**Issue:** The layout sets `pb-20 md:pb-0` on the main content area to avoid overlap with the mobile bottom bar. This hardcodes 80px (5rem) of bottom padding. On iPhone notch/Dynamic Island devices, `env(safe-area-inset-bottom)` adds 20–34px on top of the bar height, meaning content will still be clipped.

**Recommendation:** Replace the hardcoded padding with a CSS custom property that accounts for the safe area:

```tsx
// In layout.tsx
<main
  className="flex-1 md:pb-0"
  style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
>
  {children}
</main>
```

And in `MobileSpaceBar.tsx`, ensure the bar itself has:

```tsx
<nav className="fixed bottom-0 left-0 right-0 h-16 pb-[env(safe-area-inset-bottom,0px)] md:hidden ...">
```

The `manifest` meta tag `viewport-fit=cover` must also be set in the root layout for `env(safe-area-inset-bottom)` to return a non-zero value on iOS. Check `src/app/layout.tsx` and add if missing:

```tsx
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

### A4 — Promise.all pattern may not be followed (30-02, Medium)

**Issue:** The HomeLayer plan says "combine fetches where possible to avoid waterfall" but also says "same pattern as existing widgets like EventsWidget." Existing widgets use separate `useEffect` calls, which will cause three sequential renders and a visible cascade of loading skeletons.

**Recommendation:** Make the fetch strategy explicit and non-ambiguous. Update the task action to specify:

> Use a single `useEffect` with `Promise.all` for all three fetches (announcements, maintenance, events). Do NOT use the per-widget pattern of separate useEffect calls. Structure:
>
> ```ts
> useEffect(() => {
>   Promise.all([
>     fetch('/api/announcements?priority=urgent').then(r => r.json()),
>     fetch('/api/maintenance?overdue=true').then(r => r.json()),
>     fetch('/api/events?upcoming=true&limit=5').then(r => r.json()),
>   ])
>     .then(([announcements, maintenance, events]) => {
>       setUrgent(announcements);
>       setOverdue(maintenance);
>       setEvents(events);
>       setLoading(false);
>     })
>     .catch(() => setError(true));
> }, []);
> ```

---

### A5 — Key mapping inconsistency risk across two files (30-02, Medium)

**Issue:** Plan 30-02 Task 2 updates both `default-layouts.ts` and `widget-store.ts` with tab-to-space key remapping. If the mapping differs between the two files (e.g. one maps `bookings → services`, the other maps `bookings → home`), hydrated layouts will silently assign widgets to wrong spaces. There is no automated check for this.

**Recommendation:** Extract the mapping into a single shared constant rather than duplicating it in two files:

```ts
// src/entities/widget/model/tab-migration-map.ts
export const TAB_TO_SPACE_MAP: Record<string, string> = {
  overview: 'home',
  maintenance: 'services',
  bookings: 'services',
  services: 'services',
  content: 'community',
  premium: 'community',
} as const;
```

Import this constant in both `default-layouts.ts` and `widget-store.ts`. The mapping is then defined exactly once and both files are guaranteed to be consistent. Add this as an explicit deliverable in the 30-02 Task 2 action.

---

### A6 — Registry populated at runtime, not module init (30-03, Medium)

**Issue:** `getSpaceWidgets(spaceId)` filters `registry.list()`, but the registry is populated by `registerAllWidgets()` which is called at component mount time. If `getSpaceWidgets` is invoked at module level (e.g. in a `const` outside a function or hook), it will return an empty array because the registry hasn't been populated yet.

**Recommendation:** Add an explicit constraint to the 30-03 Task 1 action:

> `getSpaceWidgets` and `getSpaceWidgetIds` must only be called inside React components or hooks (not at module initialization). Add a JSDoc comment to the exported functions:
>
> ```ts
> /**
>  * Call only inside React components or hooks — registry is populated at runtime.
>  * Module-level calls will return an empty array.
>  */
> export function getSpaceWidgets(spaceId: SpaceId): WidgetManifest[] {
> ```

Also add a runtime guard:

```ts
if (registry.list().length === 0) {
  console.warn('getSpaceWidgets called before registerAllWidgets()');
}
```

---

### A7 — ADMIN_DOMAINS duplicates governance documentation (30-04, Low)

**Issue:** The `ADMIN_DOMAINS` constant in `spaces.ts` will list the same domains as the Admin Dashboard tab inventory in `NAVIGATION_GOVERNANCE.md`. Two sources of truth for the same list will drift over time.

**Recommendation:** Add a comment in `spaces.ts` citing the governance doc:

```ts
/**
 * Admin management domains. These mirror the Admin Dashboard tab inventory
 * defined in docs/architecture/NAVIGATION_GOVERNANCE.md.
 * When adding a new admin domain, update both this constant AND the governance doc.
 */
export const ADMIN_DOMAINS = [
  'users',
  'maintenance',
  'content',
  'events',
  'competitions',
  'resources',
  'surveys',
  'announcements',
  'system',
] as const;
```

---

### A8 — Misleading truth statement about DashboardTabs removal (30-05, Low)

**Issue:** The `must_haves.truths` in 30-05 states "DashboardTabs is removed when focus spaces flag is permanently enabled." Task 1 does not implement this removal — it only implements the flag toggle. The truth statement creates an expectation that isn't met by the plan's tasks, which could cause confusion in SUMMARY.md or progress tracking.

**Recommendation:** Revise the truth statement to accurately reflect what Task 1 delivers:

> "DashboardTabs is deprecated and scheduled for removal once the focus spaces flag is permanently enabled. The flag toggle in layout.tsx is the mechanism that will enable this removal."

Or add an explicit cleanup task (even if it's just a comment + BD issue creation) so the removal is tracked.

---

### A9 — Mobile overflow (>5 spaces) not scoped (30-05, Low)

**Issue:** The plan mentions a "More" sheet for overflow when more than 5 spaces are visible, but with the current 5-space model this path is never triggered. The overflow implementation is unscoped — if it's not built, silently dropping a 6th space will be the failure mode.

**Recommendation:** Either:

1. **Implement a simple guard** — if `getVisibleSpaces()` returns more than 5 items, log a warning and slice to 5. Add a TODO comment for the overflow sheet. This prevents silent data loss.

2. **Or remove the mention entirely** — if the 5-space model is stable and a 6th space requires governance review anyway, the overflow path is speculative. Remove the "More" sheet mention from the plan to avoid scope creep.

Option 1 is preferred.

---

### A10 — Phase 11 widget IDs referenced before they may exist (Cross-cutting, Low)

**Issue:** Plans 30-03 and 30-04 reference `admin-announcements` in space `widgetIds` arrays. This widget is created in Phase 11 (11-02 specifically). If Phase 30 executes before Phase 11 is complete, the `admin-announcements` ID will be in the registry's `widgetIds` arrays but not in the actual widget registry. The widget won't render — no error, just a silent empty slot.

**Recommendation:** Add Phase 11 completion as a soft dependency in the 30-03 and 30-04 front matter:

```yaml
depends_on: ['30-01', '11-01', '11-02'] # 11-xx for admin-announcements widget
```

If Phase 11 is already complete, no change needed. If not, the space widgetIds for `admin-announcements` should be commented out with a TODO until Phase 11 lands:

```ts
// TODO: uncomment after Phase 11 (admin-announcements widget) lands
// 'admin-announcements',
```

---

## Unrelated Observation — Navigation Governance Compliance

The SpaceLauncher (in-dashboard sidebar) and MobileSpaceBar (bottom nav) are correctly scoped as workspace navigation. The nav-registry entries added in 30-04 Task 2 for `/dashboard/services`, `/dashboard/community`, etc. are internal workspace links — they should NOT appear in the public burger menu's Community or Explore sections. Verify that `getBurgerSections()` in `navigation-config.ts` does not inadvertently surface these entries. The nav-registry pattern used by the existing community items (events, surveys, etc.) may auto-include new entries depending on how the registry is queried.

---

## Checklist Before Execution

- [ ] ⏳ Confirm Phase 11 (admin-announcements widget) is complete or handle A10
- [ ] ⏳ Clarify MyHomeSpace data sources (A2) before 30-04 starts
- [ ] ⏳ Add `viewport-fit=cover` to root layout.tsx (A3 prerequisite)
- [ ] ⏳ Extract `TAB_TO_SPACE_MAP` constant before 30-02 Task 2 (A5)
- [ ] ⏳ Verify `getBurgerSections()` won't surface space nav-registry entries in public nav
