# ADVISORY-018: Mobile Monorepo Architecture

**Status:** APPROVED FOR PLANNING — Pending gate resolutions before agent execution  
**Supersedes:** MOBILE_MONOREPO.md (planning document, retained as reference)  
**Produces:** ADR-022 (to be added to `docs/STEERING/ADR.md` upon plan approval)  
**Date:** 2026-06-27  
**Advisory type:** Strategic (multi-phase, long-horizon)

---

## 1. Problem Statement

The platform needs a production mobile app (Expo / React Native) with parity across the core resident-facing feature set. The current codebase is a single-repo FSD monolith. To share types, Zod schemas, constants, tRPC router definitions, and UI primitives across web and mobile, the repository must become a Turborepo monorepo.

This advisory formalises the architecture decisions made in `MOBILE_MONOREPO.md`, adds corrections and missing constraints identified during review, and defines the agent-executable phase plan with explicit decision gates.

---

## 2. Root Cause / Context

The web app has reached a state of functional completeness sufficient for Soralia Village production deployment. Mobile is the next capability milestone. A naïve approach — separate repository, duplicate types, REST-only API — would produce two codebases with divergent models and no type safety bridge. The monorepo approach eliminates that by treating the mobile app as a first-class consumer of shared packages, with the tRPC router as the typed API contract between platforms.

**Key constraint**: The mobile app is a pure API consumer. It never accesses the database directly. All data flows over HTTP via tRPC to the Next.js API layer.

---

## 3. Architecture Decisions (Canonical)

These supersede any prior informal decisions. See ADR-022 for the formal record.

| Concern             | Decision                                           | Rationale                                                       |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| Monorepo tool       | Turborepo                                          | Already on Vercel ecosystem; first-class pnpm workspace support |
| Mobile framework    | Expo SDK 53 (pin, validate before execution)       | Managed workflow; EAS Build; Expo Router; expo-notifications    |
| UI strategy         | NativeWind v5                                      | Reuses Tailwind class names and `soralia-primary` design tokens |
| Navigation          | Expo Router (file-based)                           | Removes Solito dependency — see §4 correction                   |
| FSD scope           | Per-app FSD trees; shared code in `packages/`      | FSD is a within-app architecture; cross-app sharing is packages |
| API contract        | `@soralia/api` tRPC package                        | Types shared; context factory injected per app                  |
| DB access on mobile | Never                                              | Mobile calls `apps/web` API over HTTP only                      |
| Auth on mobile      | Better Auth HTTP cookies forwarded via tRPC header | Requires explicit tenant resolution strategy (GATE G-1)         |
| Analytics           | `@soralia/analytics` thin wrapper                  | PostHog on both platforms via platform-specific adapters        |
| Feature flags       | Deferred to M3 planning                            | Statsig has React Native SDK; decision deferred                 |
| Timeline            | 3–6 months (M0 → M4d)                              | Allows thorough UI rebuild and testing                          |

---

## 4. Corrections to Planning Document

The following items in `MOBILE_MONOREPO.md` require correction before the agent begins execution.

### C1 — Solito Dependency Removed

The planning document includes Solito for cross-platform navigation. **Solito is not required and introduces compatibility risk.** Expo Router v3+ handles file-based routing natively and provides its own `Link` component. Solito's value was cross-platform link compatibility before Expo Router matured — that gap is closed.

**Correction:** Remove Solito from all dependency lists and architecture diagrams. Use Expo Router's native `Link` and `router.push()` exclusively on mobile. The web app continues using Next.js App Router. No shared navigation primitive is needed.

### C2 — Expo SDK Version Discrepancy

The decisions table states "Expo SDK 54" but the dependency list states `expo: ~52`. These conflict.

**Correction:** Target **Expo SDK 53** (stable at time of writing). Verify SDK 54 release status and compatibility during M0 pre-execution discovery. Pin the chosen version in `apps/expo/package.json` and do not float it during development.

### C3 — Drizzle Generator Output Path

The planning document proposes a post-generate copy script to move Drizzle schema files from `apps/web/prisma/` output to `packages/db/src/schema/`. Copy scripts in the critical path silently fail and produce stale generated types without build errors.

**Correction:** In M1, update the `generator drizzle` block in `apps/web/prisma/schema.prisma` to output directly to the packages directory:

