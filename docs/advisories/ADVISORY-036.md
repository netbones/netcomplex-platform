# ADVISORY-036: Useful Patterns from Tamagui Takeout

**Status:** Guidance  
**Date:** 2026-07-26  
**Audience:** Architecture, backend, and full-stack contributors  
**Related:** ADR-003 (Prisma + Drizzle), ADR-004 (FSD), ADR-011 (tRPC), ADR-017 (Property/Household), ADR-019 (Focused RLS), `NETCOMPLEX_ARCHITECTURE.md`, `docs/architecture/PROPERTY_HOUSEHOLD_MODEL.md`, `AGENTS.md`

---

## Summary

Tamagui Takeout’s stack (Zero sync, public/private schema split, model-colocated permissions, DB-maintained counters, Better Auth profile projection) and the **takeout-free** repo layout contain several **design patterns** that align with NetComplex goals. We should **adopt the patterns selectively** as discipline and implementation techniques inside our existing architecture (Next.js App Router, tRPC, Better Auth, Prisma → Drizzle, Supabase, Vercel, multi-tenant `tenantId` isolation, Feature-Sliced Design).

We should **not** adopt Zero, One, or Tamagui as a framework replacement, and we should **not** restructure the repo to match Takeout’s folders. Offline-first sync and universal native UI are out of scope unless product explicitly prioritises offline mobile or a native rewrite. Our FSD shape is the right fit for a multi-tenant HOA platform; we steal clarity habits, not taxonomy.

This advisory captures what to take from Takeout’s product patterns **and** repo organisation, what to ignore, and how to apply the useful ideas without architectural churn.

---

## 1. Context: What Takeout Does Differently

| Takeout concept                            | What it is                                | NetComplex analogue                                              |
| ------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------- |
| Public schema                              | Tables replicated to client via Zero      | Public tRPC procedures + OpenAPI DTOs + selective Realtime       |
| Private schema                             | Server-only tables (auth, secrets, admin) | Auth tables, assist, suspensions, full PII — never client-synced |
| Model = schema + `serverWhere` + mutations | Permissions next to data                  | `hasPermission()` + tenant filters + focused RLS                 |
| Denormalised counters via triggers         | DB-owned aggregates                       | App-maintained `entryCount` (and similar)                        |
| Public/private profile                     | Safe projection vs full user row          | Directory DTOs, `isPublic` / `showEmail` / `showPhone`           |
| Multi-instance Zero                        | Tenant-isolated client replicas           | Host middleware + `withTenant()` + `x-tenant-id`                 |

Zero is a full local-first sync engine (client SQLite/IndexedDB, optimistic writes, continuous push). That is a different data plane from tRPC + TanStack Query + Supabase Realtime. Introducing it would be a major product and ops decision, not a pattern tweak.

---

## 2. Patterns to Adopt (product / data plane)

### 2.1 Public / private data boundary (highest value)

**Intent:** Every consumer-facing surface returns only a deliberate, privacy-safe projection. Private fields never leave the server except through authenticated, permission-checked paths.

**Apply in NetComplex:**

1. Treat **public DTOs** as the contract for:
   - Directory listings and profile cards
   - Competition lists, participants, winners
   - Published announcements, events, content
   - Open group memberships and public resources

2. Keep **strictly private**:
   - `session`, `account`, `passkey`, `twoFactor`
   - Full `user` contact fields when privacy flags deny them
   - `AssistSession`, `PlatformSuspension`, behaviour records (except subject-facing summary)
   - Invitation tokens, internal admin notes, billing/tier internals

3. Prefer one named projection per aggregate (e.g. `ParticipantDTO`, directory user shape) over ad-hoc `select` spreads that grow over time.

4. Align OpenAPI (mobile) and tRPC public procedures with the same projections so web and native clients cannot diverge into over-fetching private fields.

**Do not** introduce a second physical schema or Zero replication solely to get this boundary. Application-layer projections + existing focused RLS (ADR-019) are sufficient.

### 2.2 Colocate “can this actor act on this row?” with the domain

**Intent:** Visibility and mutation rights live next to the resource, not only in scattered route guards.

**Apply:**

- For each major aggregate (Property, Household, MaintenanceRequest, Competition, Group, Resource), maintain a small server helper, e.g. `canViewProperty(ctx, propertyId)`, `canManageCompetition(ctx, competitionId)`.
- Helpers must always incorporate:
  - `tenantId` match
  - Role / `hasPermission()`
  - Ownership or seat membership where relevant
  - Privacy / target filters (`ResidentFilter`, `isPublic`, etc.)
