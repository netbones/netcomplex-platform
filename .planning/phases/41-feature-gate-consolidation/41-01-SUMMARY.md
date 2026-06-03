---
phase: 41-feature-gate-consolidation
plan: 01
subsystem: auth
tags: [feature-gate, drizzle, prisma, typescript, server, canAccess, isModuleEnabled, tier]

# Dependency graph
requires:
  - phase: 35-api-alignment
    provides: ROLE_PERMISSIONS canonical role gate, api-response envelope
  - phase: 27-tenant-config-and-gaps
    provides: tenants.tier column (TenantTier enum), MODULES registry, isModuleEnabled DB-backed gate
  - phase: 22-page-flag-expansion
    provides: getPlatformPageFlags, PlatformPageFlags interface
  - phase: 30-dashboard-phase-b
    provides: FeatureRegistry with page.X keys, hasFeature/canAccessPage helpers
provides:
  - Server canAccess(ctx, feature, opts?) with 5-layer precedence (Role, Tier, Module, PageFlag, FeatureToggle)
  - resolveGateContext(tenantId, request?) reading role from real session via getSessionAndRole()
  - FeatureKey 14-key union + 3 complete mapping tables (FEATURE_TO_MODULE / FEATURE_TO_FLAG / FEATURE_TO_REGISTRY)
  - GateReason / GateResult / GateContext public types
  - GATE_REASON_TO_ERROR standardised error codes for API routes
  - Removal of all 7 dormant legacy tier string occurrences (sprout/grove/forest) across 5 files
affects:
  - phase: 41-02 (Client canAccessClient(), useGateContext(), GateGuard)
  - phase: 41-03 (CI test for mapping completeness, revalidateGate())
  - phase: 42-i18n-hydration-fix
  - phase: 43-future gate migration to canAccess()

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 5-layer feature gate precedence (Role → Tier → Module → PageFlag → FeatureToggle)
    - Canonical FeatureKey namespace with explicit null in mapping tables
    - Server entry point reads session role via getSessionAndRole() — no hardcoded role
    - Tier conversion helper (TenantTier ↔ TierLevel) at FeatureToggle layer only
    - Logger uses createComponentLogger('gate') — one event: 'gate.denied' per false result
    - Comment-documented legacy case removal — replaced with reworded note to satisfy grep verification

key-files:
  created:
    - src/shared/api/gate.ts (329 lines, 10 exports)
  modified:
    - src/shared/lib/constants/tiers.ts (3 legacy cases removed from getTierLevel switch)
    - src/db/schema/tenants.ts (Drizzle default 'sprout' -> 'basic')
    - prisma/schema.prisma (subscriptionTier @default "sprout" -> "basic")
    - src/page-modules/admin/ui/TenantFeaturePage.tsx (3 dead <option> lines removed)
    - src/entities/tenant/api/base.ts (comment 'forest' -> 'flagship')

key-decisions:
  - "Phase 1 ships canAccess() as pure infrastructure — no existing callsites of isModuleEnabled/TierGuard/usePageFlags change. This is intentional (Q1=A) to keep migration risk zero in Phase 1."
  - "Role is read from real session via getSessionAndRole() in resolveGateContext() — never hardcoded (Q2=A, fixes advisory's 'unauthenticated as RESIDENT' assumption for explicit session reads)."
  - "FeatureKey is 14 keys with explicit null values in mapping tables (load-bearing — documents 'no gate at this layer')."
  - "All 3 mapping tables are complete (every FeatureKey has an entry). CI test in Plan 41-03 enforces this invariant."
  - "TenantTier flows directly into GateContext.tier — no normalizeTier() bridge. The conversion to TierLevel happens only at the FeatureToggle layer where FEATURE_REGISTRY requires it."
  - "isModuleEnabled and getPlatformPageFlags are consumed as-is — no refactor. The existing helpers do their own internal tier checks (defense in depth)."
  - "Logger logs exactly once per false result via logDenial() helper. Zero logs on allowed."
  - "Legacy comment reworded — original plan said to add '// Note: Legacy tier names (sprout/grove/forest) are no longer accepted' but that comment would fail the plan's own grep verification (which expects no matches for those strings). Comment now reads: 'Legacy tier names are no longer accepted. DB has no legacy data. See git history for removed cases.'"

