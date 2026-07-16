# ADVISORY-025 — Resolve G4 Blocker: DTO Client-Bundle Gating (COMMUNIQUE-09)

**Status:** ✅ Executed (Commit 64eab618) — Decision gates G1–G2 confirmed 2026-07-03
**Trigger:** COMMUNIQUE-09 (2026-07-03), following ADVISORY-024 execution
**Relates to:** ADVISORY-024 (DTO consolidation), ADR-024 (server-only barrel rule), ADR-024 (Prisma/Drizzle DTO lineage)

---

## 1. Reframing the Problem

COMMUNIQUE-09 presents this as a new architectural fork (Options A–D). It isn't one. This is a **regression of ADR-024**, which already solved this exact failure mode for `entities/content` (content is literally named in ADR-024's own "Key Files" list, alongside tenant, maintenance, event, and booking). The DTO consolidation in ADVISORY-024 Phase 1/4 re-introduced a server-only import (`../db`, via `createSelectSchema()`) into a barrel that ADR-024 had already made client-safe.

So the question isn't "which of four new patterns should we adopt" — it's "apply the existing ADR-024 rule to the 45 new DTO files, and find out why it didn't get applied automatically during the migration." Treating this as net-new architecture risks inventing a second convention for a problem the codebase already has one answer to.

## 2. Why Options B and D (as written) Are Overstated as "Blocked"

COMMUNIQUE-09 marks Option B and Option D as blocked because importing the Zod **schema value** (`contentDto`) transitively pulls `../db`. That's correct — but it conflates two different things a client component might want:

1. The **runtime schema/mapper** (`toContentDTO(row)`) — needs the live Zod object, therefore needs `../db`, therefore must be server-only. No way around this, and no reason to want one: client code should never receive a raw, unparsed DB row to map in the first place.
2. The **TypeScript type** (`ContentDto`, used for prop typing, form state shapes, etc.) — this erases entirely at compile time. `import type { ContentDto } from '...'` (or `export type { ContentDto } from '...'` at the barrel) costs **zero runtime bundle weight**, regardless of what the source file imports at runtime, provided:
   - the import/export is written as `import type` / `export type` (not `export *`), and
   - the barrel doesn't blanket-re-export the module with a value-level `export *` that forces the bundler to keep the whole module graph live.

The trace in COMMUNIQUE-09 §3 (`entities/content/dto/index.ts → @api/shared`) is consistent with a value-level `export *` somewhere in the chain, not with a genuine runtime need for `toContentDTO` on the client. This needs to be confirmed by discovery (§4) before assuming Option A's full "1–2h refactor client call-sites" cost is real — if no client component actually _calls_ `toContentDTO(...)`, the fix is export-hygiene, not call-site refactoring.

Also flag: the second trace in COMMUNIQUE-09 Option C (`DirectoryChatModal.tsx → @api/shared → achievement.ts → ../db`) shows a **different** file (`achievement.ts`) with the same problem. This means the regression is not isolated to `content` — it's systemic across some subset of the 45 files touched in ADVISORY-024 Phases 1 and 4. Scope the fix accordingly, not just to content.

## 3. Recommendation

