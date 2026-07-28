# ADVISORY-008: Server-Only Module Isolation in FSD Barrels

**Date:** 2026-06-14
**Status:** Approved — Pending Execution
**Triggered by:** Phase 44 FSD enforcement (Steiger + ESLint `no-public-api-sidestep`) — build failure across ~105 files
**Related:** DISCUSSION-server-only-barrel.md, ADR-019 (RLS connection model), BD issue `de8x` (i18n sidestep precedent)
**Next phase:** Phase 44 continuation or standalone Phase 45 (TBD by DavDev)

---

## Problem Statement

Phase 44 introduced strict FSD boundary enforcement via Steiger and ESLint `no-restricted-imports`. This enforcement exposed a latent architectural fault: **entity slice barrels (`index.ts`) were re-exporting server-only modules alongside client-safe modules**, causing client-bundle evaluation of `server-only`, `next/headers`, and `next/cache` imports. The result was a hard build crash across ~105 files.

The immediate fix removed server-only exports from the affected barrels and patched ESLint with regex exceptions allowing deep imports (`@entities/tenant/api/with-tenant`). This resolves the build but **violates the FSD public API contract** — deep imports are the exact pattern `no-public-api-sidestep` exists to prevent.

The current state is a band-aid. It must not persist.

**Affected slices (confirmed at time of Phase 44):**