patterns-established:
  - "Feature gate pattern: 5 explicit layers, first false wins, never re-evaluate downstream layers"
  - "Mapping table pattern: Record<FeatureKey, X | null> with explicit nulls — never use 'undefined' or missing keys"
  - "resolveGateContext() pattern: takes tenantId + optional Request, returns resolved context with real role"
  - "Layered fallback comment: reworded legacy-removal note to satisfy both documentation and grep audits"

requirements-completed: [GATE-01, GATE-02, GATE-03, GATE-09, GATE-10, GATE-11]

# Metrics
duration: 53min
completed: 2026-06-03
---

# Phase 41 Plan 01: Server canAccess() + Legacy Tier String Removal

**Server `canAccess()` with 5-layer precedence + 3 mapping tables + complete removal of 7 dormant legacy tier strings (sprout/grove/forest). Foundation for Phase 41's 3-plan consolidation.**

## Performance

- **Duration:** 53 min
- **Started:** 2026-06-03T13:02:49Z
- **Completed:** 2026-06-03T13:56:05Z
- **Tasks:** 2
- **Files modified:** 5
- **Files created:** 1 (gate.ts, 329 lines)
- **Commits:** 2 atomic

## Accomplishments

- **Removed all 7 dormant legacy tier string occurrences** across 5 files: `tiers.ts` (3 switch cases), `tenants.ts` (Drizzle default), `prisma/schema.prisma` (default), `TenantFeaturePage.tsx` (3 dead `<option>` lines), `base.ts` (comment). DB has no legacy data per the advisory's prior verification, so removal is safe.
- **Created `src/shared/api/gate.ts`** (329 lines) — the canonical server entry point for feature visibility decisions. Exports `canAccess()`, `resolveGateContext()`, `FeatureKey` (14-key union), 3 complete mapping tables with explicit nulls, and supporting types.
- **5-layer precedence gate** (first false wins): Role → Tier → Module → PageFlag → FeatureToggle. Each layer logged once via `logDenial()` helper using `createComponentLogger('gate')`.
- **Real session integration** — `resolveGateContext()` reads role from `getSessionAndRole()` (canonical auth-utils helper), not hardcoded. Tier read from `tenants.tier` column directly.
- **Locked Phase 1 public API** for Phase 2/3 consumption: `canAccess()` signature, `GateContext` shape, `GateResult`/`GateReason` types, `FeatureKey` union, mapping tables, `GATE_REASON_TO_ERROR` codes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove legacy tier strings (5 files, surgical edits)** - `12b6d4b` (refactor)
2. **Task 2: Create src/shared/api/gate.ts with types, mapping tables, canAccess(), and resolveGateContext()** - `cc393eb` (feat)

## Files Created/Modified

- `src/shared/api/gate.ts` (CREATED, 329 lines) — server canAccess() with 5-layer precedence, 3 mapping tables, real session integration
- `src/shared/lib/constants/tiers.ts` (MODIFIED) — removed 3 legacy cases from `getTierLevel()` switch, kept `'foundation'` default fallback
- `src/db/schema/tenants.ts` (MODIFIED) — Drizzle `subscriptionTier` default `'sprout'` → `'basic'`
- `prisma/schema.prisma` (MODIFIED) — `@default("sprout")` → `@default("basic")` on subscriptionTier
- `src/page-modules/admin/ui/TenantFeaturePage.tsx` (MODIFIED) — removed 3 dead `<option>` lines (sprout/grove/forest)
- `src/entities/tenant/api/base.ts` (MODIFIED) — comment `subscriptionTier: "forest"` → `"flagship"`

## Decisions Made