- List endpoints should compose a shared **visibility predicate** instead of duplicating tenant + role + privacy logic in every router.

This reduces cross-tenant and over-exposure risk without requiring SQL RLS on every table.

### 2.3 Database-owned or transactionally consistent counters

**Intent:** Hot aggregates stay correct under concurrency and do not rely on “read → increment → write” races.

**Candidates in our schema:**

| Counter                                        | Current approach                  | Preferred                                                       |
| ---------------------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| Competition `entryCount`                       | Application update on join/submit | Same transaction as entry insert, or DB trigger                 |
| Group member count                             | Often computed                    | Trigger or transactional update                                 |
| Open maintenance tickets (per tenant/category) | Query-time count                  | Optional denormalised field if dashboards need it               |
| Unread notifications / messages                | Query-time                        | Keep query-time unless product requires badge-scale performance |

**Guidance:** Prefer a single transaction that inserts the child row and updates the parent counter. Use PostgreSQL triggers only when multiple write paths make application-level consistency hard to guarantee. Document any trigger in the migration and in STEERING notes.

### 2.4 Public profile projection as a first-class shape

**Intent:** Directory and social surfaces never expose the full user/auth record.

**Apply:**

- Formalise a **PublicProfile** (or reuse and tighten existing directory DTO) that includes only: display name, avatar, role badge, interests, public contact (if allowed), seat/property summary required for cards.
- Profile and seat models already separate participation from legal ownership (ADR-017). Keep that split; do not collapse private lease or contact data into public cards.
- Mobile OpenAPI and web directory must share the same projection rules.

### 2.5 Assist / impersonation as a product capability

**Intent:** Support staff can act in a tenant context without permanent privilege elevation or silent identity swap.

**Apply:**

- Treat `AssistSession` as the single source of truth: scope, expiry, active flag, notes, revoke.
- Every assist action must remain auditable (who, as whom, tenant, when).
- Never widen assist to bypass tenant isolation; only elevate within the target tenant’s data plane.
- Align UI and API so “you are assisting X” is always visible to the operator.

### 2.6 Invite hygiene

**Intent:** Invitations remain time-bounded, tenant-scoped, and auditable.

**Optional upgrades (product-dependent):**

- Explicit max-use / remaining-use for batch or agent invites
- Clearer organisation- or board-scoped invite batches
- Redemption audit (who accepted, from which invite)

Core model (`Invitation` + token + status + `expiresAt`) already supports the main flows; extend only when product needs bulk or partner onboarding.

### 2.7 Tenant namespacing of any client-side store

**Intent:** No global client cache or Realtime subscription that can leak across tenants.

**Apply:**

- Any future client cache, Realtime channel name, or local persistence must be keyed by `tenantId` (or tenant slug).
- Middleware + `withTenant()` remain the source of tenant context; clients must not invent tenant identity.

---

## 3. Repo organisation: Takeout-free vs our FSD

Reference layout (takeout-free):

```text
takeout-free/
├── app/                 # File-based routing (One)
├── src/
│   ├── features/        # Thin feature modules (auth, todo, theme)
│   ├── interface/       # Design-system / reusable UI only
│   ├── database/        # schema-public.ts + schema-private.ts + migrations
│   ├── data/            # Zero models, queries, permissions (sync data plane)
│   ├── zero/            # Sync client/server config
│   ├── server/          # Server-only helpers
│   └── tamagui/         # Theme tokens
├── scripts/
├── docs/
└── assets/
```

NetComplex (simplified):

```text
src/
├── app/                 # Next.js App Router (platform + tenant routes)
├── entities/            # Domain models and business rules
├── features/            # Feature-specific modules
├── widgets/             # Composed UI blocks for dashboards/spaces
├── page-modules/        # Page-level compositions
├── shared/              # api, ui, lib, permissions, tenant helpers
└── server/              # tRPC routers, openapi generator
prisma/                  # Schema source of truth
scripts/
docs/                    # STEERING, ADRs, advisories, architecture
```

### 3.1 Side-by-side map

| Concern            | Takeout-free                 | NetComplex                                 |
| ------------------ | ---------------------------- | ------------------------------------------ |
| Routing            | `app/` (One)                 | `src/app/` (Next App Router)               |
| Feature UI / flows | `src/features/` (thin)       | `features/` + `page-modules/` + `widgets/` |
| Domain / business  | Implicit in `data/models`    | Explicit `entities/`                       |
| Reusable UI        | `src/interface/`             | `shared/ui/`                               |
| DB schema          | `database/` public + private | `prisma/` → generated Drizzle              |
| Client data API    | `src/data/` (Zero)           | tRPC routers + REST + OpenAPI              |
| Sync / realtime    | `src/zero/`                  | Supabase Realtime (selective)              |
| Server-only        | `src/server/`                | `shared/api`, guards, `withTenant`         |
| Agent guidance     | `.claude/skills/`            | `AGENTS.md` + STEERING + advisories        |

