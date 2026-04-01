# Agent Instructions

This project uses **pnpm** package manager and **bd** (beads) for issue tracking. Run `bd onboard` to get started.

---

## Project Overview

**Soralia Village Community Portal** - A full-stack SPA for a residential community with 180 homes.
Check PRD.md and SPEC.md for details.

### Tech Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Frontend   | Next.js 14 (App Router) + Preact |
| Language   | TypeScript                       |
| Styling    | Tailwind CSS                     |
| Auth       | Better Auth                      |
| Database   | PostgreSQL via Supabase          |
| ORM        | Prisma                           |
| Real-time  | Supabase Realtime (chat)         |
| State      | TanStack Query                   |
| Forms      | React Hook Form + Zod            |
| Maps       | Leaflet + react-leaflet          |
| Deployment | Vercel                           |

---

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

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

```
components/
├── ui/              # Reusable UI components (Button, Input, Modal)
├── forms/           # Form-related components
├── layout/          # Layout components (Header, Sidebar, Footer)
├── dashboard/       # Feature-specific components
└── common/          # Shared components across features
```

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

### Prisma

- Define all models in prisma/schema.prisma
- Use enums for fixed values
- Add relations with @relation
- Run `prisma generate` after schema changes

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

### ISR & Caching (Vercel Cost Optimization)

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

#### Vercel Cost Monitoring

- **Monitor usage dashboard** regularly for cost spikes
- **Set spend alerts** at 50%, 75%, and 100% of budget
- **Check function execution times** - target <5 seconds average
- **Optimize memory allocation** based on actual usage

#### Performance Budget

- **Serverless invocations**: <50% of requests should hit functions
- **Cache hit rate**: >80% for frequently accessed data
- **Build time**: <30 seconds per page
- **Bundle size**: <500KB initial load

---

## API Design

### REST Endpoints Pattern

```
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

```
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

# App
NEXT_PUBLIC_VERCEL_URL=""
```

---

## Workflow Model

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

5. **Clean up** - Clear stashes, prune branches
6. **Verify** - All changes committed AND pushed

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

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

### Vercel Cost Monitoring

- **Monitor usage dashboard** weekly for cost trends
- **Alert thresholds**: 50%, 75%, 100% of monthly budget
- **Performance targets**:
  - Function execution: <5 seconds average
  - Cache hit rate: >80%
  - Serverless invocations: <50% of total requests

---

## Dependencies

Install with:

```bash
npm install
```

Key packages:

- `@better-auth/expo` - Better Auth
- `@better-auth/expo` - Better Auth client
- `@supabase/supabase-js` - Supabase client
- `@prisma/client` - Prisma client
- `@tanstack/react-query` - Data fetching
- `react-hook-form` - Forms
- `zod` - Validation
- `leaflet` + `react-leaflet` - Maps

---

## Getting Started

1. Clone repository
2. Copy `.env.example` to `.env` and fill in values
3. Run `npm install`
4. Set up Supabase database
5. Run `npx prisma db push` to create tables
6. Run `npm run dev` to start dev server