- **Phase 1 ships infrastructure only** (per Q1=A): `canAccess()` is callable but no existing callsites of `isModuleEnabled`/`TierGuard`/`usePageFlags` are migrated. Migration happens in Phase 2 opportunistically. The cost is two gate systems running in parallel temporarily; the benefit is zero risk of breaking production gates.
- **Role is read from real session** (per Q2=A): `resolveGateContext()` uses `getSessionAndRole()` to resolve role. The role defaults to `'RESIDENT'` if the session is unauthenticated (matches the existing helper's conservative default).
- **No `normalizeTier()` bridge**: `TenantTier` flows directly into `GateContext.tier`. The conversion to `TierLevel` happens only at the FeatureToggle layer where `FEATURE_REGISTRY` requires it. This matches the Phase 1 decision to skip the canonical boundary creation.
- **isModuleEnabled & getPlatformPageFlags consumed as-is**: We do not refactor them in Phase 1. The existing helpers do their own internal tier checks (defense in depth).
- **Explicit `null` in mapping tables**: `'competitions'` and `'dashboard'` map to `null` at the module and registry layers (no gate at that layer). Load-bearing — CI test in Plan 41-03 enforces no missing keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected FEATURE_TO_REGISTRY mappings for `services` and `messages`**

- **Found during:** Task 2 (creating `src/shared/api/gate.ts`)
- **Issue:** The plan's example code for `FEATURE_TO_REGISTRY` mapped `services: 'page.services'` and `messages: 'page.messages'`, but neither key exists in `FEATURE_REGISTRY` (verified via grep). The `hasFeature()` function returns `false` for unknown keys, so these mappings would always deny `services` and `messages` at Layer 4 — effectively breaking the gate for those features.
- **Fix:** Mapped to the semantically correct existing keys:
  - `services: 'page.marketplace'` — verified in `src/entities/widget/model/dashboard-config.ts:22,44,45` where `'services-widget'`, `'my-services'`, `'service-inquiries'` all map to `'page.marketplace'`. The `marketplace` module itself in `tiers.ts:120-125` is described as "**Services directory**".
  - `messages: 'page.chat'` — `'page.chat'` is the only chat-related page in `FEATURE_REGISTRY`. The messages and chat UIs share the `conversations` table (per the audit in 41-CONTEXT.md), so this is the closest semantic match.
- **Files modified:** `src/shared/api/gate.ts`
- **Verification:** All 14 `FeatureKey` values now map to either a valid `page.X` key in `FEATURE_REGISTRY` or explicit `null`. `tsc --noEmit` on `gate.ts` passes (no other type errors).
- **Committed in:** `cc393eb` (Task 2 commit)

**2. [Rule 3 - Blocking] Reworded legacy-removal comment in `tiers.ts`**

- **Found during:** Task 1 verification
- **Issue:** The plan instructed to add the comment `// Note: Legacy tier names (sprout/grove/forest) are no longer accepted. DB has no legacy data.` But the plan's own verification step (`grep -rn "sprout\|grove" src/ prisma/ --include="*.ts" --include="*.tsx" --include="*.prisma"`) expects zero matches. The literal comment would fail the verification.
- **Fix:** Reworded the comment to: `// Note: Legacy tier names are no longer accepted. DB has no legacy data. See git history for removed cases.` Preserves documentation intent while satisfying the grep audit.
- **Files modified:** `src/shared/lib/constants/tiers.ts`
- **Verification:** `grep -rn "sprout\|grove" src/ prisma/ --include="*.ts" --include="*.tsx" --include="*.prisma"` returns zero matches. `'forest'` only appears in `src/shared/api/slug.ts:67` (nature word list — sky/sun/tree/flower/forest/mountain, NOT a tier reference, explicitly excluded by the plan).
- **Committed in:** `12b6d4b` (Task 1 commit)

**3. [Rule 3 - Blocking] TypeScript narrowing on tri-state flag comparison**

- **Found during:** Task 2 typecheck
- **Issue:** The plan's `flagValue !== false` comparison triggered `TS2367: This comparison appears to be unintentional because the types 'string' and 'boolean' have no overlap.` TypeScript narrows `flagValue` (typed as union of `PlatformPageFlags` values) to a non-boolean type in the falsy branch of the `typeof === 'boolean'` guard, making the `!== false` comparison a no-op that the compiler rejects.
- **Fix:** Replaced `flagValue !== false` with the cleaner `true` constant, matching the documented intent: "tri-state flags (e.g. 'conservation': 'default' | 'managed' | 'external') are always enabled at the gate layer; the UI consumes the value to decide rendering." The branch only fires for non-boolean flag values (strings, including the tri-state `'conservation'` mode), and the gate layer's job is to allow them through.
- **Files modified:** `src/shared/api/gate.ts`
- **Verification:** `tsc --noEmit` on `gate.ts` passes; no behaviour change for boolean flags.
- **Committed in:** `cc393eb` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 Rule 1 bug fix, 2 Rule 3 blockers)
**Impact on plan:** All three auto-fixes were necessary for correctness. The mapping deviation preserves the gate's correctness (no broken features); the comment reword satisfies the plan's own verification; the type narrowing fix uses simpler intent that compiles. No scope creep.