```prisma
generator drizzle {
  provider = "prisma-generator-drizzle"
  output   = "../../packages/db/src/schema"
}
```

Current value (confirmed from schema.prisma): `output = "../src/db/schema"`.

Update `apps/web/drizzle.config.ts` to reference the new path. Validate as a standalone spike in M1 before any other M1 extraction work. If the generator does not support cross-package output reliably, escalate to GATE G-2 before proceeding.

### C4 — RichTextRenderer Is Not a Checkbox

The planning document marks `RichTextRenderer` (TipTap JSON → native components) as "Shared." Your `Content`, `Announcement`, and `CommunityServiceListing` models store TipTap JSON with custom extensions (FontFamily, FontSize — per SPEC). A production-quality shared renderer that handles all node types in use requires a dedicated spike.

**Correction:** Mark `RichTextRenderer` as **"M3 spike — validate before committing to shared strategy."** If the spike shows the renderer is not feasibly shared, each app builds its own renderer consuming the same JSON shape.

### C5 — `prod-ca-2021.crt` Not in M2 Task List

The TLS certificate file at repo root (`prod-ca-2021.crt`) is not listed in the M2 file-move task list. If it stays at root after the web app moves to `apps/web/`, any path reference to it in environment configuration breaks.

**Correction:** Add to M2 task list: move `prod-ca-2021.crt` to `apps/web/` and update any environment variable or config reference pointing to it. See also HOLISTIC.md open item on TLS `no-verify` — this is a secondary opportunity to harden certificate verification.

### C6 — Entity-Layer UI Not Scoped

The planning document inventories `src/shared/ui/` (~35 components) but omits the entity-level UI components that carry business logic and require porting decisions:

- `@entities/maintenance/ui/` — `MaintenanceCard`, `PriorityBadge`, `StatusBadge`
- `@entities/directory/ui/` — `UnifiedResidentCard`, `AchievementBadgeGrid`
- `@entities/chat/ui/` — `ChatMessage`, `TypingIndicator`, `OnlineIndicator`
- `@entities/merit/ui/` — `StandingBadge`
- `@entities/service/ui/` — `ServiceCard`, `ReviewStars`, `PricingDisplay`
- `@entities/booking/ui/` — `BookingCard`, `StatusBadge`

**Correction:** These entity-level display components are **not candidates for `@soralia/ui`**. They carry domain-specific rendering logic (status colour mapping, permission-aware display). The decision is: rebuild them in `apps/expo/src/entities/<domain>/ui/` consuming `@soralia/ui` primitives. This is already the correct pattern (per-app FSD entities layer) — the document simply doesn't name it explicitly. Add to M4 wave scoping for each domain: "port entity display components to `apps/expo/src/entities/<domain>/ui/`."

---

## 5. Decision Gates

These gates must be resolved by DavDev before the indicated phase begins. The agent must stop and escalate at each gate.

### GATE G-1 — Tenant Resolution Strategy for Mobile (Before M3)

**Problem:** The current `withTenant()` guard resolves tenant context from the request host via subdomain detection in `middleware.ts`. A mobile tRPC client hitting `https://app.netbones.co.za/api/trpc` lands on the platform domain, not a tenant subdomain. Tenant context will not resolve.

**Options:**

**A — Tenant header (recommended for V1):** Mobile client sends `X-Tenant-Slug: soralia` header. The tRPC context factory reads this header and resolves the tenant. Simple, explicit, requires no subdomain routing change. Risk: header must be set correctly by the mobile client on every request.

**B — Tenant subdomain:** Mobile client targets `https://soralia.app.netbones.co.za/api/trpc`. Reuses existing subdomain logic. Requires mobile client to know and resolve the tenant subdomain. Slightly more complex initial setup but consistent with web behaviour.

**C — Tenant in session:** Tenant slug embedded in the Better Auth session at login time. The tRPC context reads it from the session. Cleanest long-term but requires Better Auth session customisation.

**Resolution required:** Choose A, B, or C before M3 begins. This choice drives the tRPC context factory implementation in `apps/web/src/server/` and the mobile client setup in `apps/expo/src/api/trpc.ts`. There is no safe default — failing to resolve this before M3 means the first tRPC call from the mobile app returns a tenant resolution error.

---

### GATE G-2 — Drizzle Generator Cross-Package Output Validation (During M1)

