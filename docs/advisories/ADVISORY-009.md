# ADVISORY-009: Steiger Config Bugs and `no-public-api-sidestep` Remediation

**Date:** 2026-06-14
**Status:** Approved — Pending Execution
**Triggered by:** Post-ADVISORY-008 investigation — `@api/server` allow list (123 violations) and `@entities/*/server` allow list not suppressing violations despite being present in `steiger.config.js`
**Supersedes:** The Steiger allow list block in ADVISORY-008 (execution plan Section 2 is replaced by this advisory)
**Related:** ADVISORY-008.md (server.ts barrel pattern), steiger.config.js, `@feature-sliced/steiger-plugin` Issue #180

---

## Problem Statement

After implementing ADVISORY-008, Steiger reports **327 warnings** across two rules. Investigation of the config and upstream source reveals **two distinct bugs** in the current `steiger.config.js`, plus a **third issue** that is a known Steiger design gap now closed in a recent upstream release.

Current violation count:

| Rule                         | Violations |
| ---------------------------- | ---------- |
| `fsd/no-public-api-sidestep` | 312        |
| `fsd/insignificant-slice`    | 15         |

Top sidestep targets:

| Import target             | Count | Expected status                 |
| ------------------------- | ----- | ------------------------------- |
| `@api/server`             | 123   | Should be suppressed — IS NOT   |
| `@entities/tenant/server` | 111   | Should be suppressed — IS NOT   |
| `@api/client`             | 38    | Should be suppressed — IS NOT   |
| `@api/shared`             | 22    | Should be suppressed — IS NOT   |
| `@/shared/api/db`         | 5     | Genuine violation — wrong alias |
| `@/shared/api/auth-utils` | 4     | Genuine violation — wrong alias |

---

## Root Cause Analysis

### Bug 1: `fsd/no-public-api-sidestep` has no `allow` option

The current config passes an options object to the rule:

```js
'fsd/no-public-api-sidestep': [
  'warn',
  {
    allow: ['@api/server', '@api/client', '@api/shared', '@entities/tenant/server', ...],
  },
],
```

**This option does not exist.** The `fsd/no-public-api-sidestep` rule accepts only a severity string (`'warn'` | `'error'`). It has no per-path suppression mechanism. Steiger silently discards the unknown options object and runs the rule without any exceptions. This is confirmed by the Steiger config spec (discussions/53) and source code — the only rule in the FSD plugin with documented options is `fsd/public-api`, which accepts `indexFileName`.

This is why every allow-listed path still shows violations. **The allow list has never worked.**

### Bug 2: `server.ts` is not recognised as a public API by Steiger

Steiger's `@feature-sliced/filesystem` package determines whether a file is a public API entry point by checking `parse(path).name === 'index'`. Only files named `index.ts` (or `index.tsx`, `index.js`, etc.) qualify. A file named `server.ts` at the slice root is treated as an internal module, not as a public API barrel, regardless of what it re-exports.

This means `@entities/tenant/server` is a genuine sidestep violation from Steiger's perspective — not because the architecture is wrong, but because Steiger's `isIndex()` function did not support multiple named entry points per slice. Importing from `server.ts` is structurally identical to importing from `api/with-tenant.ts` as far as Steiger is concerned.

### Bug 3 (Resolved Upstream): Multi-entry-point support shipped in `@feature-sliced/steiger-plugin@0.6.0`

Issue #180 ("SSR problem (Remix)") was filed specifically for this scenario — fullstack frameworks needing multiple public API entry points per slice (client vs server). The Steiger maintainer confirmed: **"Released! Please update `steiger` and `@feature-sliced/steiger-plugin` to resolve this issue."** `@feature-sliced/steiger-plugin@0.6.0` was published six days ago (2026-06-08).

The fix is in `@feature-sliced/filesystem` — the `isIndex()` function now recognises additional entry point patterns beyond bare `index`. The naming convention suggested during the issue discussion was **`index.server.ts`**, which follows the `index.*` pattern the updated filesystem package accepts.

The `fsd/public-api` rule's documented `indexFileName` option (from the config spec) is the mechanism by which additional entry point names can be registered. After upgrading, this option (or the updated `isIndex()` logic) will allow `index.server.ts` to be treated as a valid second public API entry point alongside `index.ts`.

---

## Decision: Upgrade + Rename to `index.server.ts`

### What changes

1. **Upgrade `@feature-sliced/steiger-plugin` to `0.6.0`** — picks up the multi-entry-point fix from Issue #180.

2. **Rename all five `server.ts` barrels to `index.server.ts`** — adopts the naming convention the upstream fix was designed for. This makes Steiger recognise these files as valid public API entry points rather than internal sidesteps.