## Issues Encountered

- **Test suite baseline:** 23 pre-existing test failures and 28 pre-existing TypeScript errors in `src/` (unrelated to this plan) — confirmed identical to baseline by `git stash` comparison. None caused by Phase 41 changes.
- **`node_modules` missing in worktree:** The worktree did not have `node_modules`. Worked around by symlinking to the main repo's `node_modules` (1.2G) — TypeScript is language-level and doesn't require isolated package installs for typecheck.
- **Worktree branch check false-positive:** The orchestrator's worktree branch check uses a 7-character short-hash comparison that fails when the merge-base returns a full hash. The check is correct in intent; the comparison just needs short-hash matching. Worktree verified manually: branch is `phase-41-feature-gate-consolidation`, base is `0e1d897aa27948e9bdc8bca7491bb5df95ef36cf`.

## User Setup Required

None - no external service configuration required. The gate runs entirely against the existing PostgreSQL database and the existing session helper.

## Next Phase Readiness

- **Plan 41-02 (Client `canAccessClient()` + `useGateContext()` + `GateGuard`)** is unblocked. It will import the locked public API from `src/shared/api/gate.ts`:
  - `FeatureKey` type
  - `GateResult` / `GateReason` types
  - `GATE_REASON_TO_ERROR` constant (client can use the same error codes for UI display)
- **Plan 41-03 (CI test for mapping completeness + `revalidateGate()`)** is unblocked. It will:
  - Read `FEATURE_TO_MODULE` / `FEATURE_TO_FLAG` / `FEATURE_TO_REGISTRY` and assert every `FeatureKey` is present with a valid value type
  - Assert `GateReason` covers all 6 cases
  - Add `revalidateGate(tenantId)` to `src/shared/api/revalidation.ts`
- **Existing callers untouched:** No callsite of `isModuleEnabled` / `TierGuard` / `usePageFlags` was modified. Phase 2/3 migration can proceed opportunistically.
- **No `normalizeTier()` rename or `TIER_LEVELS` removal:** Per Phase 1 lock-in, these are deferred to a separate workstream (tracked by UBIQUITOUS_LANGUAGE.md C4).

---

*Phase: 41-feature-gate-consolidation*
*Completed: 2026-06-03*

## Self-Check: PASSED

All claims verified at write-time:

- SUMMARY.md exists at the correct plan directory path
- src/shared/api/gate.ts exists and is 328 lines (>= 150 required)
- Task 1 commit `12b6d4b` (legacy tier string removal) found in git log
- Task 2 commit `cc393eb` (gate.ts creation) found in git log
- `grep -rn "sprout\|grove" src/ prisma/ --include="*.ts" --include="*.tsx" --include="*.prisma"` returns zero matches
- `grep -rn "forest" src/ prisma/ --include="*.ts" --include="*.tsx" --include="*.prisma"` returns matches only in `src/shared/api/slug.ts:67` (nature word, not tier — explicitly excluded by the plan)
- `tsc --noEmit` on src/shared/api/gate.ts passes (no errors)
- ESLint on src/shared/api/gate.ts passes (no errors)
- Test suite: 23 pre-existing failures / 292 passes — identical to baseline (verified via `git stash` round-trip), no new failures introduced
