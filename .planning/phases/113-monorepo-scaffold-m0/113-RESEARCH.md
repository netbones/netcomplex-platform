# Phase 113: Monorepo Scaffold (M0) — Research

**Researched:** 2026-06-28
**Domain:** Monorepo tooling — Turborepo + pnpm workspaces
**Confidence:** HIGH

## Summary

Phase 113 (M0) creates a running monorepo skeleton around the existing single-repo Next.js app **without moving any code**. The project has no `packages/`, `apps/`, `tooling/`, or `turbo.json` today — everything must be built from scratch. Key deliverables: Turborepo CLI root install + `turbo.json`, `pnpm-workspace.yaml` updated to declare workspace globs, `tooling/` presets (TypeScript, ESLint, Prettier), and stub `package.json` files for all 9 workspace packages. The existing web app stays at repo root and continues to work identically.

**Critical insight:** M0 is additive only — it creates new directories and files, never touches existing src/ files. The web app should be testable (`pnpm build`, `pnpm lint`, `pnpm typecheck`) at every commit. If any existing command breaks, the scaffold introduced a regression.

**Conflict identified:** ADVISORY-019 targets NativeWind v5 for UI strategy but pins Expo SDK 53. NativeWind v5 (preview) requires React Native 0.81+, which ships with Expo SDK 54+, not SDK 53. This does NOT block M0 (which only creates stubs), but the planner must flag this for pre-M3 resolution.

**Primary recommendation:** Install Turborepo 2.9.x at root, update pnpm-workspace.yaml, create tooling/ presets mirroring existing root configs, stub all workspace packages, then verify `pnpm install` + `pnpm turbo run build` pass.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 112 is a tracking/umbrella phase — lightweight CONTEXT.md that references canonical docs.
- **D-02:** Sub-phases 113–117+ map to M0–M4+ as individual GSD phases on the roadmap.
- **D-03:** Sub-phases should be added sequentially (113 = M0 scaffold, 114 = M1 extract packages, 115 = M2 move web, 116 = M3 Expo foundation, 117+ = M4+ features).
- **D-04:** Monorepo gets its own milestone (M7), distinct from M6+ (deferred post-launch work).
- **D-05:** M7 Monorepo tracks all phases 113–117+ until completion.
- **D-06:** Web development continues in parallel during monorepo migration with coordination restrictions.
- **D-07:** During M1 (extract packages), web dev avoids editing files being extracted (types, schemas, tRPC routers). Coordinate via shared file manifest.
- **D-08:** During M2 (move web), web dev restricts to bug fixes only (48h freeze window). Schedule around low-traffic days.
- **D-09:** Pre-M0 and M3+ have no restrictions on web dev.
- **D-10:** Turborepo + pnpm workspaces monorepo tooling.
- **D-11:** Keep FSD per app (`apps/web`, `apps/expo`); shared code to `packages/`.
- **D-12:** Mobile uses Expo SDK 53 + Expo Router + NativeWind v5.
- **D-13:** Full feature parity (all 24 features).
- **D-14:** tRPC as data layer for mobile (no direct DB access).
- **D-15:** `docs/ADVISORY-019.md` supersedes earlier planning — its gate decisions (G-1 through G-3) and pre-execution checklists are authoritative.

### The Agent's Discretion

- Package naming convention (`@soralia/*`) is locked from MOBILE_MONOREPO.md.
- Tooling config presets format (`.json`, `.js`, `.mjs`) is open — follow existing project conventions.

### Deferred Ideas (OUT OF SCOPE)

- Mobile-first development (deferred — not a decision).
- Feature flags for mobile (deferred to M3 planning).
- Second-tenant concerns (Phase 03 — does not block monorepo structure).
- Any code movement — M0 is scaffold-only, no existing files are touched.
  </user_constraints>

## Architectural Responsibility Map

