# Mobile Monorepo Architecture

## Decision Context

Soralia Village needs a production mobile app (Expo / React Native) with full feature parity to the existing Next.js 15 web app. The web app is a single-repo Feature-Sliced Design (FSD) monolith — 70+ Prisma models, 264 Drizzle schema files, 24 features, 54 API route groups. To share code between platforms, the repo must become a monorepo.

### Decisions Made

| Decision             | Choice                        | Rationale                                                                          |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| Mobile feature scope | Full parity (all 24 features) | Production app — residents expect everything                                       |
| UI strategy          | NativeWind v5                 | Keeps existing Tailwind CSS classes and design tokens. t3-turbo uses this pattern. |
| FSD architecture     | Keep FSD per app              | Each app maintains its own FSD tree. Shared code goes to `packages/`.              |
| Timeline             | 3-6 months                    | Allows thorough UI rebuild and testing                                             |
| Monorepo tool        | Turborepo                     | Already on Vercel ecosystem, first-class pnpm support                              |
| Navigation           | Expo Router (file-based)      | Expo Router v3+ handles file-based routing natively; Solito not needed             |
| Mobile framework     | Expo SDK 53                   | Managed workflow, EAS Build, Expo Router, expo-notifications                       |

---

## Target Architecture

```
soralia-village/
├── apps/
│   ├── web/                    # Next.js 15 — current application
│   │   ├── src/
│   │   │   ├── app/           # App Router (pages, layouts, API routes)
│   │   │   ├── features/      # Web-only features (TipTap editor, dnd-kit, Leaflet maps)
│   │   │   ├── widgets/       # Web dashboard widgets
│   │   │   ├── entities/      # Domain slices (web server components)
│   │   │   ├── page-modules/  # Page compositions (FSD pages layer)
│   │   │   ├── shared/        # Web-only shared (server components, browser APIs)
│   │   │   └── server/        # tRPC handler, OpenAPI, webhooks, payments
│   │   ├── prisma/            # Prisma schema + migrations (source of truth)
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.cjs
│   │   ├── postcss.config.cjs
│   │   ├── components.json
│   │   └── package.json       # @soralia/web
│   │
│   └── expo/                   # Expo SDK 53
│       ├── src/
│       │   ├── app/           # Expo Router (file-based routing)
│       │   ├── features/      # Mobile-only features (push notifs, camera, biometrics)
│       │   ├── entities/      # Domain slices (mobile components)
│       │   ├── widgets/       # Mobile dashboard widgets
│       │   └── shared/        # Mobile-only shared (native APIs, gesture handlers)
│       ├── app.json
│       ├── nativewind-env.d.ts
│       └── package.json       # @soralia/expo
│
├── packages/
│   ├── shared/                 # @soralia/shared
│   │   └── src/
│   │       ├── types/         # All TypeScript interfaces (User, Tenant, Booking, etc.)
│   │       ├── schemas/       # Zod validation schemas
│   │       ├── constants/     # Role enums, status codes, API endpoints
│   │       ├── utils/         # Pure functions (formatters, calculators)
│   │       └── i18n/          # Shared translation JSON files
│   │
│   ├── db/                     # @soralia/db
│   │   └── src/
│   │       ├── schema/        # Drizzle table definitions (264 files)
│   │       ├── relations.ts   # Table relations
│   │       └── index.ts       # Barrel export
│   │
│   ├── api/                    # @soralia/api
│   │   └── src/
│   │       ├── router/        # tRPC procedure definitions
│   │       ├── middleware/     # Auth guard, rate limit middleware
│   │       ├── context.ts     # createTRPCContext type (dependencies injected)
│   │       └── index.ts       # appRouter export
│   │
│   ├── auth/                   # @soralia/auth
│   │   └── src/
│   │       ├── config.ts      # Better Auth server configuration
│   │       ├── adapter.ts     # Drizzle adapter setup
│   │       └── types.ts       # Session, User, Account types
│   │
│   ├── ui/                     # @soralia/ui
│   │   └── src/
│   │       ├── primitives/    # Button, Input, Text, View (NativeWind-based)
│   │       ├── forms/         # FormField, ErrorMessage (compatible with RHF)
│   │       ├── layout/        # Container, SafeArea, ScrollView
│   │       └── feedback/      # Toast, Loading, EmptyState
│   │
│   ├── analytics/              # @soralia/analytics
│   │   └── src/
│   │       ├── index.ts       # Shared analytics API (identify, track, screen, group)
│   │       ├── types.ts       # Event type definitions
│   │       └── adapters/      # Platform-specific: web.ts (PostHog), mobile.ts (posthog-react-native)
│   │
│   └── server/                 # @soralia/server (server-only shared code)
│       └── src/
│           ├── db/            # Drizzle client, connection pool
│           ├── email/         # Email sending (Resend)
│           ├── storage/       # S3 upload helpers
│           └── billing/       # Payment processing logic
│
├── tooling/
│   ├── typescript/
│   │   ├── base.json          # Base tsconfig (paths, strict, ESNext)
│   │   ├── nextjs.json        # Extends base + jsx-preserve + Next.js plugin
│   │   └── expo.json          # Extends base + jsx-react-native + Expo types
│   ├── eslint/
│   │   ├── base.js            # Shared ESLint rules
│   │   ├── nextjs.js          # + next/core-web-vitals
│   │   └── expo.js            # + react-native rules
│   └── prettier/
│       └── index.js           # Shared Prettier config
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json               # Root — scripts delegate to turbo
```

---

## Package Dependency Graph

