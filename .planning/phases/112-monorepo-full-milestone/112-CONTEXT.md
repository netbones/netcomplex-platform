# Phase 112: Monorepo — Full Milestone — Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

## Phase Boundary

Umbrella/tracking phase for the full monorepo migration (M7 milestone). Captures cross-cutting architecture decisions and spawns sub-phases 113–117+ for individual implementation phases (M0–M4+). Does not execute any code changes itself.

Canonical architecture specs already exist in `docs/MOBILE_MONOREPO.md` and `docs/ADVISORY-019.md` — this phase references them rather than duplicating.

## Implementation Decisions

### Phase Structure

- **D-01:** Phase 112 is a tracking/umbrella phase — lightweight CONTEXT.md that references canonical docs.
- **D-02:** Sub-phases 113–117+ map to M0–M4+ as individual GSD phases on the roadmap.
- **D-03:** Sub-phases should be added sequentially (113 = M0 scaffold, 114 = M1 extract packages, 115 = M2 move web, 116 = M3 Expo foundation, 117+ = M4+ features).

### Milestone

- **D-04:** Monorepo gets its own milestone (M7), distinct from M6+ (deferred post-launch work).
- **D-05:** M7 Monorepo tracks all phases 113–117+ until completion.

### Web Dev Flow

- **D-06:** Web development continues in parallel during monorepo migration with coordination restrictions.
- **D-07:** During M1 (extract packages), web dev avoids editing files being extracted (types, schemas, tRPC routers). Coordinate via shared file manifest.
- **D-08:** During M2 (move web), web dev restricts to bug fixes only (48h freeze window). Schedule around low-traffic days.
- **D-09:** Pre-M0 and M3+ have no restrictions on web dev.

### Architecture (canonical sources)

- **D-10:** Turborepo + pnpm workspaces monorepo tooling.
- **D-11:** Keep FSD per app (`apps/web`, `apps/expo`); shared code to `packages/`.
- **D-12:** Mobile uses Expo SDK 53 + Expo Router + NativeWind v5.
- **D-13:** Full feature parity (all 24 features).
- **D-14:** tRPC as data layer for mobile (no direct DB access).
- **D-15:** `docs/ADVISORY-019.md` supersedes earlier planning — its gate decisions (G-1 through G-3) and pre-execution checklists are authoritative.

## Canonical References

Downstream agents MUST read these before planning or implementing.

### Architecture & Planning

- `docs/MOBILE_MONOREPO.md` — Full monorepo architecture spec, all 5 implementation phases (M0–M4+), package structure, UI strategy, and migration workflow.
- `docs/ADVISORY-019.md` — Supersedes MOBILE_MONOREPO.md where noted; contains decision gates G-1–G-3, pre-execution discovery checklists, and entity inventory (§C6).

### Relevant Prior Phase

- `.planning/phases/50-service-marketplace/50-CONTEXT.md` — Prior decisions on notification patterns, service booking schema, and payment gateway integration directly relevant to mobile API contracts.

### Current Codebase

- `src/server/routers/` — 16 tRPC routers, ~170 procedures; mobile client contract boundary.
- `src/shared/lib/i18n/locales/` — i18n JSON files to migrate to `packages/shared/`.
- `packages/` — Any existing packages (stock) in current repo.
- `prisma/schema.prisma` — Source of truth for Drizzle generator output path.
- `src/db/schema/` — 264 Drizzle schema files to extract to `packages/db/`.

## Existing Code Insights

### Reusable Assets

- **tRPC routers** (`src/server/routers/`): 16 routers, ~170 procedures — the mobile API contract. Already typed with Zod input/output.
- **Drizzle schema** (`src/db/schema/`): 264 files — well-organized by domain, ready for extraction to `packages/db/`.
- **Zod schemas**: Shared across forms + API + AI output parsers — extract first for mobile validation.
- **FSD structure**: Current codebase organized by FSD layers — extraction follows existing domain boundaries.

### Established Patterns

- **FSD folder conventions**: `entities/`, `features/`, `widgets/`, `shared/` per slice — mobile will replicate this tree.
- **tRPC context**: Already supports multi-tenant auth — mobile reuses same middleware.
- **ISR + caching**: `unstable_cache` pattern used throughout — mobile will rely on tRPC without ISR.

### Integration Points

- `apps/expo` connects to `apps/web` only through `packages/api` (tRPC) — no direct DB, no direct imports from `apps/web`.
- `packages/api` depends on `packages/db` + `packages/auth` + `packages/shared`.
- `packages/db` output path depends on Prisma→Drizzle generator configuration.
- Drizzle client connection stays in `apps/web`; mobile uses API layer only.

## Specific Ideas

- Prisma→Drizzle generator output should be reconfigured to write directly to `packages/db/src/schema/` (see MOBILE_MONOREPO.md §2b).
- ADVISORY-019 gate G-2: validate generator supports cross-package output before proceeding.
- M2 (48h freeze) should be pre-scheduled around low-traffic days (Friday–Saturday or holiday weekend).

## Deferred Ideas

- **Mobile-first development**: Discussed during session but deferred — not a decision. The plan is parallel builds with feature parity gates.
- **Feature flags for mobile**: Deferred to M3 planning per ADVISORY-019 §4. Statsig has React Native SDK.
- **Second-tenant concerns (Phase 03)**: Deferred planning-only phase — does not block monorepo structure.

None — discussion stayed within phase scope.

---

_Phase: 112-Monorepo-Full-Milestone_
_Context gathered: 2026-06-28_
