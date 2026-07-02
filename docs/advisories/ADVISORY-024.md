# ADVISORY-024 — Resolve DTO Duplication (COMMUNIQUE-08)

**Status:** Decision gates open — do not execute until G1–G4 are confirmed
**Trigger:** COMMUNIQUE-08 (2026-07-02), BD issue `soralia-village-axh6`
**Supersedes:** No prior advisory on this topic

---

## 1. Problem Statement

Two independent DTO systems describe the same domain shapes:

- `src/server/dto/` — 13 files, Zod schemas via `createSelectSchema()` (drizzle-zod), consumed by 20+ tRPC routers.
- `src/shared/api/dto/` — 15 files, hand-written `interface` + `toXxxDTO()` mappers, consumed by 4 files under `src/entities/content` and `src/entities/chat` (plus their `__tests__`).

Field selections for the same domain (content, event, booking, group, maintenance, user, notification) are maintained twice, by hand, with no guarantee of parity. REST route handlers use neither and build response shapes inline. COMMUNIQUE-08 asks for a consolidation decision.

## 2. Root Cause Analysis

The two systems are not a design choice — they're a byproduct of migration sequencing:

- The interface+mapper pattern predates the tRPC adoption (ADR-011) and was written for REST response shaping. REST routes never actually converged on it (per COMMUNIQUE-08 §1.2), so its only surviving consumers are the entity slices that were built alongside it (content, chat).
- The Zod pattern arrived with tRPC and became the tRPC-layer convention, reinforced by ADR-019 (auto-generated OpenAPI from tRPC/Zod).
- ADR-021 (dual-API governance) already commits the project to tRPC as the **canonical internal contract**, with REST as legacy/external-only and explicitly **no new REST routes for internal features**. That decision was made without revisiting the now-orphaned interface DTO system, which is exactly the gap COMMUNIQUE-08 surfaces.

Given ADR-021's direction is already set, this advisory treats "which technology wins" as effectively decided — Zod — and focuses on **where the canonical schemas should live** and **how to migrate without an FSD violation**.

## 3. Options Considered

COMMUNIQUE-08 presented five options (A–E). Evaluation against this codebase's existing constraints:

| Option                                                 | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A — Status quo                                         | Rejected. Does not address sync burden or drift; explicitly what was flagged as the problem.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| B — Unify toward Zod, schemas stay in `src/server/dto` | **Rejected as written.** `src/server/dto` sits outside the FSD slice hierarchy (`app → pages → widgets → features → entities → shared`, ADR-004/ADR-020). Having `src/entities/content` and `src/entities/chat` import from `src/server/dto` inverts the dependency direction ADR-020 was written specifically to prevent (server-only code must not leak into a slice's default barrel; entities must not reach into server/tRPC internals). This is the same category of fault ADR-020 already fixed once. |
| C — Unify toward interfaces                            | Rejected. Drops Zod's runtime output validation at the tRPC boundary, which is the main thing `server/dto` does well and which ADR-019's OpenAPI generation depends on (Zod-derived schemas). Manual mappers remain drift-prone — doesn't actually solve the stated problem, just moves it.                                                                                                                                                                                                                  |
| D — Hybrid with a third `types/` layer                 | Rejected as primary path. Architecturally cleanest in isolation, but adds a third layer for a REST surface that ADR-021 has already deprioritized. Not worth ~4h and permanent extra indirection for a consumer set (REST) that isn't supposed to be growing.                                                                                                                                                                                                                                                |
| E — Consolidate location only, keep both technologies  | Rejected. Doesn't touch the actual duplication — same problem in one folder.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Recommended: Option B′ — Unify toward Zod, relocated to `src/shared/api/dto/`

This is COMMUNIQUE-08's own mitigation for Option B's "layer bleed" concern, made mandatory rather than optional, because the codebase already has a hard rule against exactly this kind of cross-layer import (ADR-020). Concretely:

- `src/shared/api/dto/` (already exists, already an established FSD `shared` location — same tier as `@api/server` / `@api/client` / `@api/shared`) becomes the **single canonical location** for Zod schemas derived via `createSelectSchema()`.
- `src/server/dto/` becomes a thin re-export shim during migration (Phase 3 below), then is deleted once router imports are swapped (deferred Phase 4).
- Entity code (`content`, `chat`) imports Zod schemas from `shared/api/dto` directly — a same-or-lower-layer import, consistent with FSD.
- Existing `toXxxDTO()` function names are preserved as thin wrappers (`export const toContentDTO = (row) => contentDto.parse(row)`) so entity call sites need zero changes beyond the import path.

This keeps ADR-003's lineage intact: Prisma (schema source of truth) → `prisma-generator-drizzle` → Drizzle table → `createSelectSchema()` → single DTO, now sitting in the correct FSD tier.

**Effort:** ~2.5h (vs. 2h for literal Option B) — the extra 30min covers the shim layer and import verification, not a new technology.

## 4. Architecture Before / After

**Before:**

```
src/server/dto/*.ts  (Zod, 13 files) ──→ 20+ tRPC routers
src/shared/api/dto/*.ts (interfaces+mappers, 15 files) ──→ entities/content, entities/chat
```

Two sources of truth, same domains, no shared reference.

**After (Phase 1–3, immediate):**

```
src/shared/api/dto/*.ts  (Zod, canonical, createSelectSchema-derived)
        │
        ├──→ src/entities/content, src/entities/chat  (direct import — same/lower FSD tier)
        └──→ src/server/dto/*.ts  (re-export shim) ──→ 20+ tRPC routers (unchanged import path)
```

**After (Phase 4, deferred):**

```
src/shared/api/dto/*.ts  (Zod, canonical)
        │
        ├──→ src/entities/content, src/entities/chat
        └──→ 20+ tRPC routers  (imports updated directly, server/dto shim deleted)
```

## 5. Pre-Execution Discovery Checklist

Agent must run and report results before any file is touched. **Do not proceed to Phase 1 if any item below surfaces a mismatch — escalate to DavDev (see decision gates).**

```bash
# 1. Enumerate both DTO sets and confirm the 13/15 file counts still hold
ls -la src/server/dto/*.ts
ls -la src/shared/api/dto/*.ts

# 2. Identify domain-name overlaps (files present in both directories)
comm -12 \
  <(ls src/server/dto/ | sed 's/\.ts$//' | sort) \
  <(ls src/shared/api/dto/ | sed 's/\.ts$//' | sort)

# 3. For each overlapping domain, diff field selections field-by-field
#    (manual review required — grep the .pick()/interface field lists)
for f in content event booking group maintenance user notification; do
  echo "=== $f ==="
  grep -A 30 "createSelectSchema\|\.pick(" src/server/dto/${f}.ts 2>/dev/null
  echo "---"
  grep -A 30 "^export interface" src/shared/api/dto/${f}.ts 2>/dev/null
done

# 4. Confirm which entity slices consume shared/api/dto and via which barrel
grep -rn "from '@shared/api/dto\|from '@/shared/api/dto" src/entities/content src/entities/chat

# 5. Confirm whether that import path is client-reachable or server-only
#    (checks for an existing server.ts sub-barrel per ADR-020 precedent)
ls src/entities/content/server.ts src/entities/content/index.ts 2>/dev/null
ls src/entities/chat/server.ts src/entities/chat/index.ts 2>/dev/null
grep -n "dto" src/entities/content/index.ts src/entities/content/index.server.ts 2>/dev/null

# 6. Check for computed/joined fields in interface DTOs that a plain
#    createSelectSchema() row-select cannot produce (would need .extend() or
#    a service-layer join before .parse())
grep -n "toXxxDTO\|toContentDTO\|toEventDTO\|toBookingDTO\|toUserDTO\|toGroupDTO\|toMaintenanceDTO\|toNotificationDTO" \
  src/shared/api/dto/*.ts -A 15

# 7. Confirm Steiger allow-list won't flag the new shim re-exports
grep -n "server/dto\|shared/api/dto" steiger.config.js

# 8. Confirm the 4 existing DTO test files and what they assert
#    (to know whether Phase 5 test updates are needed)
cat src/shared/api/dto/__tests__/dto-booking.test.ts \
    src/shared/api/dto/__tests__/dto-event.test.ts \
    src/shared/api/dto/__tests__/dto-property.test.ts

# 9. Spot-check for legacy null data in DB columns that a stricter Zod
#    schema (non-nullable per Prisma) might reject at parse-time in prod
#    — run per touched table once field diffs from #3 are known
```

## 6. Phased Execution Plan

**Phase 1 — Canonicalize Zod DTOs in `shared/api/dto`**

- For each of the 7 overlapping domains, move/author the `createSelectSchema()`-derived Zod schema into `src/shared/api/dto/<domain>.ts`, superseding the hand-written interface.
- Field set = union of both prior selections **unless discovery step 3 reveals a computed/joined field that can't be derived from a plain row select** — those are flagged for G2.
- Preserve existing exported function names (`toContentDTO`, etc.) as thin `.parse()` wrappers.

**Phase 2 — Repoint entity consumers**

- Update `src/entities/content`, `src/entities/chat` imports to the new canonical location.
- If discovery step 5 shows DTO usage is not already behind a `server.ts` sub-barrel and the DTO is server-only in practice (maps raw DB rows), gate the export behind `server.ts` per ADR-020 rather than the default `index.ts`, to avoid shipping Zod to the client bundle.

**Phase 3 — Shim `server/dto`**

- Replace the 13 `src/server/dto/*.ts` files' bodies with re-exports from `src/shared/api/dto/*.ts`. Zero changes required to the 20+ router files in this phase.

**Phase 4 — Deferred cleanup (tracked, not executed now)**

- Mechanical find-replace of router imports from `@/server/dto` → `@/shared/api/dto` (same pattern already used for ADR-020's ~105-file migration).
- Delete the `src/server/dto` shim once all routers are repointed.
- Track as a follow-up BD issue; do not block Phase 1–3 on it.

**Phase 5 — Delete old interfaces, reconcile tests**

- Remove the now-unused hand-written interfaces.
- Update `dto-booking.test.ts`, `dto-event.test.ts`, `dto-property.test.ts`, and content/chat test files only where field sets changed per Phase 1's union decision.

## 7. Risk Register

| Risk                                                                                     | Severity   | Mitigation                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Interface DTO has a computed/joined field `createSelectSchema()` can't produce alone     | Medium     | Discovery step 6 catches this before Phase 1; resolve via `.extend()` on the Zod schema, not by dropping the field silently.  |
| `.parse()` is stricter than the old manual mapper and throws on legacy null data in prod | Medium     | Discovery step 9 spot-checks affected columns; use `.nullable()` matching actual Prisma nullability, not assumed nullability. |
| DTO Zod code ships to client bundle via entity default barrel                            | Low–Medium | Discovery step 5 + ADR-020 `server.ts` gating in Phase 2.                                                                     |
| Steiger flags the `server/dto` re-export shim as a sidestep                              | Low        | Discovery step 7; add to allow-list alongside existing `@api/server` precedent if needed.                                     |
| Router-file churn in Phase 4 causes merge conflicts with concurrent feature work         | Low        | Phase 4 explicitly deferred and tracked separately; not part of this advisory's execution scope.                              |

## 8. Done Criteria

- [ ] `src/shared/api/dto/` holds one Zod schema per domain; no parallel hand-written interface remains for content, event, booking, group, maintenance, user, notification.
- [ ] `src/entities/content` and `src/entities/chat` import DTOs from `shared/api/dto` (directly or via `server.ts` sub-barrel per ADR-020).
- [ ] `src/server/dto/` re-exports from `shared/api/dto/` with no router import changes required in this pass.
- [ ] All 4 existing DTO tests plus content/chat tests pass unmodified in assertions, except where G2 approved a field-set change.
- [ ] No new Steiger/ESLint FSD violations introduced.
- [ ] Phase 4 (router import cleanup) filed as a separate, explicitly deferred BD issue.
- [ ] BD `soralia-village-axh6` closed referencing this advisory.

## 9. Decision Gates

**G1 — Canonical location.** Confirm `src/shared/api/dto/` (not `src/server/dto/`) as the permanent home for Zod DTOs, per the FSD-violation reasoning in §3. _Awaiting DavDev confirmation._

**G2 — Field-set reconciliation.** For any domain where discovery step 3 finds the two DTO sets diverge (not just superset/subset but genuinely different fields, e.g. a computed field only the interface mapper produced), DavDev decides per-domain whether to include, drop, or re-derive that field — agent does not resolve unilaterally. _Blocking, pending discovery output._

**G3 — Shim vs. immediate router migration.** Confirm Phase 3 (shim, zero router churn) is acceptable for this pass, with Phase 4 (direct router repoint + shim deletion) deferred to a separate tracked issue rather than executed now. _Awaiting DavDev confirmation._

**G4 — Client-bundle gating.** If discovery step 5 shows content/chat DTO usage is reachable from a client-bundled barrel, confirm whether to gate behind `server.ts` (ADR-020 pattern) now, or accept the Zod runtime addition to the client bundle as a known, accepted cost. _Blocking, pending discovery output._

No phase beyond discovery executes until G1–G4 are resolved.