```
@soralia/shared          (no deps — pure types/utils/schemas)
  ↑
@soralia/db              (depends on: shared)
  ↑
@soralia/server           (depends on: db, shared) [server-only]
  ↑
@soralia/auth             (depends on: db, shared, server)
  ↑
@soralia/api              (depends on: auth, db, shared)
  ↑
@soralia/analytics         (depends on: shared)
  ↑
@apps/web                 (depends on: api, auth, db, shared, server, ui, analytics)
@apps/expo                (depends on: shared, ui, analytics) [HTTP client to web API]
```

**Note**: `@soralia/ui` depends only on `@soralia/shared` (types) + `nativewind` + `react-native`. It does NOT depend on db/auth/server.

---

## Prerequisite: tRPC Coverage

**Monorepo M0 must NOT start until tRPC covers the mobile app's primary feature paths.**

Current state: tRPC covers 2 of 40+ domains (22 procedures: identity + competitions). REST handles ~255 route files across all other domains. The `@soralia/api` shared package — the centerpiece of the monorepo — is near-empty until BD issue `fpc` (tRPC expansion) completes.

**Minimum bar for M0 gate**:

| Mobile Wave        | Domains                                                                   | Must be tRPC before M0                               |
| ------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Wave 1 — Core      | Auth, Chat, Notifications                                                 | All                                                  |
| Wave 2 — Services  | Directory, Maintenance, Content, Resources                                | All                                                  |
| Wave 3 — Community | Events, Bookings, Surveys, Groups                                         | Best-effort (can land during M3-M4)                  |
| Wave 4†            | Marketplace, Services, Provider Billing, Disputes, dWallet, Merits, Admin | Can stay REST or migrate later (low mobile priority) |

**Rationale**: The mobile app calls the web API over HTTP. If most routes are untyped REST, the mobile team builds against `fetch()` calls and later refactors to tRPC — double work. If Wave 1-2 domains are tRPC before M0, the `@soralia/api` package has real value from day one, and the mobile app gets end-to-end type safety on the features residents use first.

**BD `fpc` scoping**: Narrow `fpc` to Wave 1-2 domains for the M0 gate (~7 entities: auth, chat, notifications, directory, maintenance, content, resources). Admin-only and Wave 4+ domains can migrate incrementally post-monorepo. This keeps `fpc` bounded and unblocks M0 sooner.

**Order of operations**:

```
Complete fpc (Wave 1-2 domains) → M0 → M1 → M2 → M3 → M4+
                                ↑
                        Only start monorepo
                        after this gate passes
```

---

## Migration Cadence & Branch Strategy

### Zero-Disruption Goal

The web app is approaching production soak. `dev` must stay deployable at all times. The migration uses short-lived GSD phase branches that merge into `dev` incrementally — no long-lived migration branch, no web freeze beyond a brief controlled window.

### Branch Timeline

```
dev ─────●───────────●────────────●─────────────●──────────────●─────────>
         │           │            │             │              │
    M0 (1wk)    M1 (2wk)     M2 (2 days)   M3 (2wk)     M4+ (ongoing)

    M0: scaffold only — adds files, touches nothing existing
    M1: extract packages — moves files, updates imports, web app still at root
    M2: move web → apps/web/ — mechanical, fast, the only disruptive phase
    M3: Expo foundation — adds apps/expo/, zero web impact
    M4+: mobile features — additive only, zero web impact
```

### Phase Impact Matrix

| Phase                     | Branch                       | Alters web app?                                           | Web works mid-phase?                   | Merge risk    | Freeze needed? |
| ------------------------- | ---------------------------- | --------------------------------------------------------- | -------------------------------------- | ------------- | -------------- |
| **M0** — Scaffold         | `phase-m0-monorepo-scaffold` | No (adds `turbo.json`, `tooling/`, stub `packages/` only) | Yes                                    | Low           | No             |
| **M1** — Extract packages | `phase-m1-extract-packages`  | Yes (import rewrites, no file moves to `apps/`)           | Yes — CI passes on branch before merge | Medium        | No             |
| **M2** — Move web app     | `phase-m2-web-move`          | Yes (`git mv` plus path rewrites)                         | Yes — CI passes on branch before merge | High but fast | Yes (48h)      |
| **M3** — Expo foundation  | `phase-m3-expo-foundation`   | No (adds `apps/expo/` only)                               | Yes                                    | Low           | No             |
| **M4+** — Mobile features | `phase-m4-wave1`, etc.       | No                                                        | Yes                                    | Low           | No             |

### M2 — The Only Disruptive Phase

M2 is the only phase where the web app structurally changes. It is 100% mechanical: `git mv`, bulk path rewrites, config updates. Estimated **1-2 days** end-to-end.

**Mitigation options (choose one before M2 starts)**:

**Option A — Brief freeze (recommended)**

1. Branch M2 off latest `dev`
2. Announce 48-hour feature freeze on `dev` (bug fixes only)
3. Execute M2: move files, rewrite imports, update configs
4. Run full CI (`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm fsd:check`)
5. Merge M2 → `dev`, unfreeze
6. Web dev resumes at full speed

**Option B — Parallel with rebase (if freeze is unacceptable)**

1. Branch M2 off `dev` at a known-good commit
2. Execute M2 on the branch while web dev continues on `dev`
3. Before merging, rebase M2 onto latest `dev`
4. All M2 conflicts are `git mv` vs. code changes — resolve by:
   - Accepting M2's moved files (`git checkout --theirs` for moves)
   - Manually re-applying any `dev` changes into the new paths (`apps/web/src/...`)
5. Run full CI, merge

**Why M2 conflicts are manageable**: M2 only moves files and rewrites import paths. It never changes logic. `git mv` is tracked natively. Conflicts from concurrent `dev` commits are limited to files that were both moved AND edited — and the resolution is always the same pattern: apply the dev edit to the file in its new location.

