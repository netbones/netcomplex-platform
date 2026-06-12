# Agent Instructions

This project uses **pnpm** package manager

## 📋 Issue Tracking: BD vs GSD

This project uses TWO tracking systems for different purposes. Do NOT confuse them.

### BD Issues (Non-Linear Work)

Use `bd` for:

- Bug fixes
- Quick patches
- Small feature additions
- Research tasks
- Exploratory work
- Anything that doesn't fit a phase structure

```bash
bd list           # Show all issues
bd create "Title" # Create new issue
bd get <id>       # Get issue details
bd close <id>     # Close completed issue
bd sync           # Sync with git
```

**Limitations:** BD lacks validation, extended dependency tracking, and phase structure.

### GSD Phase Plans (MANDATORY)

Use GSD workflow for:

- Large architectural changes
- Multi-step migrations
- Phase-based work with dependencies
- Work requiring validation and checkpoints

```bash
/gsd-plan-phase     # Plan a phase
/gsd-discuss-phase  # Discuss phase context
/gsd-execute-phase  # Execute phase plans
/gsd-health         # Validate .planning/ directory
```

**Structure:** `.planning/` directory with ROADMAP.md, phases/, PLAN.md files.

#### Git Worktree Isolation (MANDATORY)

All GSD phase execution MUST happen inside a dedicated **git worktree** to prevent
collisions with the working tree and avoid introducing problems into working code.
Never execute a GSD phase directly in the main working directory.