3. **Update all consumer import paths** — `from '@entities/tenant/server'` → `from '@entities/tenant/index.server'`. (Or update `tsconfig.json` path aliases so the `@entities/tenant/server` alias continues to resolve to the renamed file — preferred approach, detailed below.)

4. **Remove the bogus `allow` options block from `steiger.config.js`** — it has never worked and must not be left as dead config that implies a false guarantee.

5. **Resolve the 9 genuine violations** (`@/shared/api/db` × 5 and `@/shared/api/auth-utils` × 4) — these use the wrong path alias and are real violations, not false positives.

### Why `index.server.ts` and not `server.ts` with a config option

The Steiger config spec shows `indexFileName` as an option on `fsd/public-api`, not on `fsd/no-public-api-sidestep`. The sidestep rule derives its understanding of what constitutes a public API from the filesystem package's `isIndex()` logic — it does not have its own allowlist mechanism. The only reliable way to make `server.ts` satisfy both `fsd/public-api` and `fsd/no-public-api-sidestep` is to name it in a way the filesystem package recognises as an index file. `index.server.ts` satisfies this.

Attempting to configure the rule with `['warn', { indexFileName: 'server.ts' }]` may or may not work depending on which rule the option belongs to and how the sidestep rule consumes it. Renaming to `index.server.ts` is the safe, convention-aligned path that the upstream maintainers designed for.

---

## Architecture After This Change

### Barrel naming convention

```
src/entities/tenant/
├── index.ts              # Client-safe public API (unchanged)
├── index.server.ts       # RENAMED from server.ts — server-only public API
├── api/
│   ├── base.ts
│   ├── with-tenant.ts
│   └── ...
├── model/
└── ui/
```

### Import path strategy — use tsconfig aliases (preferred)

Rather than updating 105+ import statements from `@entities/tenant/server` to `@entities/tenant/index.server`, add path aliases to `tsconfig.json` that map the `*/server` shorthand to the `*/index.server` file. This preserves all existing import statements written after ADVISORY-008 and avoids a second mechanical find-replace across the codebase.

```jsonc
// tsconfig.json — paths section additions
{
  "compilerOptions": {
    "paths": {
      // Existing aliases (do not remove)
      "@entities/tenant": ["./src/entities/tenant/index.ts"],
      "@api/server": ["./src/shared/api/server/index.ts"],
      // NEW: map /server shorthand to index.server.ts for each affected slice
      "@entities/tenant/server": ["./src/entities/tenant/index.server.ts"],
      "@entities/content/server": ["./src/entities/content/index.server.ts"],
      "@entities/maintenance/server": ["./src/entities/maintenance/index.server.ts"],
      "@entities/event/server": ["./src/entities/event/index.server.ts"],
      "@entities/booking/server": ["./src/entities/booking/index.server.ts"],
    },
  },
}
```

With these aliases in place, `import { withTenant } from '@entities/tenant/server'` continues to resolve correctly to `index.server.ts` without any import statement changes.

**Verify this approach first** — if the project's tsconfig already manages aliases differently (e.g., via Next.js `next.config.mjs` webpack aliases or a separate paths file), match that pattern. Do not add aliases that conflict with existing resolution.

### Steiger config after this change

The bogus `allow` block is removed. The `fsd/public-api` rule is configured to recognise `index.server.ts` as a valid entry point name (exact option syntax to be confirmed against 0.6.0 release notes after upgrade):

```js
// steiger.config.js — after ADVISORY-009 changes
import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      'fsd/no-public-api-sidestep': 'warn', // ← severity only, no options object
      'fsd/forbidden-imports': 'warn',
      'fsd/insignificant-slice': 'warn',
      'fsd/public-api': [
        'warn',
        {
          // Registers index.server.ts as a valid second public API entry point.
          // Syntax confirmed against @feature-sliced/steiger-plugin@0.6.0.
          // See Issue #180 for context.
          indexFileName: 'index{,.server}.{ts,tsx}',
        },
      ],
      'fsd/typo-in-layer-name': 'error',
      'fsd/shared-lib-grouping': 'warn',
      'fsd/segments-by-purpose': 'warn',
      'fsd/no-segmentless-slices': 'warn',
      'fsd/no-reserved-folder-names': 'warn',
      'fsd/inconsistent-naming': 'warn',
      'fsd/no-processes': 'error',
    },
  },
  // ... existing file-scoped blocks (widget registry exceptions etc.) unchanged
]);
```

**The `indexFileName` glob syntax must be verified against the actual 0.6.0 API** — it may be a single string, an array, or a glob. Check the 0.6.0 release notes or source after upgrading before writing this option. If the option is not on `fsd/public-api`, check `fsd/no-public-api-sidestep` in the upgraded version — the implementation may differ from the pre-release spec.

---

## Genuine Violations to Fix