| Capability          | Primary Tier                           | Secondary Tier | Rationale                                                     |
| ------------------- | -------------------------------------- | -------------- | ------------------------------------------------------------- |
| Build orchestration | Monorepo root (turbo.json)             | —              | Turborepo defines task graph across all packages              |
| Package management  | Monorepo root (pnpm-workspace.yaml)    | —              | pnpm resolves workspace dependencies from root config         |
| TypeScript configs  | tooling/typescript/                    | —              | Shared presets consumed by all packages via extends           |
| ESLint configs      | tooling/eslint/                        | —              | Shared presets consumed by all packages; per-app overrides    |
| Prettier config     | tooling/prettier/                      | —              | Single shared formatting config consumed by all packages      |
| Web app             | apps/web/ (stub — code at root for M0) | Repo root      | Web app stays at repo root until M2; stub declares dependency |
| Expo app            | apps/expo/ (stub)                      | —              | Stub only — real scaffold happens in M3                       |
| Shared packages     | packages/\*/ (stubs)                   | —              | Stub package.json files with `main: "src/index.ts"`           |
| CI/CD               | .github/workflows/ (new)               | —              | Add turbo-invoking CI workflow                                |

## Standard Stack

### Core

| Library    | Version                     | Purpose                                | Why Standard                                        |
| ---------- | --------------------------- | -------------------------------------- | --------------------------------------------------- |
| Turborepo  | 2.9.x (latest stable)       | Build orchestration & caching          | D-10 locked; Vercel ecosystem; Rust-based perf      |
| pnpm       | 10.33.0 (already installed) | Package manager & workspace resolution | D-10 locked; project standard; faster than npm/yarn |
| TypeScript | 6.0.2 (already installed)   | Type checking                          | Project standard — will move to tooling/ presets    |

### Supporting — M0 Creates These

| Artifact                         | Purpose                | Notes                                                             |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `turbo.json`                     | Task graph definition  | Versioned schema URL: `https://v2-9-16.turborepo.dev/schema.json` |
| `pnpm-workspace.yaml`            | Workspace globs        | `['apps/*', 'packages/*', 'tooling/*']`                           |
| `tooling/typescript/base.json`   | Base tsconfig          | strict, ESNext module, bundler resolution                         |
| `tooling/typescript/nextjs.json` | Next.js tsconfig       | extends base + jsx: preserve                                      |
| `tooling/typescript/expo.json`   | Expo tsconfig          | extends base + jsx: react-native (stub for M3)                    |
| `tooling/eslint/base.js`         | Shared ESLint rules    | Minimal — extends eslint:recommended                              |
| `tooling/eslint/nextjs.js`       | Next.js config         | + next/core-web-vitals                                            |
| `tooling/eslint/expo.js`         | Expo config            | + react-native rules (stub for M3)                                |
| `tooling/prettier/index.js`      | Shared Prettier config | Mirror existing `.prettierrc` as JS export                        |

### Alternatives Considered

| Instead of           | Could Use          | Tradeoff                                                                  |
| -------------------- | ------------------ | ------------------------------------------------------------------------- |
| Turborepo            | Nx (Nrwl)          | Nx has more features but D-10 locks Turboropo; Vercel ecosystem alignment |
| pnpm workspaces      | npm workspaces     | Already on pnpm; npm workspaces slower at scale                           |
| Versioned schema URL | Unversioned schema | Versioned gives exact IDE validation matching installed turbo version     |

**Installation:**

```bash
pnpm add -D turbo -w
```

**Version verification:** Turborepo 2.9.16 is latest stable (published 2026-05-28). v2.10.0 is also now available. Pin to `^2.9.0` to get minor/patch updates without major breaking changes.

## Package Legitimacy Audit

> M0 only installs one new package: `turbo`. No other external packages are installed in this phase.