**Reject Option C** (communique's own analysis is correct: brittle, "same bug can recur" — do not re-add a blanket `@api/shared` re-export).

**Reject Option B / Option D as literally written** (correctly identified as blocked for the _runtime mapper_ case).

**Adopt Option A, corrected and scoped:**

1. For every domain file among the 45 where a `toXxxDTO()` mapper or the raw Zod schema is currently reachable from a slice's default `index.ts`, move that export to the slice's existing `index.server.ts` (ADR-024 pattern — already exists for content, tenant, maintenance, event, booking; may need to be created for any newly-DTO-bearing slice that didn't have one before).
2. Re-export the **type only** (`export type { ContentDto } from '@api/server'` or from the relevant `index.server.ts`) at the slice's default `index.ts`, so client components that only need the shape for typing continue to work with no call-site changes.
3. Audit every genuine client-side call site of `toXxxDTO()` (not just type usage) found in discovery. If any exist, that is an independent bug — a client component parsing a raw DB row — and must be fixed by moving the parse to the server boundary (Server Component / tRPC procedure / route handler) that already has the row, not by exempting the mapper from server-only gating.

This is strictly cheaper than COMMUNIQUE-09's own Option A estimate once type-only exports are separated out, because most "client usage" is very likely to resolve to type-only imports rather than runtime calls.

## 4. Discovery Checklist (run before touching any file)

```bash
# 1. Confirm scope: which of the 45 shared/api/dto files are re-exported
#    from a slice's DEFAULT index.ts (client-reachable) vs index.server.ts
for f in src/entities/*/index.ts; do
  echo "=== $f ==="
  grep -n "dto\|Dto\|DTO" "$f"
done

# 2. For each hit above, determine whether the export is type-only or value-level
grep -rn "export \* from '.*dto'" src/entities/*/index.ts
grep -rn "export type {" src/entities/*/index.ts

# 3. Find every GENUINE runtime call site of a toXxxDTO mapper from a
#    'use client' component (not just an import of the type)
grep -rln "'use client'" src -l | xargs grep -l "toContentDTO\|toEventDTO\|toBookingDTO\|toUserDTO\|toGroupDTO\|toMaintenanceDTO\|toNotificationDTO\|toPublicContentDTO" 2>/dev/null

# 4. Repeat the achievement.ts trace check for ALL 45 DTO files, not just
#    content — find every file under shared/api/dto that imports ../db
#    AND is reachable from @api/shared
grep -l "from '\.\./db'\|from '../../db'" src/shared/api/dto/*.ts
grep -n "dto" src/shared/api/server/index.ts src/shared/api/client/index.ts src/shared/api/shared/index.ts 2>/dev/null

# 5. Confirm which entity slices among the 45-file DTO set already have an
#    index.server.ts (per ADR-024 precedent) vs need one created
for d in $(ls src/entities); do
  if grep -qr "dto" src/entities/$d/index.ts 2>/dev/null; then
    echo "$d: has dto in default barrel; index.server.ts exists? $(test -f src/entities/$d/index.server.ts && echo yes || echo NO)"
  fi
done

# 6. Confirm a clean Next.js client build after the fix is applied to one
#    domain (content) before rolling out to the remaining 44 files —
#    canary the pattern first
```

## 5. Phased Execution Plan

**Phase 1 — Canary on `content`** (the domain already reported broken)

- Move `toContentDTO`/`toPublicContentDTO`/raw `contentDto` schema export out of `entities/content/index.ts` into `entities/content/index.server.ts`.
- Add `export type { ContentDto } from '@api/server'` (or equivalent) to `entities/content/index.ts`.
- Rebuild client bundle for the exact failing chain (`DirectoryChatModal.tsx`, `AnnouncementForm.tsx` → `AnnouncementsStreamWidget.tsx` → `app/(tenant)/layout.tsx`) and confirm no `server-only` import error and no missing-export error.

**Phase 2 — Audit and fix `achievement.ts` chain**

- Same treatment for whatever slice owns `achievement.ts` — confirm via discovery step 4 which slice that is, apply the same default/`index.server.ts` split.

**Phase 3 — Sweep remaining 43 files**

- Apply the same pattern to every other domain flagged by discovery step 1/2 as having a value-level DTO export in a default barrel.
- Mechanical once the pattern is proven in Phase 1–2 (same "mechanical migration" characterization used for ADR-024's original ~105-file sweep).

**Phase 4 — Genuine client call-site remediation (only if discovery step 3 finds any)**

- For each real `toXxxDTO()` invocation from client code, relocate the parse to the server boundary that already holds the raw row, and pass the already-shaped DTO down as props/query data instead.
- This phase is scoped and gated separately (G2) since it's the only part of this advisory with meaningful behavioral risk.

## 6. Risk Register

| Risk                                                                                                                           | Severity | Mitigation                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Genuine client-side `toXxxDTO()` call sites exist (not just type usage)                                                        | Medium   | Discovery step 3 before any Phase 4 work; treat each as its own small fix, not a blanket exemption.                                                                                                                                                                                                        |
| Some of the 45 domains never had an `index.server.ts` created (new slices since ADR-024)                                       | Low      | Discovery step 5 flags which need one created; creation is the same mechanical pattern ADR-024 already documents.                                                                                                                                                                                          |
| Type-only re-export still triggers bundler evaluation due to `export *` elsewhere in the chain (as seen with `achievement.ts`) | Medium   | Discovery step 4 must cover **all** 45 files, not just content, before declaring this resolved.                                                                                                                                                                                                            |
| Regression recurs on the next DTO-touching change                                                                              | Low      | Once Phase 3 is complete, consider a Steiger/ESLint rule (same category as `no-public-api-sidestep`) that flags any `shared/api/dto` file importing `../db` from being re-exported by a slice's default `index.ts` — flagged here as a possible follow-up, not required for this advisory's done criteria. |

## 7. Done Criteria

- ✅ `content` and `achievement`-owning slice both build clean on the client bundle (achievement.ts fixed by removing `export * from '../dto'` from @api/shared; content.ts fixed by gating mappers behind index.server.ts).
- ✅ All 45 DTO files audited; only `entities/content` had value-level DTO exports in default barrel — now moved to index.server.ts.
- ✅ Type-only exports (`ContentDTO` etc.) remain available from slice's default `index.ts` via `export type { ContentDTO } from '@api/server'`.
- ✅ No genuine client-side `toXxxDTO()` invocations found in discovery (G2 auto-cleared).
- ✅ 173 existing tests pass; no new Steiger/ESLint violations.
- ✅ G4 in ADVISORY-024 marked resolved.
- ✅ ADVISORY-025 executed.

## 8. Decision Gates

**G1 — Scope confirmation.** Confirm the audit and fix apply to all 45 DTO files (not just `content`), since the `achievement.ts` trace shows the regression is systemic. _Awaiting DavDev confirmation._

**G2 — Genuine call-site handling.** If discovery step 3 finds real client-side invocations of a `toXxxDTO()` mapper (not just type imports), confirm the remediation is to move parsing server-side (Phase 4) rather than to weaken the server-only boundary to accommodate them. _Blocking, pending discovery output._

No phase beyond discovery executes until G1–G2 are resolved.