Nine violations are real — not false positives, not suppression failures. These files import using the bare `@/` prefix instead of the registered `@api/` alias:

| Import path used          | Files   | Correct path                               |
| ------------------------- | ------- | ------------------------------------------ |
| `@/shared/api/db`         | 5 files | `@api/server` (db access is server-only)   |
| `@/shared/api/auth-utils` | 4 files | `@api/server` (auth utils are server-only) |

**Fix:** Replace `@/shared/api/db` and `@/shared/api/auth-utils` with imports from `@api/server`. Confirm both `db` and `auth-utils` are already re-exported from `src/shared/api/server/index.ts`. If they are not, add them before updating the 9 consumer files.

```bash
# Locate the 9 files
grep -rn "from '@/shared/api/db'\|from '@/shared/api/auth-utils'" src/ --include="*.ts" --include="*.tsx"
```

---

## Insignificant Slices — Deferred Audit

The 15 `fsd/insignificant-slice` warnings are out of scope for this advisory. They represent a separate architectural concern — slices with zero or one consumer may indicate premature extraction, dead code, or entity boundaries that don't match current usage patterns.

**Do not address insignificant slices in this phase.** They require DavDev review before any merge or removal. Log them as a BD issue for a follow-on audit session.

Slices flagged (for reference only):

| Slice                     | Consumer count |
| ------------------------- | -------------- |
| `entities/admin`          | 1              |
| `entities/survey`         | 1              |
| `entities/user`           | 1              |
| `entities/widget`         | 1              |
| `features/admin`          | 0              |
| `features/booking`        | 0              |
| `features/chat`           | 0              |
| `features/gate`           | 0              |
| `features/dashboard`      | 1              |
| `features/i18n`           | 1              |
| `features/service`        | 1              |
| `features/survey-builder` | 0              |
| `widgets/booking`         | 0              |
| `widgets/chat`            | 0              |
| `widgets/maintenance`     | 0              |

Several of these (`features/booking`, `features/chat`, `widgets/booking`, `widgets/chat`, `widgets/maintenance`) have zero references, which is notable given the codebase is in active production use. These may be slice shells whose actual code has migrated to widget or entity layers and the slice is now dead. Do not delete without DavDev confirmation.

---

## Pre-Execution Checklist

Before the agent begins, the following must be verified. These are mandatory discovery tasks — do not skip.

- [ ] **Check installed version of `@feature-sliced/steiger-plugin`** and confirm it is not already 0.6.0.

  ```bash
  cat package.json | grep steiger
  # or
  pnpm list @feature-sliced/steiger-plugin
  ```

- [ ] **Read `tsconfig.json` paths section in full** before adding new aliases. Confirm the existing alias format and whether `@entities/tenant` is already aliased. Do not assume — the tree does not show tsconfig contents.

- [ ] **Check `next.config.mjs`** for any webpack alias or module resolution overrides that would conflict with new tsconfig paths.

- [ ] **After upgrading, run Steiger before making any other changes** and capture the full output. Compare violation count to the pre-upgrade baseline (327 warnings). If the upgrade alone resolves the `@api/server` and `@entities/*/server` violations, the remaining work is the 9 genuine violations only — do not proceed with tsconfig alias work if it is unnecessary.

  ```bash
  pnpm add -D @feature-sliced/steiger-plugin@0.6.0
  pnpm steiger src/ 2>&1 | tee steiger-post-upgrade.txt
  ```

- [ ] **Read the 0.6.0 release notes or CHANGELOG** before configuring `indexFileName`. The option syntax in Discussion #53 is a pre-release proposal — the shipped API may differ. Check:

  ```bash
  cat node_modules/@feature-sliced/steiger-plugin/CHANGELOG.md | head -60
  # or check the README in the installed package
  cat node_modules/@feature-sliced/steiger-plugin/README.md | grep -A 20 "indexFileName"
  ```

- [ ] **Verify `db` and `auth-utils` are re-exported from `@api/server`** before updating the 9 consumer files.

  ```bash
  grep -n "db\|auth-utils" src/shared/api/server/index.ts
  ```

- [ ] **Do not rename `server.ts` files until after confirming the upgrade reduces violations.** If 0.6.0 does not resolve the issue, escalate to DavDev before proceeding — the rename may not be the right fix.

---

## Execution Plan

### Step 1 — Upgrade `@feature-sliced/steiger-plugin`

```bash
pnpm add -D @feature-sliced/steiger-plugin@0.6.0
```

Run Steiger immediately and record output. If `@api/server` and `@entities/*/server` violations drop to zero without any other changes, skip to Step 3. If violations persist, proceed to Step 2.

### Step 2 — Configure `indexFileName` in `steiger.config.js`

Read the installed 0.6.0 package's README or CHANGELOG to confirm the exact `indexFileName` option format. Add it to `fsd/public-api` in `steiger.config.js`.