This project uses **[Worktrunk](https://worktrunk.dev/)** (`wt`) to manage worktrees,
configured via `~/.config/worktrunk/config.toml`:

```toml
worktree-path = "../worktrees/{{ branch | sanitize }}"
```

The worktree directory for a phase named `phase-N-name` will be
`../worktrees/phase-N-name`. The branch name is always identical to `GSD_PHASE` —
do not rely on `sanitize` to fix a bad input. Always use lowercase kebab-case:
`phase-5-iot-monitor-schema`, never `Phase 5 IoT` or `phase-5`.

---

##### Step 0 — Pre-flight: create or resume (ALWAYS run this first)

Before doing anything else, run the pre-flight check. It determines whether to
create a fresh worktree or resume an interrupted one.

```bash
GSD_PHASE="phase-N-description"   # set this first

if wt list 2>/dev/null | grep -q "${GSD_PHASE}"; then
  # Worktree already exists — determine state
  UNMERGED=$(git log dev..${GSD_PHASE} --oneline 2>/dev/null)
  if [ -n "${UNMERGED}" ]; then
    echo "RESUME: unmerged commits found on ${GSD_PHASE} — switching into existing worktree."
    echo "${UNMERGED}"
    wt switch ${GSD_PHASE}
    # Continue from Step 3 (do NOT re-run Steps 1–2)
  else
    echo "RECREATE: branch exists but is fully merged or empty — removing and recreating."
    wt remove ${GSD_PHASE}
    git branch -d ${GSD_PHASE} 2>/dev/null || true
    # Fall through to Step 1
  fi
else
  echo "CREATE: no existing worktree found — proceeding to Step 1."
  # Fall through to Step 1
fi
```

---

##### Lifecycle A — Create (fresh phase)

```bash
# 1. Create worktree and branch, switch into it
GSD_PHASE="phase-N-description"
wt switch --create ${GSD_PHASE} --base dev

# 2. Copy environment and local config into the worktree immediately
#    Do this before running ANY commands — missing .env causes silent failures.
cp .env ../worktrees/${GSD_PHASE}/.env
# Add other local-only files here if needed (e.g. .env.local)

# 3. Run all GSD commands inside the worktree
#    Either cd into it or use the workdir parameter:
cd ../worktrees/${GSD_PHASE}
# ... execute phase steps ...
```

---

##### Lifecycle B — Resume (interrupted phase)

Use this when Step 0 pre-flight determines an existing worktree has unmerged commits.

```bash
# 1. Switch into the existing worktree (no --create)
wt switch ${GSD_PHASE}

# 2. Verify .env is present — re-copy if missing
[ -f ../worktrees/${GSD_PHASE}/.env ] || cp .env ../worktrees/${GSD_PHASE}/.env

# 3. Inspect where the prior agent left off
git log dev..${GSD_PHASE} --oneline   # see completed commits
git status                             # check for uncommitted changes

# 4. If uncommitted changes exist, they represent interrupted in-progress work.
#    Do NOT discard them. Continue from where the prior agent stopped.
#    If the state is ambiguous, create a WIP commit to checkpoint before proceeding:
git add -A && git commit -m "wip: resume ${GSD_PHASE} — state at handoff"

# 5. Continue executing remaining phase steps
#    Do NOT re-run steps already represented by commits on the branch.
```

---

##### Lifecycle C — Cleanup (phase merged)

Run cleanup only after the phase branch is confirmed merged into `dev` after using `wt merge`.

```bash
# 1. Verify merged — MANDATORY before any deletion
if ! git branch -a --merged dev | grep -q "${GSD_PHASE}"; then
  echo "ERROR: ${GSD_PHASE} is NOT merged into dev. Aborting cleanup."
  echo "Resolve: merge the branch, or explicitly abandon it (requires human sign-off)."
  exit 1
fi

# 2. Remove the worktree
wt remove ${GSD_PHASE}

# 3. Delete the branch locally and remotely
#    git branch -d (safe) will refuse to delete unmerged branches.
#    Never use -D without human sign-off.
git branch -d ${GSD_PHASE}
git push origin --delete ${GSD_PHASE}

# 4. Confirm no stale markers remain
wt list
```

---

##### Stale worktree triage

Run `wt list` at the start of any session. If you see a 🤖 marker for a phase
you did not create, use this table before touching it:

| `wt list` shows         | Unmerged commits on branch? | Action                                      |
| ----------------------- | --------------------------- | ------------------------------------------- |
| 🤖 marker, agent active | —                           | Leave it. Do not interfere.                 |
| 🤖 marker, no agent     | Yes                         | Resume via Lifecycle B above.               |
| 🤖 marker, no agent     | No                          | Safe to clean up via Lifecycle C above.     |
| 🤖 marker, no agent     | Cannot determine            | Run `git log dev..<phase> --oneline` first. |
| No marker               | Branch exists on remote     | Branch was orphaned — human triage needed.  |

**Never delete a stale worktree or branch without first checking the table above.**

---

##### Rules

- **NEVER use `git stash` in a worktree.** Stash is global to the repo and shared
  across all worktrees — a stash created in one worktree can be accidentally applied
  in another, corrupting working trees. Use WIP commits instead:
  `git commit -m "wip: <description>"` to checkpoint, `git reset HEAD~1` to undo.
- **One worktree per phase.** Never reuse a worktree across phases.
- **Never work in the main repo directory** during a GSD phase. Always `cd` into
  `../worktrees/${GSD_PHASE}` or use the workdir parameter.
- **Copy `.env` immediately** after creating or resuming a worktree, before any
  commands that could read environment variables.
- **Run quality gates inside the worktree** before merging back to `dev`.
- **Never delete a worktree directory manually.** Always use `wt remove`.
- **Never delete `dev`, `main`, or any non-phase branch.** Cleanup only applies to
  the `${GSD_PHASE}` branch. If a phase accidentally targets a protected branch,
  abort and reset immediately.
- **Never use `git branch -D`** (force delete) without human sign-off and
  confirmation that `git branch -a --merged dev` lists the branch.

### Stash Ownership Protocol (Required)

`git stash` is global and has no scope. Stashes outlive sessions, worktrees, and
branches — an orphan stash is invisible noise. **Every stash MUST carry an `owner=`
field in its message** so a human (or another agent) can resolve it later.

**Required message format:**

```bash
git stash push -m "owner=<id>:<intent>:<expiry>"
```

| Field      | Required | Meaning                                                                                   |
| ---------- | -------- | ----------------------------------------------------------------------------------------- |
| `owner=`   | yes      | Agent id (e.g., `claude`, `claude/abc123`), human name, or `human:<name>`                 |
| `<intent>` | yes      | One-line description — what work is parked and why                                        |
| `<expiry>` | yes      | `session-end` (drop before next session), `manual` (keep until reviewed), or `YYYY-MM-DD` |

**Examples:**

```bash
git stash push -m "owner=claude:phase-48-preflight stash:session-end"
git stash push -m "owner=claude:hotfix-WIP for BD-1234:manual"
git stash push -m "owner=human:marcus:experiment on tailwind plugin:2026-07-01"
```

**Rules:**

- A stash message without `owner=` is a protocol violation. Drop or rewrite it.
- Stashes with `expiry=session-end` MUST be dropped (or promoted to a WIP commit
  on a phase branch) before ending the session.
- Stashes with `expiry=manual` MUST be reviewed at the next milestone boundary
  (`.planning/MILESTONES.md` ritual 4b) and either dropped, applied, or have their
  expiry extended.
- `git stash drop` requires the owner to have signed off (or be the same agent).
- `.husky/gsd-status-check.sh` is the integration point for a future
  `git stash list | grep -v 'owner='` warning — not yet implemented.
- **One worktree per phase** — never reuse a worktree across phases
- **Branch name must match the worktree directory name** (e.g., `phase-3-auth-migration`)
- **Copy `.env` immediately** after creating the worktree, before running any commands
- **Run quality gates inside the worktree** before merging back
- **Clean up worktrees** after the phase branch is merged and pushed: `wt remove <phase>`
- **Delete merged phase branches** (local + remote) after the worktree is removed —
  `git branch -d` and `git push origin --delete`. Never use `-D` (force) without
  verifying `git branch -a --merged dev` first.
- **NEVER delete `dev`, `main`, or any non-phase branch** from the local repo or origin.
  If a phase accidentally targets one of these, abort the merge and reset. Phase branches
  are the only branches the cleanup protocol may delete.
- **Never delete a worktree directory manually** — always use `wt remove`
- **List active worktrees with:** `wt list` — confirm no stale 🤖 markers before
  starting a new phase

### When to Use Which

| Work Type                            | Use |
| ------------------------------------ | --- |
| Fix a bug                            | BD  |
| Add a small feature                  | BD  |
| Research a library                   | BD  |
| Major migration (Auth → Better Auth) | GSD |
| Multi-phase refactor                 | GSD |
| Architecture changes                 | GSD |

**IMPORTANT:** When working on a GSD phase, close the related BD issue when the phase completes.
When opening a bd issue, update .planning/BD.md so GSD is aware of the issue.

---

## Project Overview

**Netcomplex** - A multi-tenant community management platform. **Soralia Village** is the anchor tenant (180 homes).

### Project Documentation

Project documentation lives in `docs/STEERING/`:

| Document     | Purpose                                                           |
| ------------ | ----------------------------------------------------------------- |
| **SPEC.md**  | Functional specifications - what the system does                  |
| **PRD.md**   | Product requirements - business goals and user needs              |
| **ADR.md**   | Architecture Decision Records - why we made architectural choices |
| **GUIDE.md** | Development guides and best practices                             |
| **TDD.md**   | Test-driven development workflow                                  |
| API.md       | API Governance Plan                                               |

### Tech Stack

| Layer      | Technology                                                                                                                                                                                                                                                                                    | ---------- |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Frontend   | Next.js 14 (App Router) + Preact                                                                                                                                                                                                                                                              |
| Language   | TypeScript                                                                                                                                                                                                                                                                                    |
| Styling    | Tailwind CSS                                                                                                                                                                                                                                                                                  |
| Auth       | Better Auth                                                                                                                                                                                                                                                                                   |
| Database   | PostgreSQL via Supabase                                                                                                                                                                                                                                                                       |
| ORM        | Prisma + Drizzle                                                                                                                                                                                                                                                                              |
| RLS        | `prisma/migrations/20260604000000_add_rls_policies/` — 15 tables (6 ADR-019 sensitive + 9 admin-route). Dormant until `runWithRLS` is used. See `docs/STEERING/RLS.md` for connection-role model. **Never change `DATABASE_URL` to use `app_user` directly** — that breaks Better Auth login. |
| Real-time  | Supabase Realtime (chat)                                                                                                                                                                                                                                                                      |
| State      | TanStack Query (server) + Zustand (client)                                                                                                                                                                                                                                                    |
| Forms      | React Hook Form + Zod                                                                                                                                                                                                                                                                         |
| Maps       | Leaflet + react-leaflet                                                                                                                                                                                                                                                                       |
| API        | tRPC (internal) + OpenAPI (external)                                                                                                                                                                                                                                                          |
| Commerce   | UCP & AP2                                                                                                                                                                                                                                                                                     |
| CMS Editor | TipTap                                                                                                                                                                                                                                                                                        |
| Logging    | Pino                                                                                                                                                                                                                                                                                          |
| Deployment | Vercel                                                                                                                                                                                                                                                                                        |
| Features   | Vercel Feature Flags                                                                                                                                                                                                                                                                          |

---

## Coding Standards

### TypeScript

- Use strict TypeScript, no `any`
- Prefer `interface` over `type` for object shapes
- Use generics for reusable components
- Export types that are used across modules

### React/Preact

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused
- Use custom hooks for reusable logic

---

## React Best Practices

### Component Architecture

#### Component Size & Structure

- **Max 200 lines per component** - Split larger components into smaller, focused pieces
- **Single Responsibility Principle** - Each component should do one thing well
- **Composition over inheritance** - Use composition patterns for code reuse
- **Container/Presentational pattern** - Separate business logic from UI rendering

#### Naming Conventions

- **PascalCase for components** - `UserProfile`, `DashboardWidget`
- **camelCase for instances** - `userProfile`, `dashboardWidget`
- **Descriptive names** - `LoadingSpinner` not `Spinner`
- **Suffix for variants** - `Button.tsx`, `IconButton.tsx`, `SubmitButton.tsx`

#### File Organization

```bash
components/
├── ui/              # Reusable UI components (Button, Input, Modal)
├── forms/           # Form-related components
├── layout/          # Layout components (Header, Sidebar, Footer)
├── dashboard/       # Feature-specific components
└── common/          # Shared components across features
```

#### Pages vs Widgets

In order to minimise new page creation for a feature, follow these protocols:

- Prefer widgets that can be imported to dashboards than new pages
- Refer to the WIDGETS framework in docs/
- Only create a page if it is truly necessary to unify elements such as widgets or components.

### Performance Optimization

#### Memoization

- **React.memo** for expensive components that re-render frequently
- **useMemo** for expensive computations
- **useCallback** for event handlers passed to child components
- **Avoid over-memoization** - Only memoize when necessary

#### State Management

- **useState** for local component state
- **useReducer** for complex state logic
- **TanStack Query** for server state (API data)
- **Context** sparingly, prefer prop drilling for simple cases

#### Rendering Optimization

- **Keys in lists** - Always provide stable, unique keys
- **Conditional rendering** - Use early returns to avoid unnecessary work
- **Lazy loading** - Use `React.lazy()` for code splitting
- **Image optimization** - Use Next.js Image component

### Hooks Best Practices

#### Use usehooks-ts

- **Use usehooks-ts** for common utility hooks - installed as dependency
- Prefer `useLocalStorage`, `useIsMounted`, `useDebounceValue`, etc. over custom implementations
- Check available hooks at https://usehooks-ts.com

#### Custom Hooks

- **Extract reusable logic** into custom hooks
- **Prefix with 'use'** - `useAuth`, `useLocalStorage`
- **Return objects, not arrays** for better destructuring
- **Handle cleanup** in useEffect properly

#### Effect Dependencies

- **Include all dependencies** in useEffect dependency arrays
- **Use ESLint rules** to catch missing dependencies
- **Consider useMemo/useCallback** to stabilize references

### Error Handling

#### Error Boundaries

- **Wrap major sections** with error boundaries
- **Provide fallback UI** for better user experience
- **Log errors** for debugging
- **Test error scenarios** during development

#### Async Operations

- **Handle loading states** consistently
- **Error states** with user-friendly messages
- **Retry logic** for failed requests
- **Cancellation** for component unmounting

### TypeScript Integration

#### Component Props

- **Define interfaces** for component props
- **Use generics** for flexible components
- **Optional props** with `?:` syntax
- **Discriminated unions** for variant props

#### Event Handlers

- **Proper typing** for form events, mouse events, etc.
- **Generic event types** when needed
- **Custom event types** for domain-specific events

### Preact Considerations

#### Preact vs React

- **Preact-compatible** - Use Preact-compatible libraries
- **Smaller bundle size** - Leverage Preact's efficiency
- **React compatibility layer** - Use `preact/compat` when needed

#### Preact-specific patterns

- **Preact hooks** work the same as React hooks
- **JSX pragma** may be needed in some setups
- **Component refs** work with `useRef`

### Server vs Client Components (Next.js 13+)

#### Server Components (Default)

- **Data fetching** - Perform in server components
- **No browser APIs** - Cannot use `window`, `localStorage`
- **No event handlers** - Cannot attach event listeners
- **Static by default** - Better performance

#### Client Components

- **Mark with "use client"** - Required for interactivity
- **Use sparingly** - Only when needed
- **Tree shaking** - Keep client components small

### Accessibility (a11y)

#### Semantic HTML

- **Proper heading hierarchy** - h1 → h2 → h3
- **Semantic elements** - `button`, `nav`, `main`, `aside`
- **ARIA labels** when needed
- **Focus management** for modals and dropdowns

#### Keyboard Navigation

- **Tab order** - Logical tab sequence
- **Keyboard shortcuts** - Document available shortcuts
- **Focus indicators** - Visible focus states
- **Escape handling** - Close modals with Escape key

### Testing Practices

#### Component Testing

- **Unit tests** for utility functions and hooks
- **Integration tests** for component interactions
- **Visual regression** tests for UI consistency
- **Accessibility testing** with axe-core

#### Test Organization

- **Colocate tests** with components (`Component.test.tsx`)
- **Test custom hooks** in isolation
- **Mock external dependencies** appropriately
- **Test user interactions** thoroughly

### Code Quality

#### Linting & Formatting

- **ESLint** for code quality rules
- **Prettier** for consistent formatting
- **TypeScript strict mode** enabled
- **Pre-commit hooks** for quality gates

#### Code Reviews

- **Small PRs** - Easier to review and test
- **Descriptive commit messages** - Clear what changed and why
- **Self-review** before requesting review
- **Automated checks** pass before review

### FSD Architecture (Steiger)

The project enforces Feature-Sliced Design boundaries with two complementary tools:

| Tool        | Scope                                                                                                       | Where it runs       |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| **ESLint**  | Deep imports — catches `@shared/*/*`, `@entities/*/*`, etc. (no FSD slice bypass via path)                  | Editor + pre-commit |
| **Steiger** | Layer hierarchy, public API sidestep, public API presence, slice hygiene, segment conventions, naming typos | Pre-commit + CI     |

**Commands:**

```bash
pnpm fsd:check              # Run Steiger on ./src
bash scripts/steiger-staged.sh   # Run Steiger only when FSD-relevant files are staged
```

**Configuration:**

- `steiger.config.js` at repo root — FSD rule severities + `no-public-api-sidestep` allow-list
- `eslint.config.js` — `no-restricted-imports` patterns + cross-reference comment to Steiger

**Tuning policy:**

- Rules start at `warn` when first introduced to surface debt without breaking CI.
- A rule is tightened to `error` only when the corresponding debt cluster has been
  fully closed in a Phase 44 follow-up plan.
- Baseline (582 findings) lives at `.planning/phases/44-m5a-hardening/44-01-baseline-report.txt`
  and is the source of truth for progress on FSD debt.

**Adding a sidestep (allowed import bypass):**

1. Open `steiger.config.js`.
2. Add the import to the `noPublicApiSidestep` allow-list with a justification
   linking to a BD issue (e.g. `// soralia-village-de8x: ...`).
3. Commit the BD issue ID in the comment so the sidestep is auditable.
4. Sidesteps MUST be reviewed at the milestone boundary (`.planning/MILESTONES.md`
   ritual 4b); any sidestep without a linked BD issue is a protocol violation.

**Why two tools?** ESLint gives inline editor feedback on deep imports; Steiger
gives architectural feedback (cross-slice imports, missing public APIs, dead
slices, layer typos) that ESLint cannot express. They overlap on deep imports
deliberately — belt and suspenders.

### Next.js

- Use App Router (src/app)
- Server components by default, "use client" only when needed
- API routes in src/app/api
- Environment variables for all secrets

#### Rendering Strategy Decision Tree

- **Static/ISR**: Use for content that changes infrequently (articles, directory, static pages)
- **Server Components**: Use for personalized content with caching (dashboard, user profiles)
- **Client Components**: Only for interactive features (forms, real-time updates)
- **Edge Runtime**: Consider for global APIs with low latency requirements

#### Data Fetching Patterns

- **unstable_cache**: Use for expensive operations with ISR tags
- **React cache()**: Use for client-side data with short lifecycles
- **TanStack Query**: Use for client-side state management and mutations
- **Server Actions**: Use for form submissions and data mutations

### Prisma + Drizzle

- Define all models in `prisma/schema.prisma`
- Use enums for fixed values
- Add relations with @relation
- Run `npx prisma migrate dev` to evolve the database schema (creates and applies migration)
- Run `npx prisma generate` after migration to regenerate the Drizzle schema sync
- **Query layer**: Use Drizzle via `src/lib/db.ts` for all database queries (edge-compatible)

### Migration Status & Ad-Hoc SQL

**Formal migrations (Prisma / Drizzle) are tracked by tooling — never rename files.**

Both Prisma and Drizzle maintain their own state and will break if filenames are
changed after a migration is applied:

- **Prisma** — `npx prisma migrate status` reports applied / pending / drift.
  The `_prisma_migrations` table in the database is the source of truth.
  `prisma migrate resolve --applied <name>` / `--rolled-back <name>` expects
  the directory `prisma/migrations/<timestamp>_<name>/migration.sql` to exist
  under its original name.
- **Drizzle** — `npx drizzle-kit migrate` (or read `drizzle/meta/_journal.json`)
  reports applied state. Renaming `drizzle/<number>_<name>.sql` will break
  journal lookups and cause drift on the next migrate.

**Ad-hoc SQL scripts** (one-off `.sql` files in `scripts/sql/`, `docs/sql/`,
`scripts/seed-data/`, or anywhere **not** under `prisma/migrations/` or
`drizzle/`) MAY use a `.DONE` marker once manually run:

```bash
# After running a one-off SQL against the dev DB:
mv scripts/sql/20260605-fix-stale-index.sql scripts/sql/20260605-fix-stale-index.DONE.sql
git add -A
git commit -m "chore(sql): mark 20260605-fix-stale-index as run (DONE)"
```

The `.DONE` suffix is a local convention for visibility; it is **not** understood
by any migration tool. Do not apply it to formal migrations.

### Supabase

- Use Supabase client for real-time subscriptions
- Enable realtime on Message table for chat
- Implement message pruning (30-day retention)

### Styling (Tailwind)

- Use utility classes, avoid custom CSS unless needed
- Follow existing color scheme (soralia-primary: #4F46E5)
- Mobile-first responsive design
- Use consistent spacing scale

### Forms (React Hook Form + Zod)

- Define Zod schema for validation
- Use `useForm` hook with Zod resolver
- Show validation errors inline
- Handle loading/submitting states

### ISR & Caching

#### Core Principles

- **Maximize static content**: Prefer ISR over SSR to reduce serverless invocations
- **Aggressive caching**: Use `unstable_cache` with tags for intelligent cache invalidation
- **On-demand revalidation**: Immediately update caches when data changes
- **Streaming responses**: Use Suspense for progressive loading

#### ISR Implementation Rules

- **Use `unstable_cache`** for data fetching with cache tags:

  ```typescript
  import { unstable_cache } from 'next/cache';

  export const getData = unstable_cache(async () => fetch('/api/data'), ['data-key'], {
    revalidate: 300, // 5 minutes
    tags: ['data-tag'],
  });
  ```

- **Set appropriate revalidation times**:
  - Static data (rarely changes): 10 minutes (600s)
  - User-specific data: 2-5 minutes (120-300s)
  - Real-time data: 30-60 seconds (30-60s)

- **Always use ISR tags** for cache invalidation:

  ```typescript
  import { revalidatePath } from 'next/cache';

  // In API routes after data changes
  revalidatePath('/dashboard'); // Invalidate dashboard cache
  ```

#### On-Demand Revalidation Rules

- **Import revalidation utilities**: Always use `src/lib/revalidation.ts`
- **Call revalidation after mutations**:

  ```typescript
  import { revalidateDashboard } from '@/lib/revalidation';

  // After creating data
  await prisma.item.create({...});
  revalidateDashboard(); // Immediately invalidate relevant caches
  ```

- **Use specific revalidation functions**:
  - `revalidateDashboard()` - For stats, maintenance, bookings
  - `revalidateContent()` - For articles, resources
  - `revalidateConversations()` - For messages, chat
  - `revalidateAdminChanges()` - For comprehensive admin updates

#### API Route Optimization

- **Add `maxDuration`** to prevent runaway functions:

  ```typescript
  export const maxDuration = 8; // Max 8 seconds execution
  ```

- **Use Cache-Control headers** for additional caching:

  ```typescript
  // In API routes
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
  }
  ```

#### Component Patterns

- **Use Suspense for streaming**:

  ```tsx
  <Suspense fallback={<Skeleton />}>
    <DynamicContent />
  </Suspense>
  ```

- **Implement proper loading states** with `usePageLoading` hook
- **Add error boundaries** to all major components for resilience

#### Error Boundaries

- **Wrap all major page components** with `ErrorBoundary`:

  ```tsx
  import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

  export default function Page() {
    return (
      <ErrorBoundary>
        <PageContent />
      </ErrorBoundary>
    );
  }
  ```

- **Use existing components**:
  - `LoadingSpinner` - For inline loading states
  - `LoadingSkeleton` - For content placeholders
  - `LoadingCard` - For card-specific loading
  - `LoadingButton` - For button loading states

## API Design

### REST Endpoints Pattern

```sql
GET    /api/[resource]          # List
POST   /api/[resource]          # Create
GET    /api/[resource]/[id]     # Read
PATCH  /api/[resource]/[id]    # Update
DELETE /api/[resource]/[id]    # Delete
```

### Request/Response

- Return JSON for all responses
- Use appropriate HTTP status codes
- Include error messages on failures
- Validate all inputs with Zod

### Authentication

- Protected routes check Better Auth session
- User ID available from session in API routes
- Role-based access (resident, board, admin)

---

## Database Schema Priority

1. **User** - Core user model with role
2. **MaintenanceRequest** - Request tracking
3. **Booking** - Facility reservations
4. **Event** - Community events
5. **Conversation/Message** - Chat (needs realtime)
6. **Survey/Question/Response** - Surveys
7. **Notification** - User notifications

---

## File Structure

```bash
soralia-village/
├── prisma/
│   └── schema.prisma           # Database models
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── (public)/           # Public pages
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components
│   │   ├── auth/               # Auth components
│   │   ├── directory/          # Directory components
│   │   ├── dashboard/          # Dashboard components
│   │   └── chat/               # Chat components
│   ├── lib/                    # Utilities
│   │   ├── prisma.ts           # Prisma client
│   │   ├── supabase.ts         # Supabase client
│   │   └── utils.ts            # Helper functions
│   └── types/                  # TypeScript types
├── public/                     # Static assets
├── tailwind.config.ts         # Tailwind config
├── next.config.js             # Next.js config
└── package.json
```

---

## Environment Variables

```env
# Better Auth
BETTER_AUTH_URL=""
BETTER_AUTH_SECRET=""

# Supabase
DATABASE_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# Multi-tenant Development
# Required for local development to resolve tenant context
# Set to your tenant slug (e.g., 'soralia' for Soralia Village)
LOCAL_TENANT_SLUG="soralia"

# App
NEXT_PUBLIC_VERCEL_URL=""
```

---

## Workflow Model

### Cadence & Milestone Discipline

**The project uses a milestone structure (M0–M6+) defined in `.planning/MILESTONES.md`.** Phases are grouped into milestones; each milestone has a verifiable done state. The current map:

- **M0 Foundation** — multi-tenant substrate, base modules (✅ shipped)
- **M1 Core Comm & Auth** — chat, email, schema hardening, onboarding (✅ shipped)
- **M2 Dashboard & Navigation** — focus spaces, nav, widgets, defaults (✅ shipped)
- **M3 Trust, Safety & Engagement** — admin, suspension, surveys, ticketing (✅ shipped)
- **M4 Production-Ready** — API governance, gate consolidation, i18n hydration (🟡 1/3 done)
- **M5 Anchor Tenant Launch** — audit closure, Community Merits, OTP, MyHomeSpace (📋 planning)
- **M6+ Post-Launch** — second tenant, multi-instance, plugins, event sourcing (deferred)

**Three rituals, all under 30 minutes per week:**

#### 4a. Weekly check-in (15 min, every Monday)

- Open `.planning/STATE.md`, scan for stale entries.
- Run `gsd-sdk query validate.health`. If any errors → fix in this session.
- Run `bd ready`. Pick the top 1–2 items.
- If you finished a phase last week: run `gsd-tools state complete-phase`.
- Commit STATE.md + ROADMAP.md if anything changed (single commit, no other changes).

#### 4b. Bi-weekly milestone boundary (30 min, every other Monday)

- For each phase shipped in the last 2 weeks: confirm SUMMARY exists, requirements validated, ROADMAP status = "Complete", STATE.md points to next ready item.
- If a milestone's last phase is verified: run `gsd-tools state complete-milestone` and write `.planning/retros/M{N}-retro.md`.
- Update `.planning/CADENCE.md` with the last 2 weeks' actual velocity.

#### 4c. End-of-session housekeeping (2 min, every session)

- `git status` clean
- ROADMAP status accurate for any phase completed this session
- STATE.md current position points to the _next_ ready item
- If a phase was finished: `gsd-tools state complete-phase` was called

**Status drift rule:** A phase is "Complete" in ROADMAP only when its SUMMARY.md exists and (where applicable) VERIFICATION.md exists. Run `gsd-sdk query validate.health` before committing any ROADMAP.md change. The GSD pre-commit hook enforces this.

### Task Workflow

1. **Pick up task** - `bd ready` shows unblocked tasks
2. **Start work** - `bd update <id> --status in_progress`
3. **Implement** - Write code following coding standards
4. **Test locally** - Run dev server, verify functionality
5. **Run quality gates** - Lint, typecheck, tests
6. **Commit** - Create commit with descriptive message
7. **Complete** - `bd close <id>`
8. **Push** - `git push` (REQUIRED before ending session)

### Epic Workflow

1. **Review epic** - `bd show <epic-id>` to see all child tasks
2. **Start first task** - Unblock by beginning work
3. **Iterate** - Complete tasks sequentially
4. **Update parent** - Close epic when all children done

### Session Completion (MANDATORY)

**When ending a work session, you MUST:**

1. **File issues** - Create any needed follow-up issues
2. **Run quality gates** - Tests, linters, builds (if code changed)
3. **Update issue status** - Close finished work
4. **PUSH TO REMOTE:**

```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
```

5. **Clean up** - Drop session-end stashes (see "Stash Ownership Protocol"),
   prune branches. Stashes with `expiry=manual` require owner sign-off before drop.
6. **Verify** - All changes committed AND pushed

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## Documentation Practices

### Architectural Decisions

**When making architectural decisions, ALWAYS update ADR.md:**

- **Major technology choices** (frameworks, libraries, patterns)
- **Significant refactoring** that changes system structure
- **Performance or scalability decisions**
- **Security architecture changes**
- **Breaking API changes**
- **Migration decisions** (e.g., Context → Zustand, Next.js version changes)

**ADR Requirements:**

- Use the established ADR template in `docs/STEERING/ADR.md`
- Include context, decision, alternatives considered, and consequences
- Document both positive and negative impacts
- Number ADRs sequentially (ADR-001, ADR-002, etc.)
- Commit ADR updates with code changes

**When to skip ADR:**

- Routine implementation details
- Minor configuration changes
- Bug fixes without architectural impact
- Documentation updates
- Code style or formatting changes

---

## Quality Gates

Before every commit/push, run:

```bash
# TypeScript type check
npm run typecheck

# ESLint
npm run lint

# Build (catches build errors)
npm run build
```

### ISR & Performance Checklist

Before implementing new features, ensure:

- [ ] **Data fetching uses `unstable_cache`** with appropriate tags for ISR
- [ ] **API routes include `maxDuration`** limits (3-8 seconds)
- [ ] **Mutations trigger `revalidatePath`** or use revalidation utilities
- [ ] **Components wrapped with `ErrorBoundary`** for error resilience
- [ ] **Loading states use `usePageLoading`** or `LoadingSkeleton` components
- [ ] **Static content uses ISR** (not SSR) for better performance
- [ ] **Cache-Control headers** added to API routes for additional optimization

---

## Getting Started

1. Clone repository
2. Copy `.env.example` to `.env` and fill in values
3. Run `npm install`
4. Set up Supabase database
5. Run `npx prisma db push` to create tables
6. Run `npm run dev` to start dev server

# DocHub

Use `dh update` or `dh sync "message"`.
All shared knowledge & playbook lives in `./.documents/`.