### Cadence During Migration

```
Week 1-2:   M0 executing — web dev normal, zero impact
Week 2-4:   M1 executing — web dev normal, small conflict risk on extracted files
            Mitigation: extract shared code during low-traffic weeks, merge M1 fast
Week 4-5:   M2 executing — 48-hour freeze (Option A) or parallel+rebase (Option B)
Week 5+:    M3+ executing — web dev back to full speed, all new work is mobile-only
            Web continues shipping features, mobile builds in parallel
```

### Branch Naming & Lifecycle

All phase branches follow the same GSD cycle:

```bash
# Create
GSD_PHASE="phase-m0-monorepo-scaffold"
git checkout -b ${GSD_PHASE} dev

# Work, commit, push
# ...

# Merge back (after CI passes)
git checkout dev
git merge ${GSD_PHASE}
git push origin dev

# Clean up
git branch -d ${GSD_PHASE}
git push origin --delete ${GSD_PHASE}
```

Phase branches are named:

- `phase-m0-monorepo-scaffold`
- `phase-m1-extract-packages`
- `phase-m2-web-move`
- `phase-m3-expo-foundation`
- `phase-m4-wave1-core`, `phase-m4-wave2-services`, etc.

### What Web Dev Does During Migration

| Migration Phase | Web Dev Activity        | Notes                                                                                                             |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Pre-M0          | Normal cadence          | No restrictions                                                                                                   |
| M0 (week 1-2)   | Normal cadence          | No file conflicts — M0 only adds new files                                                                        |
| M1 (week 2-4)   | Normal cadence          | Avoid editing files being extracted (types, schemas, tRPC routers). Coordinate on which files are mid-extraction. |
| M2 (48h)        | Bug fixes only or pause | The only freeze window. Pre-schedule around low-traffic days (e.g., Friday-Saturday or a holiday weekend).        |
| M3+ (week 5+)   | Full cadence resumed    | No restrictions. Mobile features are additive. Web ships features independently.                                  |

---

## Implementation Phases

### Phase 1: Monorepo Scaffold (M0 — Week 1-2)

**Goal**: Running monorepo skeleton with no code moved yet.

**Tasks**:

1. Install Turborepo CLI, create `turbo.json`
2. Configure `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
     - 'tooling/*'
   ```
3. Create `tooling/typescript` with `base.json`, `nextjs.json`, `expo.json` presets
4. Create `tooling/eslint` with shared configs
5. Create `tooling/prettier`
6. Create empty `apps/web`, `apps/expo`, and all `packages/*` directories with stub `package.json` files
7. Verify `pnpm install` resolves the workspace
8. Run `pnpm build`, `pnpm lint`, `pnpm typecheck` (should pass with stub packages)

**turbo.json baseline**:

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Root package.json scripts**:

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

---

### Phase 2: Extract Shared Packages (M1 — Week 2-4)

**Goal**: All shared code lives in `packages/`. Web app still works as before.

#### 2a. `@soralia/shared`

**Source directories**: `src/shared/lib/`, `src/shared/api/shared/`, `src/types/`, `src/shared/lib/i18n/`

**Moves**:

- All TypeScript interfaces and type exports from entities
- All Zod validation schemas (forms, API contracts, AI output parsers)
- Application constants (role enums, status codes, API paths, AI models)
- Pure utility functions — no side effects, no DB, no env vars, no `server-only`
- i18n translation JSON files (`src/shared/lib/i18n/locales/`)

**Does NOT move** (stays in `apps/web/src/shared/` or moves to `@soralia/server`):

- Files with `import 'server-only'`
- Files importing `next/headers`, `next/navigation`, `next/cache`
- React components (these go to `@soralia/ui` or stay per-app)
- API route handlers
- Database query functions
- Server action files

#### 2b. `@soralia/db`

**Source directory**: `src/db/schema/` (264 files)

**Moves**:

- All Drizzle table definitions
- Relation definitions
- Enum definitions
- Barrel export (`index.ts`)

**Keeps in `apps/web`**:

- Drizzle client connection (`apps/web/src/db/index.ts`)
- `drizzle.config.ts` (points to Prisma→Drizzle generator output)
- Prisma schema (`apps/web/prisma/schema.prisma`) — source of truth
- Prisma migrations (`apps/web/prisma/migrations/`)
- `prisma-generator-drizzle` configuration

**Critical path**: The Prisma→Drizzle generator currently outputs to `src/db/schema/`. It must be reconfigured to output directly to `packages/db/src/schema/` by updating the `generator drizzle` block in `apps/web/prisma/schema.prisma`:

```prisma
generator drizzle {
  provider = "prisma-generator-drizzle"
  output   = "../../packages/db/src/schema"
}
```

This eliminates the need for a post-generate copy script. Validate the output is importable by `@soralia/db` before proceeding (GATE G-2 in ADVISORY-019). If the generator does not support cross-package output reliably, escalate before continuing.

**Migration workflow after monorepo**:

```bash
# 1. Edit prisma/schema.prisma (in apps/web)
# 2. Generate migration
npx prisma migrate dev --schema=apps/web/prisma/schema.prisma
# 3. Regenerate Drizzle types → packages/db/src/schema/
npx prisma generate --schema=apps/web/prisma/schema.prisma
# 4. Verify no drift
pnpm db:check
# 5. All consumers import from @soralia/db
```

#### 2c. `@soralia/api`

**Source directory**: `src/server/routers/`

**Moves**:

- All tRPC procedure definitions (queries, mutations)
- Router composition (`appRouter`)
- Middleware (auth guard, rate limit)
- The `createTRPCContext` type signature (dependencies as parameters)

**Keeps in `apps/web`**:

- The route handler (`src/server/trpc.ts` — Next.js API route handler)
- Context factory that injects actual DB client and auth session
- OpenAPI generation (`src/server/openapi/`)

**Keeps in `apps/expo`**:

- tRPC client proxy (HTTP link to `apps/web/api/trpc`)
- React Query provider setup

**Pattern**: The package exports pure procedure definitions. Each app provides the runtime context.

```typescript
// packages/api/src/index.ts
import { createTRPCRouter } from '@trpc/server';
import { authRouter } from './router/auth';
import { chatRouter } from './router/chat';
import { maintenanceRouter } from './router/maintenance';
// ... all routers

export const appRouter = createTRPCRouter({
  auth: authRouter,
  chat: chatRouter,
  maintenance: maintenanceRouter,
  // ... all routers
});

export type AppRouter = typeof appRouter;
```

```typescript
// apps/web/src/server/trpc.ts — route handler
import { appRouter } from '@soralia/api';
import { createContext } from './context';

const handler = createNextRouteHandler({
  router: appRouter,
  createContext,
});
```

```typescript
// apps/expo/src/api/trpc.ts — client proxy
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@soralia/api';

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: 'https://app.soralia.co.za/api/trpc' })],
});
```

#### 2d. `@soralia/auth`

**Source**: Current Better Auth configuration

**Moves**:

- Better Auth server config (`betterAuth({...})`)
- Drizzle adapter configuration
- Session/User/Account type definitions

**Per-app client setup**:

| Concern          | Web                 | Mobile                                |
| ---------------- | ------------------- | ------------------------------------- |
| Session storage  | HTTP-only cookies   | Expo SecureStore                      |
| Auth state       | `useSession()` hook | Custom hook wrapping auth client      |
| Token refresh    | Automatic (cookies) | Explicit refresh via tRPC             |
| Route protection | Next.js middleware  | Expo Router redirect in `_layout.tsx` |
| OAuth            | Browser redirect    | `expo-auth-session` + WebBrowser      |

**Mobile auth gotcha**: Better Auth uses HTTP-only cookies for sessions. On Expo, cookies must be forwarded manually:

```typescript
// apps/expo/src/api/trpc.ts — cookie forwarding
import { authClient } from '@soralia/auth/client';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        const cookies = authClient.getCookie();
        return cookies ? { Cookie: cookies } : {};
      },
    }),
  ],
});
```

#### 2e. `@soralia/server`

**New package** — for server-only shared code that can't go into `@soralia/shared`.

**Contents**:

- Drizzle client initialization (connection pool, Supabase config)
- Email sending (Resend client, templates)
- S3/Storage helpers (bucket uploads)
- Payment processing (UCP integration)
- Rate limiting (Redis client)
- AI pool utilities (quota checking — `checkQuota`, `recordUsage`)
- Varlock integration

**Why separate**: These modules use `server-only`, read environment variables, and access infrastructure (DB, Redis, S3). The mobile app never executes this code — it calls the web API over HTTP.

---

### Phase 3: Web App Relocate (M2 — Week 4-5, ~48h mechanical)

**Goal**: Current codebase moved to `apps/web/`. All imports point to workspace packages. Everything builds.

**Tasks**:

1. Move `src/`, `public/`, `next.config.mjs`, `tailwind.config.cjs`, `postcss.config.cjs`, `components.json` into `apps/web/`
2. Move `prisma/` into `apps/web/`
3. Move `drizzle/`, `drizzle.config.ts` into `apps/web/`
4. Relocate `scripts/` to root or `apps/web/scripts/` (seed scripts, maintenance)
5. Move `e2e/` to `apps/web/e2e/`
6. Move `mail/` to `apps/web/mail/`
7. Move `supabase/` to `apps/web/supabase/`
8. Update `vitest.config.ts` and `playwright.config.ts` in `apps/web/`
9. Update `steiger.config.js` — scope to `apps/web/src/`
10. Update all `tsconfig.json` path aliases to reference workspace packages
11. Bulk-replace imports:
    - `@entities/tenant/server` imports → add `@soralia/shared` for types
    - `@schema/*` imports → `@soralia/db`
    - `@server/*` imports → `@soralia/api`
    - `src/shared/lib/constants` → `@soralia/shared/constants`