| Slice                   | Server-only exports removed from barrel                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@entities/tenant`      | `withTenant`, `withTenantOptional`, `getCurrentTenant`, `getTenantById`, `requirePlatformAdmin`, `guards`, `gate/gate`, `api/base` |
| `@entities/content`     | Service functions, route helpers                                                                                                   |
| `@entities/maintenance` | Service functions, route helpers                                                                                                   |
| `@entities/event`       | Service functions, route helpers                                                                                                   |
| `@entities/booking`     | Service functions, route helpers                                                                                                   |

---

## Root Cause

The `server-only` package is a **build-time execution-context marker**, not an FSD layer boundary. Its presence in a module means that module must never be evaluated in a client bundle. When a barrel re-exports both a server-only module and a client-safe constant, any client component importing the client-safe constant causes the bundler to evaluate the entire barrel's module graph — including the server-only module — and crash.

This is not a discipline failure. It is a structural problem: **a single barrel cannot serve both execution contexts**.

---

## Decision: Option B — `server.ts` Sub-Barrels per Entity Slice

Three options were evaluated. Option B is adopted.

### Options Considered

**Option A — ESLint exceptions (status quo, formalized)**
Keep the current deep-import exceptions in ESLint/Steiger config. Document which paths are excepted. Rejected: the allow list grows with every new server-only module; the public API is now implicitly split between the barrel and undocumented deep paths; new contributors cannot discover the correct import path. This decays over time.

**Option B — `server.ts` sub-barrel per entity slice** ✅ Adopted
Each affected entity slice gains a `server.ts` barrel alongside its existing `index.ts`. Server-only re-exports move into `server.ts`. Consumers of server-only entity code import from `@entities/<slice>/server`. Client components continue to import from `@entities/<slice>` (the default barrel). The Steiger allow list adds `@entities/*/server` as a recognized sub-barrel path.

**Option C — Move server-only code to `src/server/entities/`**
Relocate entity server functions into the existing `src/server/` layer. Rejected: `src/server/` is established for infrastructure concerns (tRPC routers, OpenAPI generator). Entity domain functions (`withTenant`, `getCurrentTenant`, service layer) are domain concerns, not infrastructure. Moving them to `src/server/` conflates execution context with architectural layer and would blur the `src/server/` boundary for no architectural gain.

### Why Option B Is Correct

1. **Precedent already exists in the codebase.** `@api/server`, `@api/client`, and `@api/shared` are three recognized sub-barrel paths for `src/shared/api/` — already in the Steiger allow list at line 74 of `steiger.config.js`. Option B applies the identical pattern one layer up, to entity slices.

2. **The FSD principle is preserved.** The FSD rule is: consumers of a slice always import from a public API barrel, never from internal slice files. A `server.ts` barrel _is_ a public API barrel. It satisfies the rule. A deep import to `@entities/tenant/api/with-tenant` does not.

3. **Execution context is not the same as FSD layer.** `server-only` is a build-time context marker. Two barrels for two execution contexts within the same FSD layer is correct modelling — the same way a library might publish `dist/index.js` and `dist/index.server.js` without violating its own API contract.

4. **The refactor is mechanical.** ~105 files require a pattern-based find-replace per slice. No logic changes. Low risk.

---

## Architecture After This Change

### Barrel Structure (per affected slice)

```
src/entities/tenant/
├── index.ts        # Client-safe public API (types, constants, UI exports, schema validators)
├── server.ts       # NEW: Server-only public API (withTenant, guards, gate, base, etc.)
├── api/
│   ├── base.ts
│   ├── with-tenant.ts
│   ├── guards.ts
│   ├── gate/
│   │   └── gate.ts
│   └── ...
├── model/
└── ui/
```

### Import Patterns After Change

```ts
// ✅ Server component / API route — import from server barrel
import { withTenant, getCurrentTenant } from '@entities/tenant/server';
import { listMaintenanceRequests } from '@entities/maintenance/server';

// ✅ Client component — import from default barrel (unchanged)
import { ADMIN_ITEMS, TenantProvider } from '@entities/tenant';
import { MaintenanceCard } from '@entities/maintenance';

// ❌ Deep import — no longer needed, no longer allowed
import { withTenant } from '@entities/tenant/api/with-tenant'; // BANNED
```

### Steiger / ESLint Config Changes

**Add to Steiger allow list** (same block as `@api/server`):

```js
// steiger.config.js
'@entities/*/server'; // server-only sub-barrel — permitted deep path
'@features/*/server'; // if/when features adopt same pattern
```

**Remove from ESLint `no-restricted-imports` exceptions** (band-aid cleanup):

```
@entities/tenant/api/*
@entities/content/services/**
@entities/maintenance/services/**
@entities/event/services/**
@entities/booking/services/**
```

These exceptions were added as the Phase 44 emergency fix. They must be removed once `server.ts` barrels are in place.

---

## Scope Ruling: Features and Widgets

**`@features/*` — apply the same rule if and when a feature slice contains server-only exports.**
Features are consumers and orchestrators. Some features (e.g., `features/auth`, `features/onboarding`) may contain server-side logic. If a feature barrel currently mixes server-only and client-safe exports, it must adopt the same `server.ts` sub-barrel pattern. Audit required before Phase execution — do not assume all features are clean.

**`@widgets/*` — do NOT apply this pattern.**
Widget slices are UI-layer consumers. They render data; they do not provide server-only logic. If a widget barrel is importing server-only modules, that is a deeper FSD violation (wrong layer, not wrong barrel structure) and must be corrected differently — the widget should receive server data via props from a Server Component parent, not by importing server-only modules directly. Do not create `@widgets/*/server` barrels.

---

## Architectural Principle (Formalise in ADR-024)

The following rule should be captured as ADR-024 and enforced as a CI lint gate:

> **Any module that directly imports from `@api/db`, `next/headers`, `next/cache`, or `server-only` must not be re-exported from a slice's default barrel (`index.ts`). It must be re-exported exclusively from a `server.ts` sub-barrel.**

This rule closes the _category_ of failure, not just the current instances. It is statically enforceable.

### Proposed Lint Enforcement

Add a custom ESLint rule or Steiger plugin that:

- Scans all `index.ts` barrel files in `src/entities/`, `src/features/`, `src/widgets/`
- Detects any direct or transitive import of `server-only`, `next/headers`, `next/cache`, or `src/shared/api/db`
- Reports an error: `"Server-only module re-exported from default barrel. Move to server.ts."`

This converts a discipline convention into a CI gate that will catch future violations at the point of introduction rather than at Phase enforcement time.

---

## Pre-Execution Checklist

Before the agent begins implementation, the following must be verified. These are mandatory discovery tasks — do not skip.

- [ ] ⏳ **Audit the 105 files.** Grep all files currently importing via the patched deep-path exceptions. Separate them into two lists: (a) importing server-only symbols, and (b) importing client-safe symbols via deep path for other reasons. List (b) may represent pre-existing FSD violations of a different kind that should not be silently absorbed into the `server.ts` fix.

  ```bash
  grep -r "from '@entities/tenant/api/" src/ --include="*.ts" --include="*.tsx" -l
  grep -r "from '@entities/maintenance/services" src/ --include="*.ts" --include="*.tsx" -l
  # Repeat per slice
  ```

- [ ] ⏳ **Confirm which `@features/*` barrels are affected.** Run the same grep for features.

  ```bash
  grep -rn "server-only\|next/headers\|next/cache" src/features/ --include="*.ts" -l
  ```

- [ ] **Read each affected slice's current `index.ts`** before writing `server.ts`. Do not infer barrel contents from the tree — barrel exports may differ from what the files actually re-export.

- [ ] ⏳ **Confirm Steiger allow list syntax** by reading `steiger.config.js` line 74 and surrounding context before editing. Match the exact format of the `@api/server` entry.

- [ ] ⏳ **Confirm ESLint exception syntax** by reading `eslint.config.js` before editing. The band-aid exceptions must be removed cleanly, not commented out.

- [ ] **Verify no widget barrels are affected.** If any widget barrel imports server-only code, flag it to DavDev before proceeding — that requires a different fix.

---

## Execution Plan

### Phase 1 — Create `server.ts` barrels (per slice, in order)

For each affected slice:

1. Read the current `index.ts` barrel
2. Read all server-only modules referenced via deep imports
3. Create `server.ts` — re-export all server-only symbols from their source files
4. Verify `server.ts` does not re-export anything that is also in `index.ts` (no overlap)
5. Do NOT modify `index.ts` — it was already cleaned during Phase 44

**Verify step (per slice):**

```bash
# Confirm server.ts barrel exports are resolvable
npx tsc --noEmit --skipLibCheck 2>&1 | grep "entities/<slice>"
```

### Phase 2 — Update Steiger and ESLint configs

1. Add `@entities/*/server` to Steiger allow list (same block as `@api/server`)
2. If features are affected: add `@features/*/server`
3. Remove the band-aid `no-restricted-imports` exceptions from `eslint.config.js`
4. Run Steiger: `npx steiger src/` — expect zero new violations

### Phase 3 — Migrate consumer imports (mechanical)

For each file in the audited list (server-only category only):

Replace deep imports with `server.ts` barrel imports:

```bash
# Example for tenant slice — confirm pattern before running
sed -i "s|from '@entities/tenant/api/with-tenant'|from '@entities/tenant/server'|g" <file>
sed -i "s|from '@entities/tenant/api/base'|from '@entities/tenant/server'|g" <file>
# Repeat per module, per slice
```

**Do not use a single global sed.** Run per-slice and verify each slice compiles before moving to the next.

**Verify step (after all files migrated):**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

All three must pass clean before marking complete.

### Phase 4 — Write ADR-024

Document the architectural principle in `docs/STEERING/ADR.md`:

- **Title:** Server-only modules use `server.ts` sub-barrels within FSD slices
- **Context:** Phase 44 enforcement surfaced barrel contamination across 5 entity slices
- **Decision:** `server.ts` sub-barrel pattern, `@entities/*/server` allow list
- **Consequences:** CI lint gate (future work), two recognized import paths per affected slice

---

## Risk Register

| Risk                                                                                              | Likelihood | Impact | Mitigation                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Some of the 105 files import client-safe symbols via deep path (not server-only)                  | Medium     | Low    | Pre-execution audit (checklist item 1) separates the two categories before any changes                                 |
| New `server.ts` barrel accidentally re-exports client-safe symbols, breaking tree-shaking         | Low        | Medium | Verify step after each slice: no overlap between `index.ts` and `server.ts` exports                                    |
| Feature slices have unreported server-only barrel contamination                                   | Medium     | Medium | Pre-execution grep of `src/features/` for server-only markers                                                          |
| Steiger allow list pattern `@entities/*/server` is overly broad and permits unintended deep paths | Low        | Low    | Wildcard pattern only permits `server.ts` sub-barrel, not arbitrary sub-paths; consistent with `@api/server` precedent |
| `pnpm build` passes but runtime behaviour changes                                                 | Very Low   | High   | No logic is changed — only re-export structure. Build + typecheck passing is sufficient signal                         |

---

## Done Criteria

- [ ] ⏳ `server.ts` barrels exist for all five affected entity slices
- [ ] ⏳ `@entities/*/server` is in the Steiger allow list
- [ ] ⏳ Band-aid ESLint `no-restricted-imports` exceptions are removed
- [ ] ⏳ All ~105 files import server-only symbols from `@entities/<slice>/server` (not deep paths)
- [ ] ⏳ `pnpm typecheck` passes clean
- [ ] ⏳ `pnpm lint` passes clean (zero Steiger violations, zero ESLint violations)
- [ ] ⏳ `pnpm build` passes clean
- [ ] ⏳ ADR-024 is written and committed
- [ ] ⏳ `ADVISORY-008.md` is copied to `docs/advisories/ADVISORY-008.md`

---

## Out of Scope

- Widget slices: no `server.ts` barrels
- `src/server/` layer: no entity functions moved here
- Custom lint rule for CI enforcement: flagged as follow-on work, not required for this phase
- `@features/*` barrels: audit only — implementation only if contamination is confirmed

---

_Advisory produced by Claude (Anthropic) on 2026-06-14 in response to DISCUSSION-server-only-barrel.md. Authorised for execution by DavDev._