**Problem:** The `prisma-generator-drizzle` output path change (C3 above) has not been validated in this repo. If the generator does not support `../../packages/db/src/schema` as an output path reliably (path resolution, workspace symlinks, pnpm hoisting), the copy script fallback must be used with strict CI enforcement.

**Resolution required:** Run the generator with the new path in M1. If it works: proceed. If it fails: document the failure mode and propose a CI-enforced copy script with a schema drift check (`pnpm db:check` that fails CI if generated types are stale). Do not proceed to M2 until this is resolved.

---

### GATE G-3 — Expo SDK Version Confirmation (Before M0)

**Problem:** Expo SDK version is inconsistent in the planning document (54 vs 52). SDK version drives NativeWind v5 compatibility, Expo Router API surface, and EAS Build configuration.

**Resolution required:** Confirm target SDK version before M0 scaffold begins. Check current Expo SDK stable release and NativeWind v5 compatibility matrix. Pin the version in the advisory amendment and in `apps/expo/package.json`.

---

## 6. Pre-Execution Discovery Checklist

The agent must run these commands at the start of each phase and write the output as a discovery comment before executing any changes.

### M0 Discovery

```bash
# Verify current pnpm version
pnpm --version

# Verify turbo is not already installed
cat package.json | grep turbo

# Verify pnpm-workspace.yaml does not already declare workspace packages
cat pnpm-workspace.yaml

# Verify no apps/ or packages/ directories exist
ls -la | grep -E "^d.*(apps|packages|tooling)"

# Check current Next.js version (ground truth is ADR-014: 15.5.18)
cat package.json | grep '"next"'
```

### M1 Discovery

```bash
# Count files to be extracted per package
find src/shared/lib/constants src/shared/lib/schemas src/shared/lib/types -name "*.ts" | wc -l
find src/db/schema -name "*.ts" | wc -l
find src/server/routers -name "*.ts" | wc -l

# Confirm current Drizzle generator output
grep -A5 'generator drizzle' prisma/schema.prisma

# Confirm current tRPC router exports
cat src/server/routers/index.ts

# Identify all files importing from paths that will become workspace packages
grep -rl '@/shared/lib/constants\|@/shared/lib/types\|@/shared/api/db\|@/server/routers' src/ --include="*.ts" --include="*.tsx" | wc -l
```

### M2 Discovery

```bash
# Confirm all M1 quality gates passed on current branch
pnpm typecheck && echo "TYPECHECK PASS" || echo "TYPECHECK FAIL"
pnpm lint && echo "LINT PASS" || echo "LINT FAIL"
pnpm build && echo "BUILD PASS" || echo "BUILD FAIL"

# Inventory all files to be moved (for conflict estimation)
find src public prisma drizzle -type f | wc -l

# Confirm prod-ca-2021.crt exists at root
ls -la prod-ca-2021.crt

# Confirm no uncommitted changes on dev
git status --short
```

### M3 Discovery

```bash
# Confirm GATE G-1 is resolved (tenant strategy decision recorded)
grep -l "X-Tenant-Slug\|tenant.*header\|tenant.*session" apps/web/src/server/ 2>/dev/null || echo "G-1 NOT YET IMPLEMENTED"

# Confirm Expo scaffold target directory is empty
ls apps/expo/ 2>/dev/null || echo "apps/expo/ does not exist yet — correct"

# Confirm @soralia/api has tRPC coverage for Wave 1-2 domains
# (auth, chat, notifications, directory, maintenance, content, resources)
ls packages/api/src/router/ 2>/dev/null
```

---

## 7. Phase Plan

### M0 — Monorepo Scaffold (Week 1–2)

**Goal:** Running monorepo skeleton. No code moved. Web app fully unaffected.

**Alters web app?** No.  
**Web works mid-phase?** Yes.  
**Merge risk:** Low.  
**Freeze required?** No.

**Tasks:**

