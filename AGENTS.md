# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

---

## Project Overview

**Soralia Village Community Portal** - A full-stack SPA for a residential community with 180 homes.

### Tech Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Frontend   | Next.js 14 (App Router) + Preact |
| Language   | TypeScript                       |
| Styling    | Tailwind CSS                     |
| Auth       | Stack Auth                       |
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

### Next.js

- Use App Router (src/app)
- Server components by default, "use client" only when needed
- API routes in src/app/api
- Environment variables for all secrets

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

- Protected routes check Stack Auth session
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
# Stack Auth
STACK_PUBLISHABLE_KEY=""
STACK_PROJECT_ID=""
STACK_API_KEY=""

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

---

## Dependencies

Install with:

```bash
npm install
```

Key packages:

- `@stackframe/stack-server` - Stack Auth
- `@stackframe/stack-client` - Stack Auth client
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