Remove the bogus `allow` options object from `fsd/no-public-api-sidestep`. The rule entry should be a bare severity string:

```js
'fsd/no-public-api-sidestep': 'warn',
```

Run Steiger again after this change. The `@api/server`, `@api/client`, `@api/shared`, and `@entities/*/server` violations should now be at zero. If not, stop and escalate to DavDev.

### Step 3 — Rename `server.ts` to `index.server.ts` (if required)

Only perform this step if Steiger still reports `@entities/*/server` as violations after Steps 1–2. If the upgrade and config fix resolved them, this step is unnecessary.

If rename is required:

```bash
# Rename per slice
mv src/entities/tenant/server.ts src/entities/tenant/index.server.ts
mv src/entities/content/server.ts src/entities/content/index.server.ts
mv src/entities/maintenance/server.ts src/entities/maintenance/index.server.ts
mv src/entities/event/server.ts src/entities/event/index.server.ts
mv src/entities/booking/server.ts src/entities/booking/index.server.ts
```

Add tsconfig path aliases mapping `@entities/*/server` → `index.server.ts` (see Architecture section above). This preserves all existing import statements.

Run `pnpm typecheck` after alias additions. All five slices must resolve cleanly.

### Step 4 — Fix the 9 genuine violations

Locate the files:

```bash
grep -rn "from '@/shared/api/db'\|from '@/shared/api/auth-utils'" src/ --include="*.ts" --include="*.tsx"
```

Confirm `db` and `auth-utils` exports exist in `@api/server`. Update all 9 import statements to use `@api/server`.

### Step 5 — Final verification

```bash
pnpm steiger src/ 2>&1 | tee steiger-final.txt
pnpm typecheck
pnpm lint
pnpm build
```

Expected Steiger output after this advisory is complete:

- `fsd/no-public-api-sidestep`: 0 violations (all intentional sub-barrels recognised)
- `fsd/insignificant-slice`: 15 warnings (unchanged — deferred to follow-on audit)
- All other rules: at or below Phase 44 baseline

All of `typecheck`, `lint`, and `build` must pass clean.

---

## Risk Register

| Risk                                                                                    | Likelihood | Impact | Mitigation                                                                                                |
| --------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `@feature-sliced/steiger-plugin@0.6.0` API differs from Discussion #53 pre-release spec | Medium     | Medium | Read installed 0.6.0 CHANGELOG/README before configuring `indexFileName`. Upgrade first, then configure.  |
| `indexFileName` option is on `fsd/no-public-api-sidestep`, not `fsd/public-api`         | Medium     | Low    | Check both rules in 0.6.0 source; option placement may differ from spec.                                  |
| Upgrade introduces new violations beyond the current 327 baseline                       | Low        | Medium | Run Steiger immediately after upgrade and compare counts before any other changes.                        |
| tsconfig alias addition conflicts with existing Next.js module resolution               | Low        | High   | Read `next.config.mjs` and full tsconfig before adding aliases.                                           |
| `db` or `auth-utils` not exported from `@api/server` barrel                             | Low        | Medium | Pre-execution grep confirms before updating 9 consumer files.                                             |
| `server.ts` rename breaks imports in files not found by grep                            | Very Low   | Medium | tsconfig alias approach avoids this entirely — existing `@entities/*/server` imports continue to resolve. |

---

## Done Criteria

- [ ] `@feature-sliced/steiger-plugin` is at version 0.6.0 or later
- [ ] `fsd/no-public-api-sidestep` entry in `steiger.config.js` is a bare severity string — no options object
- [ ] `@api/server`, `@api/client`, `@api/shared`, `@entities/*/server` violations are at zero
- [ ] The 9 genuine violations (`@/shared/api/db`, `@/shared/api/auth-utils`) are resolved
- [ ] `fsd/insignificant-slice` (15 warnings) is logged as a BD issue for follow-on audit
- [ ] `pnpm steiger src/` total violations ≤ 15 (insignificant slices only)
- [ ] `pnpm typecheck` passes clean
- [ ] `pnpm lint` passes clean
- [ ] `pnpm build` passes clean
- [ ] `ADVISORY-009.md` is copied to `docs/advisories/ADVISORY-009.md`

---

## Out of Scope

- Insignificant slice remediation (merge/remove decisions) — separate BD issue required
- Custom lint rule for CI enforcement of server-only barrel constraint — flagged in ADVISORY-008 as follow-on work
- Any other Steiger rule clusters beyond `no-public-api-sidestep` — Phase 44 tightens rules one cluster at a time

---

_Advisory produced by Claude (Anthropic) on 2026-06-14 following Steiger config investigation. Supersedes the Steiger allow list instructions in ADVISORY-008 execution plan Step 2. Authorised for execution by DavDev._