1. Run M0 discovery checklist. Write output as comment. Stop.
2. Install Turborepo at root: `pnpm add -D turbo -w`
3. Create `turbo.json` at repo root with build/lint/typecheck/dev/test tasks
4. Update `pnpm-workspace.yaml` to declare `apps/*`, `packages/*`, `tooling/*`
5. Create `tooling/typescript/` with `base.json`, `nextjs.json`, `expo.json`
6. Create `tooling/eslint/` with `base.js`, `nextjs.js`, `expo.js`
7. Create `tooling/prettier/index.js`
8. Create stub `package.json` files for all workspace packages:
   - `packages/shared/package.json` → `@soralia/shared`
   - `packages/db/package.json` → `@soralia/db`
   - `packages/api/package.json` → `@soralia/api`
   - `packages/auth/package.json` → `@soralia/auth`
   - `packages/ui/package.json` → `@soralia/ui`
   - `packages/analytics/package.json` → `@soralia/analytics`
   - `packages/server/package.json` → `@soralia/server`
   - `apps/web/package.json` → `@soralia/web` (stub only — web stays at root for now)
   - `apps/expo/package.json` → `@soralia/expo` (stub only)
9. Run `pnpm install` — verify workspace resolves
10. Run `pnpm turbo run build lint typecheck` — verify passes with stubs
11. Update CI workflow to invoke turbo at root

**Done criteria:** `pnpm install` resolves. `pnpm build` passes. Web app is unaffected and still deploys from repo root.

---

### M1 — Extract Shared Packages (Week 2–4)

**Goal:** Shared code extracted to `packages/`. Imports rewritten. Web app still at repo root.

**Alters web app?** Yes (import rewrites only — no logic changes).  
**Web works mid-phase?** Yes — CI must pass on branch before merge.  
**Merge risk:** Medium.  
**Freeze required?** No.

**Sub-phases (execute in order, validate CI after each):**

#### M1-A: `@soralia/shared`

Move to `packages/shared/src/`:

- `src/shared/lib/types/` → `packages/shared/src/types/`
- `src/shared/lib/constants/` → `packages/shared/src/constants/`
- `src/shared/lib/schemas/` → `packages/shared/src/schemas/`
- `src/shared/lib/utils.ts` → `packages/shared/src/utils/`
- `src/shared/lib/i18n/` → `packages/shared/src/i18n/`
- `public/locales/` → `packages/shared/src/locales/` (i18n JSON)

Rewrite all imports from `@/shared/lib/constants`, `@/shared/lib/types`, etc. → `@soralia/shared/...`

#### M1-B: `@soralia/db` (GATE G-2 must pass first)

Validate Drizzle generator output path change. If GATE G-2 passes:

- Update `prisma/schema.prisma` generator output to `../../packages/db/src/schema`
- Run `npx prisma generate` — verify output lands in `packages/db/src/schema/`
- Update `drizzle.config.ts` to reference new path
- Rewrite all `@/db/schema` imports → `@soralia/db`

#### M1-C: `@soralia/api`

Move tRPC procedure definitions to `packages/api/src/`:

- `src/server/routers/*.ts` → `packages/api/src/router/`
- Export `appRouter` and `AppRouter` type from `packages/api/src/index.ts`
- Keep in `apps/web` (do not move): route handler (`src/server/trpc.ts`), context factory, OpenAPI generator

#### M1-D: `@soralia/auth`

Move to `packages/auth/src/`:

- Better Auth server config (`betterAuth({...})`)
- Drizzle adapter setup
- Session/User/Account type definitions

Keep per-app: web auth client (cookie-based), mobile auth client (SecureStore — not yet written)

#### M1-E: `@soralia/server`

Move to `packages/server/src/`:

- `src/shared/api/db.ts` (Drizzle client init, `runWithRLS`, `getRLSContext`)
- `src/shared/api/email/` (Resend client, templates)
- `src/shared/api/storage.ts`
- `src/shared/api/rate-limit.ts`
- AI quota utilities (from ADVISORY-017 supplemental series)
- Billing logic (`src/server/payments/`)

**Important:** All `server-only` imports must stay in this package or `apps/web`. `@soralia/shared`, `@soralia/db`, and `@soralia/ui` must never import from `@soralia/server`. Enforce via ESLint `no-restricted-imports`.

#### M1-F: `@soralia/analytics`

Create `packages/analytics/src/`:

- `index.ts` — shared API: `identify`, `track`, `screen`, `group`
- `types.ts` — event type definitions
- `adapters/web.ts` — wraps `@posthog/next`
- `adapters/mobile.ts` — stub (wraps `posthog-react-native`, implemented in M3)

#### M1-G: Steiger + ESLint update