| Package | Registry | Age                 | Downloads | Source Repo                 | Verdict | Disposition                  |
| ------- | -------- | ------------------- | --------- | --------------------------- | ------- | ---------------------------- |
| turbo   | npm      | ~4 yrs (since 2022) | 10M+/week | github.com/vercel/turborepo | OK      | Approved — Vercel-maintained |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Monorepo Root (./)                         │
│  ┌──────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ turbo.json│  │ pnpm-workspace   │  │ package.json       │  │
│  │ (tasks)   │  │ .yaml            │  │ (root scripts →    │  │
│  │           │  │ (workspace globs)│  │  turbo run ...)    │  │
│  └──────────┘  └──────────────────┘  └────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │                  tooling/                            │      │
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────────┐   │      │
│  │  │ typescript/   │  │ eslint/  │  │ prettier/    │   │      │
│  │  │ base.json     │  │ base.js  │  │ index.js     │   │      │
│  │  │ nextjs.json   │  │ nextjs.js│  └──────────────┘   │      │
│  │  │ expo.json     │  │ expo.js  │                     │      │
│  │  └──────────────┘  └──────────┘                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │                  packages/ (stubs)                    │      │
│  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌───────────┐   │      │
│  │  │ shared/  │ │ db/    │ │ api/   │ │ auth/     │   │      │
│  │  ├──────────┤ ├────────┤ ├────────┤ ├───────────┤   │      │
│  │  │ ui/      │ │ server/│ │analytics│            │   │      │
│  │  └──────────┘ └────────┘ └────────┘             │   │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │                  apps/ (stubs)                        │      │
│  │  ┌──────────────┐  ┌──────────────┐                  │      │
│  │  │ web/          │  │ expo/        │                  │      │
│  │  │ package.json  │  │ package.json │                  │      │
│  │  └──────────────┘  └──────────────┘                  │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                               │
│  (Web app code stays at repo root: src/, prisma/, public/)    │
└──────────────────────────────────────────────────────────────┘

                    Data Flow: root scripts → turbo → packages