Takeout collapses entity + API + permissions + mutations into `src/data/models` because Zero owns the data plane. We split **entities / features / widgets / page-modules / shared** because the product is multi-tenant HOA domain logic, not a social-feed starter.

### 3.2 What they organise better (habits to steal)

1. **One obvious path to add a data capability**  
   Takeout recipe: schema → migrate → model → generate → query. Little ambiguity for humans or agents.  
   **Apply:** For each major aggregate, document a single definition path: Prisma model → DTO → tRPC (or REST) router → public projection → UI entry (widget or page-module). Encode that path in `AGENTS.md` / STEERING so “where does X go?” is never a debate.

2. **Permissions next to the resource**  
   Write rules live with the model (`serverWhere`).  
   **Apply:** Prefer row-level helpers next to the entity or owning router (see §2.2), not only a global `permissions.ts`.

3. **Public vs private as a first-class idea**  
   Physical schema split reinforces the boundary.  
   **Apply:** Label or index “public projection candidates vs private tables” in docs; do not split Prisma roots unless we introduce a client replica.

4. **`interface/` as the only design-system import surface**  
   Features import shared UI, not raw primitives from the UI library.  
   **Apply:** Enforce `features` / `widgets` / `page-modules` → `shared/ui` only; avoid ad-hoc primitive sprawl as the widget surface grows.

5. **Agent-facing recipes**  
   Skills encode “how we add a model / query / route.”  
   **Apply:** Short task recipes in AGENTS/STEERING: add tenant-scoped tRPC procedure; add public DTO; add counter transaction; add tenant-scoped Realtime channel.

6. **Scripts and env as product surface**  
   Clear `migrate` / `backend` / committed dev env + production example.  
   **Apply:** Keep seed, migrate, and tenant-backfill scripts discoverable and consistently named; one documented happy path for local + deploy.

### 3.3 What we already organise better for this product

- **Real FSD depth** — `entities` + `features` + `widgets` + `page-modules` matches a multi-module HOA platform; Takeout `features/` is starter-thin.
- **Multi-tenant control plane** — middleware, `withTenant`, platform vs tenant hosts, tier/module registry.
- **Dual API with governance** — tRPC + OpenAPI + REST + ADR trail.
- **Domain richness** — Property / Household / seats / profiles / agents / merits / disputes.
- **Docs as architecture** — STEERING, ADRs, advisories, multi-tenant plans.

### 3.4 Practical repo guidance (no restructure)

| Keep                                                                                 | Tighten                                                        | Avoid                                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| FSD layers (`app` / `entities` / `features` / `widgets` / `page-modules` / `shared`) | One documented path per aggregate (schema → DTO → router → UI) | Moving to Takeout’s flat `data/` + thin `features/` only                   |
| Prisma source of truth + Drizzle queries                                             | Optional public/private _labelling_ in schema docs             | Physical `schema-public` / `schema-private` split without a client replica |
| `shared/ui` + widgets                                                                | Import rule: features/widgets → shared UI only                 | Parallel `interface/` root                                                 |
| `AGENTS.md` + advisories                                                             | Task-shaped “how to add X” recipes                             | Full Zero / on-zero layout                                                 |
| Tenant middleware + focused RLS                                                      | Visibility helpers colocated with domain                       | Global client data layer without tenant keys                               |

**Decision on layout:** Stay on FSD. Steal Takeout’s _clarity habits_ (rigid capability path, permissions near resource, public projection discipline, agent recipes)—not their folder taxonomy built around Zero.

---

## 4. Patterns Explicitly Out of Scope (for now)

| Takeout idea                                            | Why not adopt                                                                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Zero / local-first sync                                 | Large data-plane change; ops (extra DBs), conflict model, permission model at sync layer. Use selective Supabase Realtime + tRPC instead. |
| One framework / Tamagui UI                              | We are committed to Next.js App Router + React + Tailwind. Framework switch has poor ROI.                                                 |
| Physical `schema-public.ts` / `schema-private.ts` files | Useful as documentation; not required as separate Drizzle roots unless we introduce a client replica.                                     |
| Restructure to Takeout `data/` + `interface/` layout    | FSD already fits multi-tenant domain scale; a rename-only migration would cost more than it saves.                                        |
| Uncloud / SST VPS deploy                                | Vercel + Supabase fits current product and team.                                                                                          |
| Full client SQLite replica                              | Same as Zero; only reconsider if offline-first native becomes a hard requirement.                                                         |