**This must happen in M1, before M2.** Update `steiger.config.js` to allow `@soralia/*` workspace package imports from all FSD layers. Test the updated config against the current codebase (where `@soralia/*` is already in use after M1-A through M1-F). Verify `pnpm fsd:check` passes. If violations surface from M1-A through M1-F imports, fix them before closing M1.

**M1 done criteria:** `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm fsd:check` all pass on the M1 branch. No `@/shared/lib/constants`, `@/db/schema`, or `@/server/routers` deep imports remain in web app source.

---

### M2 — Web App Relocate (Week 4–5, ~48h)

**Goal:** Web app source moved to `apps/web/`. All imports reference workspace packages. Everything builds from `apps/web/`.

**Alters web app?** Yes — structural (`git mv`).  
**Web works mid-phase?** Yes — CI must pass before merge.  
**Merge risk:** High but mechanical.  
**Freeze required?** **Yes — 48-hour feature freeze on `dev`.** Announce before starting.

**Tasks (in order):**

1. Run M2 discovery checklist. Confirm clean `git status`. Announce freeze.
2. `git mv src/ apps/web/src/`
3. `git mv public/ apps/web/public/`
4. `git mv prisma/ apps/web/prisma/`
5. `git mv drizzle/ apps/web/drizzle/`
6. `git mv next.config.mjs apps/web/`
7. `git mv tailwind.config.cjs apps/web/`
8. `git mv postcss.config.cjs apps/web/`
9. `git mv components.json apps/web/`
10. `git mv supabase/ apps/web/supabase/`
11. `git mv e2e/ apps/web/e2e/`
12. `git mv mail/ apps/web/mail/`
13. `git mv scripts/ apps/web/scripts/`
14. **`git mv prod-ca-2021.crt apps/web/prod-ca-2021.crt`** — update any env var or config referencing this path
15. `git mv vitest.config.ts apps/web/`
16. `git mv playwright.config.ts apps/web/`
17. `git mv steiger.config.js apps/web/`
18. `git mv eslint.config.js apps/web/` (if not already in tooling/)
19. Update `turbo.json` to reference `apps/web` as the web pipeline target
20. Update `apps/web/package.json` — move it from stub to the actual web package.json
21. Update all `tsconfig.json` path aliases in `apps/web/` to reference workspace packages
22. Bulk-rewrite any remaining `../../packages/` relative imports to `@soralia/*`
23. Update `prisma-generator-drizzle` output path (if not done in M1-B)
24. Scope `apps/web/steiger.config.js` to `apps/web/src/`
25. Run full quality gate from `apps/web/`: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm fsd:check`
26. Run from repo root: `pnpm turbo run build lint typecheck`
27. Verify Vercel deployment config points to `apps/web/` as the root directory

**Done criteria:** Web app builds and deploys from `apps/web/`. Repo root is now the monorepo root. Freeze lifted.

---

### M3 — Expo App Foundation (Week 5–8)

**Prerequisite:** GATE G-1 (tenant resolution) resolved. GATE G-3 (SDK version) confirmed.

**Goal:** Mobile app boots, authenticates, has tab navigation, and can call one tRPC endpoint successfully.

**Alters web app?** No.  
**Web works mid-phase?** Yes.  
**Merge risk:** Low.

**Tasks:**

1. Run M3 discovery checklist. Confirm G-1 is implemented in `apps/web`.
2. Scaffold Expo app: `npx create-expo-app@latest apps/expo --template blank-typescript`
3. Install and configure Expo Router (file-based routing)
4. Install NativeWind v5, configure Metro bundler
5. Share Tailwind config from `apps/web` (import web config, override `content` path)
6. Wire up tRPC client → `AppRouter` type from `@soralia/api`
7. Implement tenant resolution per G-1 decision (header / subdomain / session)
8. Wire up Better Auth client with Expo SecureStore for session persistence
9. Build auth screens: sign-in, sign-up, forgot password, OTP verify, email verify
10. Build tab navigator shell: Dashboard, Directory, Chat, Maintenance, Settings tabs
11. **RichTextRenderer spike:** Attempt to render one real TipTap JSON content item in React Native. Write outcome as a comment in the M3 PR. If feasible: plan shared renderer. If not: plan per-app renderers consuming shared JSON types.
12. Verify one end-to-end tRPC call from mobile to `apps/web` API succeeds with correct tenant context

**Done criteria:** Mobile app boots on iOS simulator. Auth flow completes. One tRPC query returns tenant-scoped data. RichTextRenderer spike result documented.

---

### M4 — Mobile Features (Week 8–24, waves)

Feature waves follow the structure in `MOBILE_MONOREPO.md §Phase 6`. Each wave produces a GSD phase plan (`phase-m4-wave1-core`, etc.) before execution begins.

**Wave 1 — Core (Week 8–10):** Auth screens (already done in M3), dashboard home, notifications, real-time chat.

**Wave 2 — Services (Week 10–14):** Directory (with `UnifiedResidentCard` ported to `apps/expo/src/entities/directory/ui/`), Maintenance requests, Content (news/articles), Resources.

**Wave 3 — Community (Week 14–16):** Events, Bookings, Surveys, Groups.

**Wave 4 — Commerce (Week 16–18):** Marketplace, Provider billing.

**Wave 5 — Advanced (Week 18–20):** Admin dashboards, Disputes, Merits, Competitions, dWallet, Achievements.

**Per-wave entity UI porting pattern:**
For each domain in the wave, the agent must:

1. Identify entity-level display components in `apps/web/src/entities/<domain>/ui/`
2. Rebuild them in `apps/expo/src/entities/<domain>/ui/` using `@soralia/ui` primitives and NativeWind
3. Do not move or copy web entity UI — rebuild from scratch for the native context

---

## 8. Package Dependency Graph (Canonical)

```
@soralia/shared          ← no deps (pure types/utils/schemas/i18n)
      ↑