```

### Recommended Project Structure (After M0)

```
soralia-village/
├── turbo.json                  # NEW — task graph
├── pnpm-workspace.yaml          # UPDATED — workspace globs
├── package.json                 # UPDATED — scripts delegate to turbo
├── tooling/                     # NEW
│   ├── typescript/
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── expo.json
│   ├── eslint/
│   │   ├── base.js
│   │   ├── nextjs.js
│   │   └── expo.js
│   └── prettier/
│       └── index.js
├── packages/                    # NEW — stubs only
│   ├── shared/package.json      # @soralia/shared
│   ├── db/package.json          # @soralia/db
│   ├── api/package.json         # @soralia/api
│   ├── auth/package.json        # @soralia/auth
│   ├── ui/package.json          # @soralia/ui
│   ├── analytics/package.json   # @soralia/analytics
│   └── server/package.json      # @soralia/server
├── apps/                        # NEW — stubs only
│   ├── web/package.json         # @soralia/web
│   └── expo/package.json        # @soralia/expo
├── src/                         # UNCHANGED
├── prisma/                      # UNCHANGED
├── ...                          # everything else unchanged
```

### Pattern 1: Turborepo v2 Task Definition

**What:** Define tasks with dependency ordering and output caching in `turbo.json`.
**When to use:** Root-level task graph that all workspace packages inherit.
**Example:**

```jsonc
{
  "$schema": "https://v2-9-16.turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
    },
    "lint": {
      "dependsOn": ["^build"],
    },
    "typecheck": {
      "dependsOn": ["^build"],
    },
    "dev": {
      "cache": false,
      "persistent": true,
    },
    "test": {
      "dependsOn": ["^build"],
    },
  },
}
```

### Pattern 2: Stub Package Package.json

**What:** Minimal `package.json` for workspace package stubs — just enough to declare the workspace name.
**When to use:** M0 phase where packages have no actual code yet.
**Example:**

```json
{
  "name": "@soralia/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

### Anti-Patterns to Avoid

- **Over-configuring turbo.json in M0:** Keep the baseline task graph simple. Don't add package-specific turbo.json overrides or environment variable filtering in M0 — that's M1/M2 work.
- **Moving the existing tsconfig.json:** The root `tsconfig.json` stays at root for the web app. Tooling presets are NEW files that existing apps adopt later (M2).
- **Adding workspace package dependencies in stubs:** Stubs have `"main": "./src/index.ts"` but no `src/index.ts` yet. Don't add `dependencies` fields to stubs — they'll be populated in M1 when code is moved.

## Don't Hand-Roll

| Problem                       | Don't Build                         | Use Instead                               | Why                                                                           |
| ----------------------------- | ----------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Build orchestration           | Custom shell scripts chaining tasks | Turborepo task graph                      | Already locked (D-10); supports caching, parallelization, dependency ordering |
| Workspace management          | Manual symlinks via postinstall     | pnpm workspaces                           | Already using pnpm; workspace protocol resolves automatically                 |
| TypeScript config inheritance | Duplicating tsconfig per package    | tooling/typescript presets with `extends` | Single source of truth; all packages inherit same strict settings             |
| ESLint config inheritance     | Copying eslint config per package   | tooling/eslint presets                    | Single source of truth; per-app overrides only for platform-specific rules    |

**Key insight:** M0's job is to set up the mechanisms that prevent future hand-rolling. Every custom script you'd write to coordinate builds is replaced by a `turbo.json` task declaration. Every duplicated config is replaced by a `tooling/` preset.

## Common Pitfalls

### Pitfall 1: pnpm-workspace.yaml Overrides Break on Workspace Change

**What goes wrong:** The current `pnpm-workspace.yaml` has `overrides` and `patchedDependencies` sections. When the workspace glob changes from `.` (single-project) to `['apps/*', 'packages/*', 'tooling/*']`, pnpm must re-resolve the dependency graph — and overrides apply to ALL workspace packages, potentially causing version conflicts.
**Why it happens:** Workspace globs affect how pnpm resolves peer dependencies and applies overrides. Adding `apps/*` introduces packages that might have conflicting peer dep ranges.
**How to avoid:** After updating workspace globs and before verifying `pnpm install`, check that `overrides` still apply correctly. The existing overrides (drizzle-orm, cross-spawn, etc.) are safe — they pin transitive deps. But be aware that new stub packages won't introduce peer conflicts since they have no deps.
**Warning signs:** `pnpm install` fails with "Cannot resolve workspace package" or "Failed to apply overrides."

### Pitfall 2: TypeScript Config Conflict — Root vs Workspace Packages

**What goes wrong:** The root `tsconfig.json` uses `paths: { "@/*": ["./src/*"] }` and includes `./src/`. Workspace packages live outside `./src/` (e.g., `./packages/shared/src/`). Existing ESLint and Steiger configs reference `./src/` — they won't see new workspace files.
**Why it happens:** TypeScript, ESLint, and Steiger all need their `include`/`ignore` patterns updated to account for workspace packages. This is intentional — workspace packages get their own tsconfigs in M1. But in M0, running `pnpm typecheck` (which invokes `tsc --noEmit` with the root tsconfig) should NOT try to typecheck workspace stubs.
**How to avoid:** Add `packages/`, `apps/`, `tooling/` to the root tsconfig's `exclude` array, or ensure stubs have no TypeScript files yet (they won't — they're just `package.json`). The root typecheck command should continue to only check `src/`.
**Warning signs:** `tsc --noEmit` fails because it encounters new files outside `./src/` that don't match root tsconfig paths.

### Pitfall 3: Prettier and ESLint Scanning Workspace Stubs

**What goes wrong:** `prettier --write .` (in root scripts) will now scan `packages/`, `apps/`, `tooling/`. ESLint's root config ignores `node_modules` but may not ignore new workspace directories.
**Why it happens:** The root `.prettierrc` and `eslint.config.mjs` have no explicit ignores for workspace directories because they didn't exist before.
**How to avoid:** Add ignore patterns to `.prettierignore` for `packages/`, `apps/`, `tooling/` (they'll get their own formatting configs in M1/M3). Update `eslint.config.mjs` ignores to include these paths.
**Warning signs:** `pnpm format` (prettier --write .) tries to format stub package.json files and reports no change. ESLint output includes warnings for stub directories.

### Pitfall 4: Gitignore Needs Workspace Updates

**What goes wrong:** The current `.gitignore` ignores `.next/`, `node_modules/`, `.env` — all at the top level. After M2 moves the web app to `apps/web/`, `.next/` and `.next/cache/` will live at `apps/web/.next/`, which the root gitignore won't catch if the patterns lack `**/` prefixes.
**Why it happens:** Single-project `.gitignore` patterns assume files are at specific paths. Monorepos need recursive patterns.
**How to avoid:** In M0, add `**/.next/` and `**/node_modules/` patterns to `.gitignore` alongside the existing ones. Also add workspace-specific ignores: `**/.turbo/` (Turborepo cache).
**Warning signs:** After `git mv` in M2, `apps/web/.next/` contents appear in git status.

### Pitfall 5: Stale Lockfile After Workspace Change

**What goes wrong:** The existing `pnpm-lock.yaml` was generated with `packages: ['.']`. Changing workspace globs means pnpm must regenerate the lockfile. If `frozen-lockfile=true` in `.npmrc`, `pnpm install` will fail.
**Why it happens:** The `.npmrc` has `frozen-lockfile=false` (already configured correctly), but the lockfile will see a large diff from the re-resolution.
**How to avoid:** After updating workspace globs, run `pnpm install --no-frozen-lockfile` (which is the default given `.npmrc` config). Expect and commit the lockfile change. The diff will primarily be the new workspace directory entries.
**Warning signs:** `pnpm install` succeeds but shows warnings about lockfile staleness.

## Code Examples

Verified patterns from official sources:

### Root turbo.json Baseline

```jsonc
// turbo.json at repo root
// Source: Turborepo v2 docs — https://turborepo.dev/docs/reference/configuration
{
  "$schema": "https://v2-9-16.turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
    },
    "lint": {
      "dependsOn": ["^build"],
    },
    "typecheck": {
      "dependsOn": ["^build"],
    },
    "dev": {
      "cache": false,
      "persistent": true,
    },
    "test": {
      "dependsOn": ["^build"],
    },
  },
}
```

### Root package.json Scripts After M0

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write .",
    "db:generate": "turbo run db:generate",
    "db:push": "turbo run db:push",
    "db:seed": "turbo run db:seed"
  }
}
```

### pnpm-workspace.yaml After M0

```yaml
# Source: ADVISORY-019 M0 task list
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tooling/*'

# Retain existing allowBuilds and overrides from current config
allowBuilds:
  c: true
  n: true
  d: true
  e: true
  i: true
  o: true
  p: true
  a: true
  '-': true
  supabase: true

overrides:
  '@next/env': 'npm:@varlock/nextjs-integration'
  cross-spawn: 7.0.6
  defu: 6.1.5
  drizzle-orm: 0.45.2
  fast-xml-builder: 1.1.7
  kysely: 0.28.17
  lodash: 4.18.0
  tar: 7.5.11
  tmp: 0.2.6
  undici: 7.24.6
  valibot: 1.2.0
  vite: 8.0.16

patchedDependencies:
  validation-better-auth@1.3.4: patches/validation-better-auth@1.3.4.patch
```

### Stub Package Package.json Pattern

```json
{
  "name": "@soralia/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

## State of the Art

| Old Approach                                            | Current Approach                                                           | When Changed    | Impact                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- | --------------------------------------------------- |
| pnpm single-project workspace (`packages: ['.']`)       | pnpm multi-project workspace (`['apps/*', 'packages/*', 'tooling/*']`)     | M0 (this phase) | pnpm resolves workspace packages across directories |
| Root tsconfig.json with `paths: { "@/*": ["./src/*"] }` | Workspace packages get their own tsconfigs extending `tooling/typescript/` | M1              | Shared compilation settings                         |
| Manual `next build`                                     | `turbo run build` invokes builds in dependency order                       | M0              | Cached builds, parallel execution                   |
| ESLint from root config only                            | Per-package ESLint configs extending `tooling/eslint/`                     | M1              | Platform-specific rules isolated                    |
| Single `.prettierrc` at root                            | Shared Prettier config at `tooling/prettier/`                              | M0              | Single source of truth, consumed by all packages    |

**Deprecated/outdated:**

- `turbo.json` unversioned schema URL (`https://turborepo.dev/schema.json`): Use versioned URL (`https://v2-9-16.turborepo.dev/schema.json`) for 2.7.5+. The codemod `update-versioned-schema-json` auto-migrates.

## Assumptions Log

| #   | Claim                                                                                                                          | Section               | Risk if Wrong                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Turborepo 2.9.16 is latest stable at time of execution                                                                         | Standard Stack        | Minor — install latest regardless of exact patch; CI will validate                                                                  |
| A2  | The existing pnpm-workspace.yaml overrides/patchedDependencies will continue to work after adding workspace globs              | Pitfalls              | Medium — if overrides conflict, pnpm install may fail or silently resolve wrong versions                                            |
| A3  | NativeWind v5 is incompatible with Expo SDK 53                                                                                 | Architecture Patterns | Low for M0 (no Expo code), HIGH for M3 — requires human decision to either upgrade SDK or downgrade NativeWind                      |
| A4  | The `package.json` scripts can be rewritten to delegate to turbo without breaking existing dev workflows                       | Code Examples         | Medium — if user runs `pnpm dev` expecting `next dev` and gets `turbo run dev`, behavior changes if no workspace has a `dev` script |
| A5  | TypeScript 6.0.2 supports tsconfig `extends` from tooling/ presets at relative paths like `../../tooling/typescript/base.json` | Standard Stack        | Low — `extends` supports relative paths; this is a standard Turborepo pattern                                                       |

## Open Questions

1. **NativeWind version conflict with Expo SDK 53**
   - What we know: ADVISORY-019 D-12 targets Expo SDK 53 + NativeWind v5. NativeWind v5 (preview) requires React Native 0.81+ which ships with Expo SDK 54+, not SDK 53.
   - What's unclear: Should we upgrade to Expo SDK 54, downgrade to NativeWind 4.1.23 (compatible with SDK 53), or use an older Expo SDK version?
   - Recommendation: M0 is unaffected (no Expo code). Defer to pre-M3 per ADVISORY-019 GATE G-3 instructions. The planner should add a `checkpoint:human-verify` before M3 to resolve this.

2. **Existing next.config.mjs may need Monorepo-aware settings**
   - What we know: The current `next.config.mjs` references `./src/` and `./public/` — these work fine at repo root.
   - What's unclear: Whether any config options (like `outputFileTracingRoot`) need updating preemptively for monorepo awareness in M0.
   - Recommendation: No changes to `next.config.mjs` in M0. The existing config continues to work. Only update when the web app moves to `apps/web/` in M2.

3. **CI/CD workflow — no existing GitHub Actions workflow**
   - What we know: No `.github/workflows/*.yml` files exist. The project has no CI pipeline yet.
   - What's unclear: Whether to create a CI workflow in M0 or defer to later phases.
   - Recommendation: ADVISORY-019 M0 tasks do not mention CI creation. The MOBILE_MONOREPO.md §M4d shows a CI config for reference, but creating CI is not in M0 scope. Add a minimal `.github/workflows/ci.yml` as a stretch goal if time permits, otherwise defer.

## Environment Availability

| Dependency            | Required By          | Available        | Version | Fallback |
| --------------------- | -------------------- | ---------------- | ------- | -------- |
| pnpm                  | Workspace management | ✓                | 10.33.0 | —        |
| Node.js               | Runtime              | ✓                | 24.10.0 | —        |
| Turborepo (turbo CLI) | Build orchestration  | ✗ (will install) | —       | —        |
| git                   | Version control      | ✓                | —       | —        |

**Missing dependencies with no fallback:**

- Turborepo — will be installed via `pnpm add -D turbo -w` as step 1 of M0

**Missing dependencies with fallback:**

- None — all required tools are available or will be installed in M0

## Validation Architecture

> nyquist_validation is enabled in config.json (`workflow.nyquist_validation: true`).

### Test Framework

| Property           | Value                                     |
| ------------------ | ----------------------------------------- |
| Framework          | Vitest ^4.1.2 (already installed at root) |
| Config file        | `vitest.config.ts` at repo root           |
| Quick run command  | `pnpm test --changed`                     |
| Full suite command | `pnpm test:run`                           |

### Phase Requirements → Test Map

M0 has no assigned requirement IDs (none provided). The validation is entirely structural:

| Behavior                     | Test Type  | Automated Command                               | Notes                              |
| ---------------------------- | ---------- | ----------------------------------------------- | ---------------------------------- |
| Workspace resolves correctly | smoke      | `pnpm install --frozen-lockfile`                | Run after updating workspace globs |
| Turborepo tasks run          | smoke      | `pnpm turbo run build lint typecheck --dry-run` | Verify task graph resolves         |
| Existing web app unaffected  | regression | `pnpm build` (at root)                          | Must pass with no errors           |
| Existing lint passes         | regression | `pnpm lint`                                     | Must pass with no new warnings     |
| Existing typecheck passes    | regression | `pnpm typecheck`                                | Must pass with no new errors       |

### Sampling Rate

- **Per commit:** `pnpm build && pnpm lint && pnpm typecheck` (the 3 quality gates from AGENTS.md)
- **Phase gate:** Full suite: `pnpm build && pnpm lint && pnpm typecheck && pnpm test:run`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — may need `projects` config to exclude workspace stubs from test runner (low priority — stubs have no test files)
- [ ] `pnpm turbo run test` — task exists in turbo.json but has no packages implementing a test script yet (safe — turbo skips packages with no matching script)

## Sources

### Primary (HIGH confidence)

- [VERIFIED: Turborepo docs] — turbo.json v2 schema, task configuration, pnpm workspace integration — fetched from turborepo.dev/docs/reference/configuration
- [VERIFIED: npm registry] — turbo 2.9.16 latest stable, expo 53.0.27 latest SDK 53 patch
- [VERIFIED: ADVISORY-019.md] — Full M0 task list, gate decisions, done criteria — read from docs/advisories/ADVISORY-019.md
- [VERIFIED: MOBILE_MONOREPO.md] — Full architecture spec, package dependency graph, component inventory — read from docs/MOBILE_MONOREPO.md

### Secondary (MEDIUM confidence)

- [CITED: NativeWind v5 migration guide] — v5 preview requires RN 0.81+ (nativewind.dev/blog/v5-migration-guide) — used to flag NativeWind v5 / SDK 53 incompatibility
- [CITED: Expo SDK 53 docs] — RN 0.79 + React 19, released April 2025 (docs.expo.dev/versions/latest/) — SDK 53 compatibility confirmed

### Tertiary (LOW confidence)

- [ASSUMED] The existing `pnpm-workspace.yaml` overrides survive workspace glob re-resolution without conflicts — partially verified by reading current overrides (no app-specific packages that would conflict)
- [ASSUMED] TypeScript 6.0.2 project references work with tsconfig `extends` across workspace boundaries — standard Turborepo pattern, but not tested in this repo

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Turborepo + pnpm locked by D-10; verified from official docs and npm registry
- Architecture: HIGH — Full architecture spec from MOBILE_MONOREPO.md + ADVISORY-019.md; verified against current filesystem state
- Pitfalls: MEDIUM — Based on monorepo migration patterns from official docs; some project-specific behaviors (Steiger, FSD) not fully verified in monorepo context

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (30 days for tooling + config)