Revisit Zero-class sync only if product prioritises offline-capable native apps or heavy multiplayer collaboration beyond chat.

---

## 5. Implementation Guidance

### 5.1 When adding a new domain feature

1. Decide **public projection** vs **private fields** before writing the router.
2. Add or reuse a DTO that cannot grow private columns by accident.
3. Put tenant + visibility checks in one helper used by list and get.
4. If the feature has a counter (members, entries, open tickets), update it in the same transaction as the write.
5. Document any Realtime channel as tenant-scoped.
6. Place code on the FSD path: entity rules → feature/API → widget or page-module → shared UI only for primitives.

### 5.2 When touching identity or directory

1. Prefer Property / Household / Profile / seat model (ADR-017); do not reintroduce “household-as-asset” semantics.
2. Directory and public profile endpoints must respect `isPublic`, `showEmail`, `showPhone`, and role visibility.
3. Agents and assist sessions must not expand the public surface.

### 5.3 When changing auth or admin tools

1. Keep auth tables and assist/suspension data private and RLS-protected where already covered (ADR-019).
2. Platform admin routes stay on the control plane (`app.netbones.co.za`); never assume tenant headers for platform operators.
3. Impersonation/assist always goes through `AssistSession` (or equivalent audited path).

### 5.4 OpenAPI / mobile

1. Public operations must match the same projections as web public procedures.
2. Do not expose private columns in generated OpenAPI schemas; if a field is server-only, it should not appear on public paths.

### 5.5 Repo / contributor clarity

1. Prefer extending existing FSD layers over inventing parallel top-level folders.
2. When a new aggregate is introduced, update the “definition path” note (AGENTS or STEERING) in the same change.
3. Keep scripts for migrate/seed/tenant-backfill named consistently and linked from AGENTS or package scripts.

---

## 6. Suggested Follow-ups (non-blocking)

| Priority | Item                                                                               | Notes                                        |
| -------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| P1       | Audit public tRPC + OpenAPI responses for accidental private fields                | Especially directory, competitions, profiles |
| P1       | Shared visibility helpers for list endpoints that mix tenant + privacy             | Start with directory and competitions        |
| P2       | Transactional counter updates for competition entries (and group members if noisy) | Reduce race windows                          |
| P2       | Formal PublicProfile / directory DTO as the single source for cards                | Align web + mobile                           |
| P2       | Document per-aggregate definition path in AGENTS/STEERING                          | schema → DTO → router → UI                   |
| P3       | AssistSession productisation (UI indicator, stricter scope, audit export)          | Support quality                              |
| P3       | Optional invite max-uses if board onboarding needs it                              | Product call                                 |
| P3       | Short “how to add X” recipes for agents/contributors                               | Procedure, DTO, counter, Realtime channel    |

No new ADR is required unless we later adopt a sync engine, change the dual-ORM / RLS strategy, or deliberately revise FSD layer boundaries. This advisory is the decision record for “Takeout patterns and organisation, selectively.”

---

## 7. Decision

**Adopt** the design disciplines above (public/private projections, colocated visibility, transactional counters, assist hygiene, tenant-namespaced client state) **inside the current NetComplex architecture and FSD layout**.

**Do not adopt** Zero, One, Tamagui, a physical public/private database split, or a Takeout-style `data/` + thin-`features/` restructure.

The highest-leverage exports are:

1. **Public/private boundary** — every client-facing shape is a deliberate projection; private data stays server-only.
2. **Clarity of placement** — one documented path per aggregate; permissions near the resource; agent/contributor recipes without abandoning FSD.

That strengthens multi-tenant isolation, privacy, and onboarding without a stack or folder migration.

---

## Related

- ADR-003: Dual ORM (Prisma + Drizzle)
- ADR-004: Feature-Sliced Design
- ADR-011: tRPC
- ADR-017: Property-first architecture
- ADR-019: Focused RLS on sensitive tables
- `NETCOMPLEX_ARCHITECTURE.md` — control plane vs data plane
- `docs/architecture/PROPERTY_HOUSEHOLD_MODEL.md`
- `AGENTS.md` — contributor and agent conventions
- Takeout / takeout-free: public/private schema split, model-level permissions, DB counters, `data/` + `interface/` layout, agent skills

---

_Advisory owner: architecture. Update this document if product prioritises offline-first mobile, a sync engine evaluation, or a deliberate FSD boundary change._