@soralia/db              ← depends on: shared
      ↑
@soralia/server          ← depends on: db, shared  [server-only — never in mobile]
      ↑
@soralia/auth            ← depends on: db, shared, server
      ↑
@soralia/api             ← depends on: auth, db, shared
      ↑
@soralia/analytics       ← depends on: shared
@soralia/ui              ← depends on: shared (types only)

@apps/web                ← depends on: api, auth, db, shared, server, ui, analytics
@apps/expo               ← depends on: shared, ui, analytics  [HTTP client only — no db/server/auth]
```

**Enforcement rules:**

- `@soralia/shared`, `@soralia/ui`, `@soralia/analytics` must never import `server-only`
- `@soralia/db`, `@soralia/server`, `@soralia/auth`, `@soralia/api` must never be imported by `apps/expo`
- ESLint `no-restricted-imports` must enforce these boundaries in CI

---

## 9. What IS and IS NOT Shared

### Shared (in `packages/`)

| Package              | Contents                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@soralia/shared`    | TypeScript interfaces, Zod schemas, constants (Role enums, status codes, API endpoint strings), pure utility functions, i18n JSON files                          |
| `@soralia/db`        | Drizzle table definitions (264 files), table relations, enum definitions                                                                                         |
| `@soralia/api`       | tRPC procedure definitions, `appRouter`, `AppRouter` type, auth/rate-limit middleware (framework-agnostic)                                                       |
| `@soralia/auth`      | Better Auth server config, Drizzle adapter, Session/User/Account types                                                                                           |
| `@soralia/ui`        | Button, Input, Text, View, ScrollView, SafeAreaView, Modal, Card, LoadingSpinner, ErrorBoundary, Toast, FormField, EmptyState — NativeWind-based, no server deps |
| `@soralia/analytics` | `identify`, `track`, `screen`, `group` API; platform adapters (PostHog web + PostHog RN)                                                                         |
| `@soralia/server`    | DB client (Drizzle init + RLS), email (Resend), storage (S3), billing, rate limiting, AI quota utilities                                                         |

### Not Shared (per-app)

