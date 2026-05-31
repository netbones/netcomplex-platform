# Phase 39: Competition Entry System — Context

## User Decisions

### Locked (Non-Negotiable)

1. **Three competition types with different winner mechanics:**
   - **RAFFLE/DRAW** — Admin clicks "Draw Winners" → system randomly selects X participants
   - **PHOTO CONTEST** — Users submit photo + description → Admin reviews gallery → Marks winners manually
   - **SCORE-BASED** — Admin enters/updates participant scores → Highest scores auto-win

2. **Public competition page (`/competition`):**
   - Shows cards grid of all ACTIVE competitions
   - Each card shows participant avatars (stacked)
   - Click card → navigate to `/competition/[id]` detail page

3. **Public competition detail page (`/competition/[id]`):**
   - Competition info (title, description, dates, rules, prizes)
   - Type-specific action: Join (RAFFLE), Submit Entry (PHOTO), View Scores (SCORE)
   - Participant list with avatars
   - **Dedicated winners gallery/zone** for completed competitions

4. **Admin competition list (`/admin/competitions`):**
   - Expandable rows showing participants/entries
   - Per-type administration:
     - RAFFLE: Participant list → "Draw Winners" button
     - PHOTO: Gallery of submissions → "Mark as Winner" on each
     - SCORE: Table with inline score editing → "Auto-select Winners"

5. **Winner notification:**
   - Winners must be notified via the existing Notification system
   - In-app notification when marked as winner

### Deferred (Not in Scope)

- File upload support for competition images (photo URL field only for now)
- Voting/rating system for entries
- Entry withdrawal/cancellation by user
- Public winners archive page separate from competition detail

### Claude's Discretion

- Use tRPC for new endpoints (follows API.md §6.1 + tRPC.md governance, consistent with Phase 35 direction)
- Default time `T00:00` for date-only inputs (consistent with recent date input fix)
- Winner draw uses `Math.random()` with seeded shuffle (no external RNG service needed)
- Notification title: "You won {competitionTitle}!"
- Competition type defaults to `RAFFLE` for backward compatibility with existing competitions
- `winnersCount` defaults to `1`
- Participant avatars on cards show max 5 faces with "+N more" overflow

## Governance References

- **API.md §3.1**: tRPC is canonical internal API transport
- **API.md §7**: Tenant isolation mandatory — use `ctx.tenantId` from tRPC context
- **API.md §9.2**: Actions use subpaths: `/competitions/{id}/join`
- **API.md §15.1**: Never expose raw ORM models — use DTOs/schemas
- **tRPC.md §5**: Golden rules: always `.input()`, `.output()`, `.meta({ openapi })`
- **tRPC.md §15.1**: One router per resource domain → `src/server/routers/competitions.ts`
- **tRPC.md §13.1**: Use `TRPCError` for errors

## Related Files

- `prisma/schema.prisma` — Competition model (lines 172-189)
- `src/db/schema/competitions.ts` — Drizzle schema
- `src/db/schema/competition-status-enum.ts` — Drizzle status enum
- `src/app/api/competitions/route.ts` — Existing REST CRUD (stays as-is)
- `src/app/api/competitions/[id]/route.ts` — Existing REST CRUD (stays as-is)
- `src/server/routers/index.ts` — tRPC app router (add competition router)
- `src/server/routers/identity.ts` — Reference tRPC pattern
- `src/widgets/admin/ui/CompetitionList.tsx` — Admin table (needs expandable rows)
- `src/widgets/admin/ui/CompetitionForm.tsx` — Admin form (needs type selector)
- `src/app/competition/page.tsx` — Public page (rewrite to cards)
- `src/app/(tenant)/admin/competitions/page.tsx` — Admin list page
- `src/app/api/notifications/route.ts` — Notification creation
- `src/shared/api/trpc/client.ts` — tRPC client
- `src/shared/api/trpc/server.ts` — tRPC server (protectedProcedure, adminProcedure)