12. Reconfigure `prisma-generator-drizzle` to output directly to `packages/db/src/schema/` (see §2b Critical Path)
13. Update `drizzle.config.ts` to reference new output path
14. Move `prod-ca-2021.crt` to `apps/web/` and update any env var or config referencing it
15. Verify quality gates: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm fsd:check`

**Expected import breakage**: ~200-400 import path changes across the codebase. Most can be automated with a find-and-replace script. The FSD layer rules (Steiger + ESLint boundaries) need updating to allow workspace package imports from within FSD layers.

**FSD boundaries update**: Workspace packages (`@soralia/*`) must be added to the allowed import list for all FSD layers. They sit outside the FSD tree — conceptually "below" the shared layer.

---

### Phase 4: Expo App Foundation (M3 — Week 5-8)

**Goal**: Mobile app boots, has auth, navigation, and API connectivity.

**Tasks**:

1. Scaffold Expo app:
   ```bash
   npx create-expo-app@latest apps/expo --template blank-typescript
   ```
2. Install and configure Expo Router (file-based routing)
3. Install NativeWind v5, create `nativewind-env.d.ts`, configure Metro
4. Share the Tailwind config from `apps/web`:
   ```javascript
   // apps/expo/tailwind.config.js
   const webConfig = require('../../apps/web/tailwind.config.cjs');
   module.exports = {
     ...webConfig,
     content: ['./src/**/*.{ts,tsx}'],
   };
   ```
5. Wire up tRPC client → `@soralia/api` types
6. Wire up Better Auth client with Expo SecureStore
7. Build auth screens: login, register, forgot password, OTP, email verification
8. Build app shell: tab navigator (Dashboard, Directory, Chat, Maintenance, Settings)
9. **RichTextRenderer spike:** Attempt to render one real TipTap JSON content item in React Native. Write outcome as a comment in the M3 PR. If feasible: plan shared renderer. If not: plan per-app renderers consuming shared JSON types.
10. Create route mapping table

**Route mapping (web → mobile)**:

| Web Route (Next.js App Router) | Mobile Route (Expo Router)                 |
| ------------------------------ | ------------------------------------------ |
| `/` (platform home)            | Not on mobile (platform admin is web-only) |
| `/dashboard`                   | `/(tabs)/dashboard`                        |
| `/dashboard/chat`              | `/(tabs)/chat`                             |
| `/directory`                   | `/(tabs)/directory`                        |
| `/maintenance`                 | `/(tabs)/maintenance`                      |
| `/bookings`                    | `/bookings` (stack screen)                 |
| `/bookings/new`                | `/bookings/new`                            |
| `/events`                      | `/events`                                  |
| `/events/[slug]`               | `/events/[slug]`                           |
| `/surveys`                     | `/surveys`                                 |
| `/settings`                    | `/settings`                                |
| `/admin/*`                     | `/admin/*`                                 |
| `/invite`                      | `/invite`                                  |
| `/member/[id]`                 | `/member/[id]`                             |
| `/content/news`                | `/news`                                    |
| `/content/resources`           | `/resources`                               |
| `/groups`                      | `/groups`                                  |
| `/marketplace`                 | `/marketplace`                             |
| `/disputes`                    | `/disputes`                                |

---

### Phase 5: UI Component Layer (M4a — Week 8-12)

**Goal**: `@soralia/ui` exports a NativeWind-based component library. Both apps use consistent primitives.

#### Current Component Inventory (`src/shared/ui/`)

Total: ~35 components. Categorized by portability:

##### Directly Portable (same API, different primitives)

| Component           | Web Implementation            | Mobile Replacement                                   |
| ------------------- | ----------------------------- | ---------------------------------------------------- |
| Button              | `<button>` + Tailwind         | `<Pressable>` + NativeWind                           |
| Input / Textarea    | `<input>` / `<textarea>`      | `<TextInput>` (single-line and multiline)            |
| Select              | `<select>`                    | Custom bottom sheet or `@react-native-picker/picker` |
| Checkbox / Switch   | `<input type="checkbox">`     | `<Switch>` (React Native)                            |
| Label               | `<label>`                     | `<Text>`                                             |
| LoadingSpinner      | CSS animation `<div>`         | `<ActivityIndicator>`                                |
| LoadingSkeleton     | Animated placeholder `<div>`s | Animated placeholder `<View>`s                       |
| LoadingCard         | Card skeleton                 | Same structure, native primitives                    |
| LoadingButton       | Button with spinner           | Pressable with ActivityIndicator                     |
| ErrorBoundary       | React Error Boundary class    | Same class component (platform agnostic)             |
| Modal (base)        | `<dialog>` or portal          | `<Modal>` (React Native)                             |
| Tooltip             | CSS `:hover` + position       | Custom tooltip with `onPress` or `onLongPress`       |
| Accordion           | CSS transition + `useState`   | `<Animated.View>` + `useState`                       |
| TagCloud / TagInput | Flex wrap                     | Flex wrap (RecyclerListView for performance)         |
| Pagination          | `<button>` row                | Touchable page indicators or infinite scroll         |
| Breadcrumbs         | `<ol>` list                   | Horizontal scrollable with `onPress`                 |
| PageLayout          | `<div>` container             | `<SafeAreaView>` + `<ScrollView>`                    |
| ContainerLayout     | Max-width `<div>`             | Max-width `<View>`                                   |
| SectionLayout       | Section `<div>`               | `<View>` section                                     |
| Footer              | Page footer                   | Not applicable (tab bar replaces footer nav)         |
| Header (banner)     | Page header with nav          | Stack header or custom header                        |

##### Platform-Specific (not in `@soralia/ui`)

| Component                         | Status            | Reason                                                                                                  |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| RichTextEditor (TipTap)           | Web only          | No native TipTap. Use `react-native-pell-rich-editor` or markdown editor.                               |
| RichTextRenderer (TipTap)         | M3 spike          | Render TipTap JSON → native text components. Validate feasibility before committing to shared strategy. |
| MapContent (Leaflet)              | Platform-specific | `react-leaflet` (web) vs `react-native-maps` (mobile). Wrap in platform-specific component.             |
| ImageUpload / MediaLibrary        | Platform-specific | Web: `<input type="file">`. Mobile: `expo-image-picker`. Same API surface.                              |
| EmojiMartPicker / FrimoussePicker | Platform-specific | Web: emoji-mart. Mobile: `@react-native-emoji-picker` or custom.                                        |
| MobileMenu                        | Mobile only       | Replaced by tab navigator + drawer on mobile                                                            |
| Turnstile (Cloudflare)            | Web only          | CAPTCHA. Use invisible Turnstile. Skip or use alternative on native.                                    |
| PromoBanner / PromoIllustration   | Shared            | Static content, easy to port                                                                            |
| PrimaryCTA                        | Shared            | Standard button composition                                                                             |
| PageCTA                           | Shared            | Standard call-to-action block                                                                           |
| LanguageSwitcher                  | Shared            | Dropdown/bottom sheet for language selection                                                            |
| Honeypot                          | Web only          | Anti-spam measure. Not needed on mobile (app is trusted).                                               |
| FontFamily / FontSize             | Shared            | Rendering helpers — platform-agnostic logic                                                             |

#### Build Strategy

**Step 1**: Export the ~15 most-used primitives (Button, Input, Text, View, ScrollView, SafeAreaView, Modal, LoadingSpinner, ErrorBoundary).

**Step 2**: Build composite components (FormField, Card, ListItem, EmptyState, Toast).

**Step 3**: Add feedback components (SuccessMessage, ErrorMessage, InfoBanner).

**Step 4**: For complex platform-specific components, build a shared interface in `@soralia/ui` and implement platform versions in each app's `shared/ui/`.

**`@soralia/ui` packaging**:

```json
// packages/ui/package.json
{
  "name": "@soralia/ui",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "peerDependencies": {
    "react": "*",
    "react-native": "*",
    "nativewind": "*"
  },
  "dependencies": {
    "@soralia/shared": "workspace:*"
  }
}
```

**Example primitive**:

```tsx
// packages/ui/src/primitives/Button.tsx
import { Pressable, Text, type PressableProps } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-soralia-primary active:bg-lapis-deep',
  secondary: 'bg-vellum active:bg-soralia-light',
  outline: 'border border-soralia-primary bg-transparent',
  ghost: 'bg-transparent',
  destructive: 'bg-red-600 active:bg-red-700',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={`
        rounded-lg items-center justify-center
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled || loading ? 'opacity-50' : ''}
        ${className ?? ''}
      `}
      disabled={disabled || loading}
      {...props}
    >
      <Text
        className={`
          font-medium text-center
          ${variant === 'primary' || variant === 'destructive' ? 'text-white' : 'text-soralia-primary'}
        `}
      >
        {loading ? 'Loading...' : children}
      </Text>
    </Pressable>
  );
}
```

---

### Phase 6: Feature Implementation (M4b — Week 10-22)

**Priority by resident impact**:

#### Wave 1 — Core Experience (Week 10-12)

| Feature       | Scope                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Auth          | Login, register, forgot password, OTP, email verification, session management |
| Dashboard     | User-specific dashboard with key cards and quick actions                      |
| Chat          | Real-time messaging (Supabase Realtime), conversation list, message compose   |
| Notifications | Notification list, mark read, deep link from notification to content          |

**Entity UI port:** `@entities/chat/ui/` → rebuild `ChatMessage`, `TypingIndicator`, `OnlineIndicator` in `apps/expo/src/entities/chat/ui/`.

#### Wave 2 — Essential Services (Week 12-14)

| Feature      | Scope                                                      |
| ------------ | ---------------------------------------------------------- |
| Directory    | Resident directory, search, profile view, contact          |
| Maintenance  | Create/view requests, status tracking, photo upload, notes |
| Content/News | News feed, articles, announcements                         |
| Resources    | Community resource library with search and categories      |

**Entity UI port:** Rebuild `UnifiedResidentCard`, `AchievementBadgeGrid` (directory), `MaintenanceCard`, `PriorityBadge`, `StatusBadge` (maintenance), `ServiceCard`, `ReviewStars`, `PricingDisplay` (services) in `apps/expo/src/entities/<domain>/ui/`. See ADVISORY-019 §C6 for full entity inventory.

#### Wave 3 — Community Engagement (Week 14-16)

| Feature  | Scope                                                       |
| -------- | ----------------------------------------------------------- |
| Events   | Event calendar, RSVP, event details                         |
| Bookings | Facility booking calendar, availability check, book, cancel |
| Surveys  | Take surveys, view results                                  |
| Groups   | Group list, join/leave, group chat                          |

**Entity UI port:** Rebuild `BookingCard`, `StatusBadge` (bookings) in `apps/expo/src/entities/booking/ui/`.

#### Wave 4 — Commerce & Services (Week 16-18)

| Feature          | Scope                                           |
| ---------------- | ----------------------------------------------- |
| Marketplace      | Browse listings, create listing, message seller |
| Services         | Browse providers, book service, reviews         |
| Provider Billing | Subscription management, invoices               |

#### Wave 5 — Advanced Features (Week 18-20)

| Feature          | Scope                                               |
| ---------------- | --------------------------------------------------- |
| Admin Dashboards | Usage stats, member management, moderation          |
| Disputes         | File dispute, track case, submit evidence, messages |
| Merits           | View merits, earn/spend                             |
| Competitions     | Enter competitions, vote                            |
| dWallet          | Data wallet, consent management                     |
| Achievements     | View achievements, track progress                   |

**Entity UI port:** Rebuild `StandingBadge` (merits) in `apps/expo/src/entities/merit/ui/`.

**Feature implementation pattern** (same for every feature):

1. Build screen(s) in `apps/expo/src/features/<name>/ui/`
2. Use `@soralia/api` tRPC procedures for all data fetching/mutations
3. Use `@soralia/ui` components for UI primitives
4. Use Expo Router `Link` for cross-screen navigation
5. Add routes to Expo Router in `apps/expo/src/app/`
6. Register feature flag gate (if applicable)
7. Test against staging API

---

### Phase 7: Native Capabilities (M4c — Week 12-18)

| Capability            | Library                                         | Priority | Notes                                     |
| --------------------- | ----------------------------------------------- | -------- | ----------------------------------------- |
| Push notifications    | `expo-notifications` + FCM/APNs                 | High     | Needs server-side push service in web app |
| Deep linking          | Expo Router built-in                            | High     | Universal links for email/auth redirects  |
| Camera / Photo picker | `expo-image-picker`                             | High     | Maintenance photos, profile pictures      |
| Biometric auth        | `expo-local-authentication`                     | Medium   | FaceID / fingerprint for login            |
| Haptic feedback       | `expo-haptics`                                  | Low      | Button presses, success/error states      |
| Background fetch      | `expo-background-fetch`                         | Low      | Pre-load notifications                    |
| Offline support       | `@tanstack/query-persist-client` + AsyncStorage | Medium   | Cache tRPC responses                      |
| Share sheet           | `expo-sharing` / React Native Share             | Low      | Share events, listings                    |
| In-app purchases      | Not needed (free app for residents)             | —        | —                                         |

**Push notification server integration (Expo Push API)**:

- Web app gains a new endpoint: `POST /api/notifications/push` that calls `https://exp.host/--/api/v2/push/send`
- Store Expo push tokens in `UserDevice` table alongside existing device records
- Trigger push from server-side notification creation (chat messages, maintenance updates, etc.)
- Push token lifecycle: register on app launch → send to server → server validates with Expo → remove on 401 (invalid token)
- Server handles chunking for broadcast notifications (Expo allows 100 devices per push request)

---

### Phase 8: Quality & Ship (M4d — Week 20-24)

#### Testing Strategy

| Layer             | Tool                         | Scope                                        |
| ----------------- | ---------------------------- | -------------------------------------------- |
| Unit tests        | Vitest                       | `packages/*`, utility functions in both apps |
| Component tests   | React Native Testing Library | `@soralia/ui` components                     |
| Integration tests | Vitest + MSW                 | tRPC procedures, auth flows                  |
| E2E (web)         | Playwright                   | Critical user journeys                       |
| E2E (mobile)      | Maestro or Detox             | Critical user journeys                       |
| Visual regression | Percy or Chromatic           | UI components                                |

#### Performance

- Bundle analysis: `expo-analyzer` or `react-native-bundle-visualizer`
- Image optimization: Serve via Supabase Storage transforms or Cloudinary
- List virtualization: `FlashList` from `@shopify/flash-list` for all scrollable lists
- Lazy loading: `React.lazy()` + `Suspense` for non-critical screens
- Memory: Monitor with Flipper or React DevTools

#### CI/CD

```yaml
# .github/workflows/ci.yml — expanded for monorepo
jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm turbo run lint typecheck build --filter=@soralia/web
      - run: pnpm turbo run test --filter=@soralia/web

  expo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm turbo run lint typecheck --filter=@soralia/expo
      # EAS Build triggers on main branch push

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm turbo run test:e2e --filter=@soralia/web
```

#### App Store Submission

| Store             | Build                                               | Submission                            |
| ----------------- | --------------------------------------------------- | ------------------------------------- |
| Apple App Store   | `eas build --platform ios --profile production`     | TestFlight → App Store Connect review |
| Google Play Store | `eas build --platform android --profile production` | Internal track → Production release   |

**Pre-submission checklist**:

- [ ] ⏳ Privacy policy URL (already on web)
- [ ] ⏳ Terms of service (already on web)
- [ ] ⏳ App icon (1024x1024 + all required sizes)
- [ ] ⏳ Screenshots (6.7" iPhone + 7" tablet for iOS; phone + tablet for Android)
- [ ] ⏳ Data collection disclosure (App Store Connect / Play Console)
- [ ] ⏳ Encryption compliance (App Store: export compliance; if using HTTPS only, exempt)
- [ ] ⏳ Age rating questionnaire
- [ ] ⏳ Beta testing group (TestFlight external testers / Play Store internal testers)

---

## Shared vs Per-App Code Summary

### What IS shared (in `packages/`)

| Package              | Contents                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| `@soralia/shared`    | Types, Zod schemas, constants, pure utilities, i18n JSON                         |
| `@soralia/db`        | Drizzle schema definitions, relations, enums                                     |
| `@soralia/api`       | tRPC router, procedure definitions, middleware                                   |
| `@soralia/auth`      | Better Auth server config, adapter, session types                                |
| `@soralia/ui`        | Button, Input, Text, View, Modal, FormField, Loading, ErrorBoundary, Toast, Card |
| `@soralia/analytics` | Shared PostHog abstraction — identify, track, screen, group                      |
| `@soralia/server`    | DB client, email client, storage helpers, payment logic, rate limiter            |

### What is NOT shared (per-app)

| Concern            | Web (`apps/web`)          | Mobile (`apps/expo`)            |
| ------------------ | ------------------------- | ------------------------------- |
| Routing            | Next.js App Router        | Expo Router                     |
| Auth client        | HTTP-only cookies         | SecureStore + cookie forwarding |
| API handler        | Next.js route handler     | HTTP client to web              |
| Rich text editor   | TipTap                    | react-native-pell-rich-editor   |
| Maps               | Leaflet / react-leaflet   | react-native-maps               |
| Drag and drop      | dnd-kit                   | react-native-gesture-handler    |
| CAPTCHA            | Cloudflare Turnstile      | Not applicable                  |
| Navigation shell   | Header + sidebar + footer | Tab navigator + stack headers   |
| File upload        | `<input type="file">`     | expo-image-picker               |
| Emoji picker       | emoji-mart                | @react-native-emoji-picker      |
| Push notifications | Not applicable            | expo-notifications              |
| Biometrics         | Not applicable            | expo-local-authentication       |
| Camera             | Not applicable            | expo-camera / expo-image-picker |
| Deep linking       | Standard URLs             | Universal links / app scheme    |
| Offline            | Not implemented           | AsyncStorage + query persist    |

### Shared architectural patterns (code not in packages, but same pattern used)

- tRPC query/mutation patterns
- React Hook Form + Zod validation
- TanStack Query for server state
- Zustand for client state
- FSD layer structure per app
- Supabase Realtime for live updates

---

## Migration Risks & Mitigations

| Risk                                                 | Severity | Mitigation                                                                                                      |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| Prisma→Drizzle generator breaks with new output path | High     | Test thoroughly in Phase 2. Add fallback copy script.                                                           |
| `server-only` leakage into shared packages           | High     | Audit all moved files. Add ESLint rule: shared packages cannot import `server-only`.                            |
| FSD boundary rules break with workspace imports      | Medium   | Update Steiger + ESLint configs in Phase 3. Add workspace packages to allowed patterns.                         |
| Better Auth mobile session handling                  | Medium   | Prototype auth flow in Phase 4 before building all features. Follow t3-turbo pattern.                           |
| NativeWind v5 breaking changes                       | Medium   | Pin NativeWind version. v5 is relatively new. Monitor releases.                                                 |
| Entity display components need per-platform rebuilds | Medium   | Not shared — each app builds its own entity UI components using `@soralia/ui` primitives. See ADVISORY-019 §C6. |
| tRPC middleware needs refactoring                    | Medium   | Some middleware uses `next/headers` — these stay in `apps/web`, not in `@soralia/api`.                          |
| Team context switching between platforms             | Medium   | Phase structure isolates concerns. Web devs keep working on web; mobile devs on mobile.                         |
| Deployment configuration drift                       | Low      | Use shared tooling configs. Test CI pipeline in Phase 1.                                                        |
| EAS Build failures in CI                             | Medium   | Set up EAS Build early (Phase 4). Test both iOS and Android builds.                                             |

> **NOTE:** This document has been updated per ADVISORY-019 (2026-06-27), which supersedes this planning document. See ADVISORY-019 for the canonical architecture decisions, decision gates (G-1 through G-3), pre-execution discovery checklists, and the detailed phase plan with explicit done criteria. The corrections in §4 of ADVISORY-019 have been applied here; the advisory remains authoritative.

---

## Dependency Changes

### New Dependencies (to add)

```
# Root
turbo                    # Build orchestration

# @soralia/ui
nativewind               # Tailwind for React Native
react-native             # (peer dep)

# @apps/expo
expo                     # SDK 53 (pin — see ADVISORY-019 G-3)
expo-router              # ~4
expo-secure-store        # Auth token storage
expo-notifications       # Push notifications
expo-image-picker        # Camera / photo upload
expo-local-authentication # Biometric auth
expo-haptics             # Haptic feedback
@shopify/flash-list      # High-performance lists
react-native-maps        # Map component (per-platform, not in @soralia/ui)
react-native-pell-rich-editor # Rich text editor (mobile)
react-native-reanimated  # Animations (NativeWind dep)
react-native-gesture-handler # Gestures (navigation dep)
react-native-safe-area-context # Safe area insets
react-native-screens     # Native screen containers
@tanstack/query-persist-client # Offline query cache
```

### Dependencies to Audit (may need platform-specific versions)

```
# Currently installed — verify Expo compatibility
zustand                  # Works on React Native
react-hook-form          # Works on React Native
@hookform/resolvers      # Works on React Native
zod                      # Works anywhere
i18next + react-i18next  # Works on React Native
date-fns                 # Works anywhere
superjson                # Works anywhere
```

### Dependencies That Stay Web-Only

```
# Remove from root deps? (move to apps/web/package.json)
next                     # Web only
@prisma/client           # Web only
prisma                   # Web only
prisma-generator-drizzle # Web only
drizzle-kit              # Web only
drizzle-orm              # Web only (server-side)
@anthropic-ai/sdk        # Web only (server-side AI calls)
openai                   # Web only (server-side AI calls)
resend                   # Web only (email server-side)
@aws-sdk/client-s3       # Web only (server-side storage)
ioredis                  # Web only (server-side rate limiting)
pino                     # Web only (server-side logging)
@tiptap/*                # Web only (rich text editor)
leaflet + react-leaflet  # Web only (maps)
@dnd-kit/*              # Web only (drag and drop)
@xyflow/react           # Web only (flow charts)
@flags-sdk/statsig       # Web only (feature flags — mobile uses different approach)
@posthog/next           # Web only (analytics — mobile uses posthog-react-native)
varlock                  # Web only (compliance scanning)
```

---

## Resolved Decisions

1. **Prisma → Drizzle generator output path**: Update `generator drizzle` in `schema.prisma` to output directly to `../../packages/db/src/schema`. Validate via GATE G-2 before proceeding. If the generator does not support cross-package output, fall back to a CI-enforced copy script with schema drift check.

2. **Push notification server**: Expo Push API. Web app (`apps/web`) gains a push notification service that calls Expo's push API directly. Push tokens stored in `UserDevice` table.

3. **Rich text on mobile**: `react-native-pell-rich-editor`, a WYSIWYG editor compatible with React Native. Added to mobile dependencies.

4. **Map component**: Accept different implementations per platform — Leaflet (`react-leaflet`) on web, `react-native-maps` on mobile. No shared map abstraction in `@soralia/ui`. Each app owns its map rendering.

5. **Feature flags on mobile**: Deferred to M3 planning. Statsig has a React Native SDK. Decision on shared vs separate flag sets deferred per ADVISORY-019.

6. **Analytics on mobile**: Shared analytics abstraction. Both platforms use PostHog — `@posthog/next` on web, `posthog-react-native` on mobile. Build a thin `@soralia/analytics` package with a common API that wraps platform-specific SDKs.

7. **Database access for mobile**: Confirmed — mobile NEVER accesses the database directly. All data flows through tRPC over HTTP. The mobile app is a pure API consumer.

8. **Monorepo branch strategy**: All GSD phase branches work on the monorepo root. Phases that touch only one app still branch from and merge into the monorepo's `dev`. Per-app branches would create merge conflicts against shared packages.