| Concern                   | Web                           | Mobile                                                |
| ------------------------- | ----------------------------- | ----------------------------------------------------- |
| Routing                   | Next.js App Router            | Expo Router                                           |
| Auth client               | HTTP-only cookies             | SecureStore + cookie forwarding                       |
| Rich text editor          | TipTap                        | react-native-pell-rich-editor                         |
| Rich text renderer        | TipTap JSON → HTML            | TipTap JSON → native Text components (spike required) |
| Maps                      | react-leaflet                 | react-native-maps                                     |
| Drag and drop             | dnd-kit                       | react-native-gesture-handler                          |
| CAPTCHA                   | Cloudflare Turnstile          | Not applicable                                        |
| File upload               | `<input type="file">`         | expo-image-picker                                     |
| Emoji picker              | emoji-mart                    | platform-specific                                     |
| Navigation shell          | Header + sidebar + footer     | Tab navigator + stack headers                         |
| Push notifications        | Not applicable                | expo-notifications                                    |
| Biometrics                | Not applicable                | expo-local-authentication                             |
| Camera                    | Not applicable                | expo-camera                                           |
| Entity display components | `apps/web/src/entities/*/ui/` | `apps/expo/src/entities/*/ui/` (rebuilt)              |

---

## 10. tRPC Coverage Prerequisite (M0 Gate)

**Monorepo M0 must NOT start until Wave 1–2 tRPC coverage is complete.**

Current state: tRPC covers identity + competitions (2 of 40+ domains). BD issue `fpc` tracks tRPC expansion.

**Minimum bar for M0 gate:**

| Wave              | Domains                                        | Required before M0     |
| ----------------- | ---------------------------------------------- | ---------------------- |
| Wave 1 — Core     | Auth, Chat, Notifications                      | All three              |
| Wave 2 — Services | Directory, Maintenance, Content, Resources     | All four               |
| Wave 3+           | Events, Bookings, Surveys, Groups, Admin, etc. | Can land post-monorepo |

Scope `fpc` to these 7 domains. All other domains can migrate from REST incrementally post-M3.

---

## 11. Risk Register

| Risk                                                    | Severity   | Phase | Mitigation                                                                                        |
| ------------------------------------------------------- | ---------- | ----- | ------------------------------------------------------------------------------------------------- |
| Tenant context not resolved on mobile                   | Critical   | M3    | GATE G-1 — resolve before M3 starts                                                               |
| Drizzle generator cross-package output fails            | High       | M1-B  | GATE G-2 — spike first, fallback is CI-enforced copy script                                       |
| SDK version mismatch (NativeWind v5 compat)             | High       | M0    | GATE G-3 — pin SDK before scaffold                                                                |
| Steiger violations after M2 (workspace imports)         | High       | M1-G  | Update steiger.config.js in M1 before M2                                                          |
| `prod-ca-2021.crt` path reference breaks post-M2        | Medium     | M2    | Explicit task in M2 list (§7 task 14)                                                             |
| RichTextRenderer unshearable (custom TipTap extensions) | Medium     | M3    | Spike in M3, accept per-app fallback                                                              |
| Solito compatibility friction with Expo Router          | Eliminated | —     | Solito removed from plan (C1)                                                                     |
| M2 conflicts from concurrent dev work                   | Medium     | M2    | 48-hour freeze (Option A)                                                                         |
| Better Auth mobile session cookie forwarding            | Medium     | M3    | Follow t3-turbo pattern; prototype in M3 auth spike                                               |
| `server-only` leaking into shared packages              | High       | M1    | ESLint `no-restricted-imports` enforced at package boundary                                       |
| FSD boundary violations with workspace imports          | Medium     | M1    | Steiger allow-list updated in M1-G                                                                |
| EAS Build failures in CI                                | Medium     | M3    | Set up EAS Build early in M3; test both platforms                                                 |
| Entity UI porting effort underestimated                 | Medium     | M4    | Scoped per-wave; each wave has entity UI rebuilds as explicit tasks                               |
| tRPC `next/headers` middleware in shared package        | Medium     | M1-C  | Middleware that uses `next/headers` stays in `apps/web/src/server/` — not moved to `@soralia/api` |

---

## 12. HOLISTIC.md Updates Required

Add to HOLISTIC.md after M0 completes:

- **`mono-01`** — Monorepo migration in progress. Until M2 merges, web app is at repo root. Agent must not run commands assuming `apps/web/` path during M0–M1.
- **`mono-02`** — Drizzle schema output path change (M1-B). Until M1-B merges and is validated, `prisma generate` still outputs to `src/db/schema/`. Do not run schema migrations during M1-B without confirming which output path is active.

Existing open items not resolved by this advisory (carry forward):

- `e0w` — Cross-tenant filter gaps
- TLS `no-verify` — secondary opportunity to fix during M2 (`prod-ca-2021.crt` move + cert path update)

---

