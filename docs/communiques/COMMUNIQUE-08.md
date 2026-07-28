---
title: COMMUNIQUE-08 — DTO Duplication: Two Parallel DTO Systems
status: current
reviewed: 2026-07-28
tags: [status, communication]
audience: all
---

# COMMUNIQUE-08 — DTO Duplication: Two Parallel DTO Systems

**To:** Architecture Advisors
**Date:** 2026-07-02
**Status:** Decision Required
**Trigger:** API layer audit (API_REVIEW.md finding #7) revealed two separate DTO systems describing the same domain concepts with different technologies and no consolidation plan.

---

## 1. Current State

The codebase has two independent DTO directories:

| Aspect                 | `src/server/dto/` (13 files)                  | `src/shared/api/dto/` (15 files)                           |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| **Technology**         | `createSelectSchema()` from `drizzle-zod`     | Hand-written `interface` + `toXxxDTO()` mapper fns         |
| **Purpose**            | Runtime validation + type inference for tRPC  | Response mapping: Drizzle row → API shape                  |
| **Consumers**          | 20+ tRPC routers                              | 4 entity/test files (content, chat)                        |
| **Tests**              | Minimal (incidental in router tests)          | Dedicated `__tests__/` directory (4 test files)            |
| **Field selection**    | `.pick()` from `createSelectSchema()`         | Manual field list in each interface + mapper               |
| **Date handling**      | `z.date().transform(d => d.toISOString())`    | Manual `.toISOString()` in each mapper function            |
| **DB schema coupling** | Auto-derived — field additions auto-propagate | Manual — field additions require explicit interface update |

### 1.1 — Domain Overlap

Both systems define DTOs for the same domains. Content, events, bookings, groups, maintenance, users, and notifications all have representations in both locations. The field selections are similar but not guaranteed identical — no single source of truth for "what a content API response looks like."

### 1.2 — Consumer Map

```
src/server/dto/  ──→  20 tRPC router files (runtime Zod validation)

src/shared/api/dto/  ──→  src/entities/content/ (dto + tests)
                       ──→  src/entities/chat/   (tests only)
```

REST route handlers (`src/app/api/`) use neither — they build inline response shapes or wrap results in `apiSuccess()`.

### 1.3 — Key Differences

| Capability                     | Zod DTOs (`server/dto`)         | Interface DTOs (`shared/api/dto`) |
| ------------------------------ | ------------------------------- | --------------------------------- | --- | ----- |
| Runtime type coercion          | ✅ Built-in                     | ❌ Manual in mappers              |
| Null handling                  | ✅ Schema-level                 | ❌ Manual `                       |     | null` |
| Nested object validation       | ✅ `.extend()` with sub-schemas | ❌ Manual nested mappers          |
| Auto-sync with DB schema       | ✅ (via `createSelectSchema`)   | ❌ Must update manually           |
| Lightweight (no deps at usage) | ❌ Requires Zod at runtime      | ✅ Plain TS, zero runtime cost    |
| Bundle size impact             | ❌ Zod adds to client bundle    | ✅ None                           |

---

## 2. The Problem

Two systems describing the same domain concepts means:

1. **Sync burden** — adding a field to a DB table requires updating both `server/dto` (auto-derived) AND `shared/api/dto` (manual interface + mapper). Easy to miss one.
2. **Behavioral drift** — field selections can diverge. A DTO consumer might see different fields depending on which import they use.
3. **Developer confusion** — new developers (and agents) don't know which DTO system to extend when adding an API endpoint.
4. **No REST route adoption** — the interface DTOs with mappers were designed for REST API responses, but REST routes don't actually use them. They're only consumed by entity-layer code and tests.

---

## 3. Options

### Option A — Status Quo (no change)

Keep both systems. Accept the sync cost.

**Pros:** No migration effort. Both systems work today.
**Cons:** Duplication persists. Drift risk continues. Developer confusion continues.

---

### Option B — Unify Toward Zod

Replace all `shared/api/dto` mappers with calls to `.parse()` against `server/dto` Zod schemas. Delete the hand-written interfaces.

```typescript
// Before (shared/api/dto/user.ts)
export interface UserDTO { id: string; name: string; ... }
export function toUserDTO(user: InferSelectModel<typeof users>): UserDTO { ... }

// After
import { userDto } from '@/server/dto';
export const toUserDTO = (user: InferSelectModel<typeof users>) => userDto.parse(user);
```

**Pros:** Single source of truth (Zod schemas). No manual interfaces. Auto-sync with DB schema. Runtime validation on all response paths.
**Cons:** Adds Zod `.parse()` overhead to entity-layer code (tiny, but nonzero). Entity code now depends on `server/dto` (tRPC-layer concern — layer bleed). `server/dto` schemas may need adjustment for REST-specific shapes (e.g., extra computed fields).

**Effort:** ~2h — rewrite 15 files, update 4 test files, delete old interfaces.

---

### Option C — Unify Toward Interfaces

Drop Zod output schemas from `server/dto`. Convert all tRPC output types to use `z.infer<>` of `shared/api/dto` interfaces (wrapped in `z.object()` for tRPC compatibility). `server/dto` becomes a thin re-export layer.

```typescript
// server/dto/identity.ts
import { userSchema } from '@/shared/api/dto/user';
export const userDto = userSchema; // Zod object wrapping the interface shape
```

**Pros:** Single source of truth (interface definitions in shared layer). Entity code stays clean of tRPC concerns.
**Cons:** Loses runtime output validation in tRPC (Zod `outputValidation` no longer runs). Manual interfaces still drift-prone. Mapper functions still manual.

**Effort:** ~3h — wrap 15 interface sets in Zod objects, update 13 server/dto files, update 20+ router imports.

---

### Option D — Hybrid: Zod for Input, Interfaces for Output

Keep Zod input validation in tRPC (what `server/dto` does well). Keep interface mappers for REST/entity output (what `shared/api/dto` does well). But consolidate shared type definitions — extract a common `types/` layer for domain shapes that both systems reference.

```typescript
// src/shared/types/content.ts — single source of truth for "what fields"
export interface ContentApiShape {
  id: string; title: Record<string, string>; ...
}

// server/dto/content.ts — derives Zod from DB, maps to shared shape
export const contentDto = createSelectSchema(contents).pick({...});

// shared/api/dto/content.ts — uses shared shape, not a separate interface
export const toContentDTO = (row: ...): ContentApiShape => { ... };
```

**Pros:** Shared type definitions prevent drift. Each system keeps its strength. Incremental — can migrate one domain at a time.
**Cons:** Three layers instead of two (types + Zod + mappers). More files, more imports.

**Effort:** ~4h — create shared types, refactor both DTO systems, update consumers.

---

### Option E — Consolidate Location Only

Move everything to `src/shared/api/dto/`, keep the Zod-vs-interface split, but have `server/dto` just re-export from the shared location. No technology change.

**Pros:** Single directory for DTOs. Clear convention. Low effort.
**Cons:** Doesn't solve the core duplication problem — still two systems, just in one folder.

**Effort:** ~30m — move files, update imports.

---

## 4. Recommendation

**Option B (unify toward Zod)** scores highest on value-vs-effort:

- Eliminates all manual interfaces and mappers
- `createSelectSchema()` guarantees DTO fields stay in sync with DB schema
- Runtime coercion handles null/date/union edge cases consistently
- ~2h effort is the cheapest path to a real solution
- The "layer bleed" concern (entity code depending on tRPC layer) is mitigated by extracting the Zod schemas to a shared location like `src/shared/dto/` instead of keeping them under `src/server/`

**Decision needed:** Accept Option B, or choose an alternative.

## 5. Tracked As

BD issue: [soralia-village-axh6]
