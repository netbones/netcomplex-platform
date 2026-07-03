# COMMUNIQUE-09 — ADR-024 Executed: DTO Consolidation Complete; Client-Bundle Gating Blocking

**To:** Architecture Advisors  
**Date:** 2026-07-03  
**Status:** Decision Required  
**Trigger:** ADR-024 (Resolve DTO Duplication) fully executed across 6 commits. Discovered a client-bundle gating issue that needs architectural resolution.

---

## 1. What We Did

Executed ADR-024's recommended Option B′ (unify toward Zod, relocated to `src/shared/api/dto/`). Four decision gates (G1–G4) were approved by DavDev before execution.

### Commit Summary (dev branch)

| Commit     | Description                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| `10e5ae2a` | Fix CORS `startsWith` matching → exact hostname comparison (SECURITY_REVIEW F-3)          |
| `600931fd` | Add rate limiting to Better Auth GET handler (300 req/min spray prevention)               |
| `52c2b23b` | Add Turnstile CAPTCHA to sign-in via `x-turnstile-token` header (Rec #3)                  |
| `1f0b908c` | Add `solaris.co.za` as second tenant domain across all config files                       |
| `05ee61a7` | Replace hardcoded `DOMAIN_TO_SLUG` map with DB-backed `getTenantByDomain()` fallback      |
| `668535ee` | Phase 1 — 14 DTO files converted from interface+mapper to `createSelectSchema()` Zod      |
| `23a8f8e7` | Phase 4 — 31 additional DTO files, 25 routers repointed, `server/dto` fully shimmed       |
| `ceac4925` | Gate Zod DTOs behind `@api/server` (server-only), remove from `@api/shared` (client-safe) |

---

## 2. Current State — DTO Architecture

### Before (ADR-024)

```
src/server/dto/*.ts  (Zod, 11 files) ──→ 20+ tRPC routers
src/shared/api/dto/*.ts (interfaces+mappers, 15 files) ──→ entities/content, entities/chat
→ Two sources of truth, same domains, no shared reference
```

### After

```
src/shared/api/dto/  (Zod, 45 files — single canonical location)
        │
        ├──→ @api/server (re-exports via index, server-only)
        │         └──→ 25 tRPC routers (import { XxxDto } from '@api/server')
        │
        └──→ @api/shared (NO DTO exports — client-safe barrel)
                  └──→ Client UI components (HTTP helpers, slugs, types only)
```

- **45 Zod schema files** in `src/shared/api/dto/` — one per domain, all `createSelectSchema()`-derived
- **25 routers** repointed from `@server/dto` → `@api/server`
- **`src/server/dto/`** now a thin backward-compat shim (`export * from '@/shared/api/dto'`)
- **0 DTO duplications** remain — the interface+mapper pattern is fully eliminated
- **173 tests pass** (DTO tests + entity tests + middleware/auth)

---

## 3. The Blocking Issue

### Problem

Commit `ceac4925` removed `export * from '../dto'` from `@api/shared` (the client-safe barrel) because DTO files import from `../db.ts` which has `import 'server-only'` at the top. When client components imported from `@api/shared`, the bundler would load the full import chain including `db.ts`, and Next.js would throw:

```
Error: You're importing a component that needs "server-only".
Import trace: DirectoryChatModal.tsx → @api/shared → dto/index.ts → achievement.ts → ../db → 'server-only'
```

Removing the DTO re-exports fixed the client bundle error, but broke **entity consumers** that need `toContentDTO`, `toPublicContentDTO`, and similar mapper wrappers from `@api/shared`:

```
export 'toContentDTO' was not found in '@api/shared'
Import trace: entities/content/dto/index.ts → @api/shared
                → entities/content/index.ts
                → AnnouncementForm.tsx ('use client')
                → dashboard/AnnouncementsStreamWidget.tsx
                → app/(tenant)/layout.tsx
```

### Root Cause

The `toXxxDTO()` wrapper functions live in the same file as the Zod schema (e.g., `src/shared/api/dto/content.ts`), which imports `../db` at the top level. This means:

1. **`toContentDTO` IS used by client components** — via the entity barrel chain
2. **`toContentDTO` CANNOT be client-safe** — because its file imports `../db` with `server-only`
3. **The entity default barrel** (`entities/content/index.ts`) re-exports `toContentDTO` from `./dto`, making it available to client components — violating ADR-020's `server.ts` gating rule

### Options

#### Option A — Gate entity DTO exports behind `server.ts` (ADR-020 pattern)

Remove `toContentDTO` from `entities/content/index.ts` (default client-reachable barrel). Create `entities/content/server.ts` that re-exports server-only functions including `toContentDTO`. Client components that currently call `toContentDTO` would need to call a different function (or the entity service layer would handle it server-side).

**Pros:** Clean FSD boundary. Follows ADR-020 precedent. No runtime cost.  
**Cons:** Requires refactoring client components that use `toContentDTO`. Entity service layer may need adjustment.

**Effort:** ~1–2h — identify all client callers, create `server.ts` sub-barrel, refactor callers.

#### Option B — Extract `toXxxDTO` wrappers to a client-safe module

Create `src/shared/api/dto/mappers.ts` that exports all `toXxxDTO` functions. These functions would accept plain objects (not `InferSelectModel` types) and use the Zod schemas for runtime parsing. The key: `mappers.ts` does NOT import `../db` — it would import the Zod schemas themselves (which DO import `../db`), but this would still transitively pull `server-only` into the client bundle.

**Blocked.** ES module static imports make this impossible without making Zod schemas themselves client-safe.

#### Option C — Keep DTOs in `@api/shared`, fix the directory import chain

Re-add `export * from '../dto'` to `@api/shared`. The `DirectoryChatModal` import chain is: `DirectoryChatModal.tsx → directory/index.ts → @api/shared → achievement.ts → ../db`. Fix this by making the directory feature NOT import the full `@api/shared` barrel — instead import only the specific exports it needs (`apiGet`, `apiPost`).

**Pros:** Zero entity refactoring. `toContentDTO` stays available.  
**Cons:** Brittle — any future client component importing `@api/shared` would pull all DTOs. Same bug can recur.

#### Option D — Make DTO files client-safe by separating schema from DB

Create a two-file pattern per domain:

- `content.ts` — Zod schema creation (imports `../db`, server-only, available via `@api/server`)
- `content.mappers.ts` — `toXxxDTO` wrappers (imports schema type only, NOT `../db`, available via `@api/shared`)

```typescript
// content.mappers.ts (client-safe, NO ../db import)
import { contentDto } from './content'; // ← still imports ../db transitively

export function toContentDTO(row: unknown): ContentDto {
  return contentDto.parse(row);
}
```

**Blocked.** The import of `contentDto` still transitively pulls `../db` through the module graph. Even though `content.mappers.ts` doesn't directly import `../db`, the bundler resolves the full chain.

---

## 4. Decision Required

Which approach should we take?

G4 of ADR-024 explicitly anticipated this: _"If discovery step 5 shows content/chat DTO usage is reachable from a client-bundled barrel, confirm whether to gate behind `server.ts` (ADR-020 pattern) now."_

The discovery confirmed that `toContentDTO` IS reachable from client bundles via `entities/content/index.ts`. The architect's decision is needed on whether to:

1. **Gate now** (Option A) — refactor entity barrels per ADR-020, accept ~1–2h of call-site refactoring
2. **Accept the cost** (Option C) — keep DTOs in `@api/shared` but fix the directory import chain, accept ongoing fragility risk
3. **Alternative pattern** — a different approach not captured above

## 5. Tracked As

BD issues: `soralia-village-axh6` (closed, DTO unification), `soralia-village-6jl9` (closed, Phase 4 router repoint)  
Advisory: `docs/advisories/ADVISORY-024.md`