## 13. ADR-022 — To Be Added to `docs/STEERING/ADR.md`

```markdown
## ADR-022: Mobile Monorepo Architecture — Turborepo + Expo + NativeWind

**Status:** Accepted

**Date:** 2026-06-27

### Context

The platform requires a production mobile app (iOS + Android) with resident-facing feature
parity. The existing codebase is a single-repo Next.js FSD monolith. Sharing types, Zod
schemas, tRPC procedure definitions, and UI primitives across web and mobile requires
converting to a monorepo.

The mobile app must never access the database directly. All data flows over HTTP via tRPC
to the Next.js API layer. This constraint drives the package dependency graph.

### Decision

Convert the repository to a Turborepo monorepo with pnpm workspaces. Structure:

- `apps/web` — Next.js 15 (current application, relocated from repo root)
- `apps/expo` — Expo SDK 53 (new mobile application)
- `packages/shared` — Pure TypeScript types, Zod schemas, constants, utils, i18n
- `packages/db` — Drizzle schema definitions (generated from Prisma, output here directly)
- `packages/api` — tRPC router definitions and `AppRouter` type (shared type contract)
- `packages/auth` — Better Auth server config and session types
- `packages/ui` — NativeWind-based cross-platform UI primitives
- `packages/analytics` — PostHog abstraction with platform adapters
- `packages/server` — Server-only: DB client, email, storage, billing, AI quota utilities
- `tooling/` — Shared TypeScript, ESLint, Prettier configs

Mobile framework: Expo SDK 53 (managed workflow, EAS Build, Expo Router).  
UI strategy: NativeWind v5 (reuses Tailwind class names and design tokens).  
Navigation: Expo Router on mobile (Solito not used).

**Alternatives considered:**

- **Separate repository**: Duplicate types, no type safety across platforms, divergent models
- **React Native CLI**: More control, but loses Expo managed workflow and EAS Build
- **Solito for navigation**: Removed — Expo Router v3+ handles cross-platform linking natively
- **tRPC-first without monorepo**: Mobile could consume `AppRouter` type as a published package, but requires package publishing pipeline and introduces version lag

### Consequences

**Positive:**

- End-to-end type safety from mobile client to tRPC procedures via shared `AppRouter` type
- Shared Zod schemas prevent duplicated validation logic
- Shared design tokens (Tailwind config, NativeWind) ensure visual consistency
- Single CI pipeline covers both platforms
- tRPC as the mobile API contract enforces data access discipline (no DB on device)

**Negative:**

- M2 requires a 48-hour web freeze for file relocation
- Turbo task graph adds CI complexity
- Entity-level display components must be rebuilt per platform (not shared)
- Better Auth mobile session requires explicit cookie forwarding implementation
- Drizzle schema output path change must be validated (GATE G-2)

### Related

- ADVISORY-018: Mobile Monorepo Architecture (full execution plan)
- ADR-003: Dual ORM Strategy (Drizzle output path affected by M1-B)
- ADR-011: tRPC (shared `@soralia/api` package)
- ADR-019: OpenAPI spec generation (stays in `apps/web/src/server/openapi/`)
- ADR-024: Server-only `server.ts` sub-barrels (pattern extends to `@soralia/server` package)
- BD `fpc`: tRPC expansion to Wave 1-2 domains (M0 prerequisite)
```

---

## 14. Done Criteria (Full Advisory)

- [ ] GATE G-3 resolved — Expo SDK version pinned
- [ ] BD `fpc` Wave 1-2 domains complete — M0 gate passed
- [ ] M0 merged — monorepo scaffold in place, web unaffected
- [ ] GATE G-2 resolved — Drizzle generator output path validated
- [ ] M1 merged — all shared packages extracted, CI passes, Steiger updated
- [ ] GATE G-1 resolved — tenant resolution strategy decided and implemented in `apps/web`
- [ ] M2 merged — web app at `apps/web/`, prod-ca-2021.crt moved, full quality gate passes
- [ ] M3 merged — Expo app boots, authenticates, one tRPC call succeeds, RichTextRenderer spike documented
- [ ] ⏳ ADR-022 added to `docs/STEERING/ADR.md`
- [ ] ⏳ HOLISTIC.md updated post-M0 (mono-01, mono-02 entries)
- [ ] ⏳ M4 waves planned as individual GSD phase plans before execution
