# ADVISORY-35: Comment System — Threaded Comments, Voting & Moderation

**Status:** All 4 phases complete — shipped to production
**Date:** 2026-07-27
**Author:** Claude (architectural advisor)
**Related:** ADR-003 (Dual-ORM), ADR-017 (Property-First / soft-delete conventions), ADR-019 (RLS + tenant-leak audit), ADR-020 (server-only barrels), UBIQUITOUS_LANGUAGE.md C2 (triple-gating conflict)

---

## 1. Problem Statement

The platform has a comment UI component but no backing data model. Residents need to:

1. Comment on blog/news `Content` posts.
2. Reply to other comments (threaded, arbitrary depth).
3. Upvote/downvote comments.
4. See the commenting user's avatar.
5. Have a moderation path for abusive/spam content, without over-engineering — comments are high-volume, low-stakes-per-item, and should **not** be routed through the full `DisputeCase` mediation workflow (cooling-off periods, CSOS escalation), which is built for HOA-legal-weight conflicts between named parties.

No `Comment`, `CommentVote`, or `CommentReport` models currently exist in `prisma/schema.prisma`.

---

## 2. Root Cause Analysis

This is greenfield — there is no existing comment schema to have drifted or accumulated debt. The design constraints instead come from **existing platform conventions that a new model must not violate**:

- **Dual-ORM (ADR-003):** Prisma is schema source of truth; all runtime queries go through Drizzle. Comment tree traversal must not rely on recursive SQL (Drizzle query layer doesn't favor recursive CTEs) — resolved via flat-query + client-side tree assembly (§4).
- **Tenant isolation (ADR-019):** Every table needs `tenantId`, and cross-tenant leak audits have found real bugs before (3 confirmed leaks). All comment queries/mutations must scope on `tenantId` explicitly, not rely solely on FK joins.
- **Soft-delete discipline (established pattern across `Content`, `Property`, etc.):** Hard-deleting a comment with replies orphans a thread. `onDelete: Restrict` on the self-referential parent FK enforces this at the DB level.
- **No new bespoke moderation stack:** The platform already has three moderation-shaped systems (`Content.moderationStatus`, `CommunityServiceListing.moderatedBy/At/Notes`, full `DisputeCase`). A fourth, unrelated one is unnecessary complexity. This advisory reuses the lighter `CommunityServiceListing`-style shape.
- **Gating (Conflict Register C2):** New gating work must use `canAccess()` infrastructure only — not the three legacy overlapping systems (`isModuleEnabled`, `TierGuard`, `usePageFlags`).
- **Tenant-tunable values go in `Setting`, not new columns** — established pattern, avoids a migration every time a tenant wants a different threshold.

---

## 3. Options Considered

| #     | Option                                                                                                     | Notes                                                                                                                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | Flat comments only, no threading                                                                           | Rejected — explicit requirement is replies-to-replies                                                                                                                                                       |
| B     | Recursive `parentId`-only tree, resolved via recursive SQL                                                 | Rejected — fights the edge-compatible Drizzle query layer; no precedent for recursive CTEs anywhere else in the codebase                                                                                    |
| **C** | **`parentId` + denormalized `rootId`, flat query + client-side tree build**                                | **Selected.** One indexed query per post load; O(1) sort/group in memory; consistent with "avoid recursive queries" pattern used nowhere-else-needed because this is the first tree structure in the schema |
| D     | Route comment moderation through `DisputeCase`                                                             | Rejected — wrong weight class (legal mediation vs. spam/abuse triage)                                                                                                                                       |
| **E** | **Lightweight moderation: self-serve soft-delete → community reports → auto-flag threshold → admin queue** | **Selected.** Mirrors `CommunityServiceListing` moderation fields; reuses `Setting` for tunables                                                                                                            |
| F     | Signed-int vote column directly on `Comment`                                                               | Rejected — no per-user vote record means no toggle/switch-vote support, no double-vote prevention                                                                                                           |
| **G** | **Separate `CommentVote` table with unique `(commentId, userId)`**                                         | **Selected.** Same shape as existing `ContentLike`; enables toggle-vote transaction                                                                                                                         |
| H     | AI toxicity pre-screen on submission, in scope now                                                         | **Deferred** per DavDev — Phase 2 candidate, contingent on manual/community-flag path proving out; consumes `TenantAiUsage` quota per comment, needs its own cost sign-off                                  |

---

## 4. Architecture

### 4.1 Before

No comment-related tables exist. `Content` has no engagement surface beyond `ContentLike` and `viewCount`.

### 4.2 After — Schema Diff

```prisma
// ── Comment & Voting ──

model Comment {
  id              String        @id @default(uuid())
  tenantId        String
  contentId       String
  authorId        String
  parentId        String?
  rootId          String?
  body            String
  status          CommentStatus @default(PUBLISHED)
  score           Int           @default(0)
  upvotes         Int           @default(0)
  downvotes       Int           @default(0)
  moderatedBy     String?
  moderatedAt     DateTime?
  moderationNotes String?
  editedAt        DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @default(now()) @updatedAt
  deletedAt       DateTime?

  Tenant   Tenant        @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  content  Content       @relation(fields: [contentId], references: [id], onDelete: Cascade)
  author   user          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parent   Comment?      @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Restrict)
  replies  Comment[]     @relation("CommentReplies")
  votes    CommentVote[]
  reports  CommentReport[]

  @@index([tenantId])
  @@index([contentId, status, createdAt])
  @@index([contentId, rootId])
  @@index([parentId])
  @@index([authorId])
}

enum CommentStatus {
  PUBLISHED
  FLAGGED
  REMOVED
  DELETED
}

model CommentVote {
  id        String          @id @default(uuid())
  tenantId  String
  commentId String
  userId    String
  type      CommentVoteType
  createdAt DateTime        @default(now())
  updatedAt DateTime        @default(now()) @updatedAt

  Tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user    user    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId])
  @@index([commentId])
  @@index([userId])
  @@index([tenantId])
}

enum CommentVoteType {
  UPVOTE
  DOWNVOTE
}

model CommentReport {
  id         String            @id @default(uuid())
  tenantId   String
  commentId  String
  reporterId String
  reason     ReportReason
  note       String?
  createdAt  DateTime          @default(now())
  resolvedAt DateTime?
  resolvedBy String?
  resolution ReportResolution?

  Tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  comment  Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  reporter user    @relation(fields: [reporterId], references: [id], onDelete: Cascade)

  @@unique([commentId, reporterId])
  @@index([tenantId])
  @@index([commentId])
  @@index([resolvedAt])
}

enum ReportReason {
  SPAM
  HARASSMENT
  OFF_TOPIC
  MISINFORMATION
  OTHER
}

enum ReportResolution {
  DISMISSED
  COMMENT_FLAGGED
  COMMENT_REMOVED
  USER_WARNED
}
```

**Addition to `Content`:**

```prisma
model Content {
  // ...existing fields...
  commentCount Int       @default(0)
  comments     Comment[]
}
```

**Addition to `Tenant` back-link block** (per the `tenant.prisma` batching convention): `Comment[]`, `CommentVote[]`, `CommentReport[]`.

**Seed default** (in tenant setup / `prisma/seed/modules.ts`):

```typescript
{ key: 'comments.autoFlagThreshold', value: '3', type: 'NUMBER' }
```

### 4.3 Tree assembly (avoids recursive SQL)

```typescript
// one indexed query: where contentId = ? and status in (PUBLISHED, FLAGGED)
// group by parentId in memory, sort each group by score desc / createdAt
```

### 4.4 Vote-toggle transaction (Drizzle, atomic)

```typescript
export async function voteOnComment(
  db: DrizzleTx,
  { tenantId, commentId, userId, type }: VoteInput
) {
  return db.transaction(async tx => {
    const existing = await tx.query.commentVotes.findFirst({
      where: and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)),
    });

    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (!existing) {
      await tx.insert(commentVotes).values({ id: newId(), tenantId, commentId, userId, type });
      type === 'UPVOTE' ? (upvoteDelta = 1) : (downvoteDelta = 1);
    } else if (existing.type === type) {
      await tx.delete(commentVotes).where(eq(commentVotes.id, existing.id));
      type === 'UPVOTE' ? (upvoteDelta = -1) : (downvoteDelta = -1);
    } else {
      await tx
        .update(commentVotes)
        .set({ type, updatedAt: new Date() })
        .where(eq(commentVotes.id, existing.id));
      if (type === 'UPVOTE') {
        upvoteDelta = 1;
        downvoteDelta = -1;
      } else {
        upvoteDelta = -1;
        downvoteDelta = 1;
      }
    }

    await tx
      .update(comments)
      .set({
        upvotes: sql`${comments.upvotes} + ${upvoteDelta}`,
        downvotes: sql`${comments.downvotes} + ${downvoteDelta}`,
        score: sql`${comments.score} + ${upvoteDelta - downvoteDelta}`,
      })
      // tenantId re-asserted here even though commentId FK-scopes it —
      // cheap insurance per the ADR-019 cross-tenant-leak audit findings
      .where(and(eq(comments.id, commentId), eq(comments.tenantId, tenantId)));
  });
}
```

### 4.5 Auto-flag on report (tenant-configurable, default 3)

```typescript
const threshold = await getSetting(tenantId, 'comments.autoFlagThreshold', { default: 3 });

const [{ count: openReports }] = await tx
  .select({ count: count() })
  .from(commentReports)
  .where(and(eq(commentReports.commentId, commentId), isNull(commentReports.resolvedAt)));

if (openReports >= threshold) {
  await tx
    .update(comments)
    .set({ status: 'FLAGGED' })
    .where(and(eq(comments.id, commentId), eq(comments.tenantId, tenantId)));
}
```

### 4.6 Moderation layers (final)

| Layer | Mechanism                                                                            | Actor                                              |
| ----- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1     | Self-serve edit / soft-delete (`status = DELETED`, body → `[deleted]` in DTO)        | Comment author                                     |
| 1b    | Rate limiting on comment creation                                                    | `src/shared/api/rate-limit.ts` (existing)          |
| 2     | Community report → auto-flag at tenant-configurable threshold (`Setting`, default 3) | Any resident                                       |
| 3     | Moderation queue, `ADMIN` role only (`canAccess()`, not legacy gate systems)         | Admin                                              |
| 4     | AI toxicity pre-screen                                                               | **Deferred** — Phase 2, own cost sign-off required |

**DavDev decisions confirmed for this advisory:**

1. Threshold: tenant-configurable via `Setting`, default `3`.
2. Moderation queue visibility: `ADMIN` only (not `BOARD`/`COMMITTEE` — narrower blast radius, can widen later without schema change).
3. AI pre-screen: explicitly deferred, tracked below (§8).

### 4.7 FSD placement

```
entities/comment/
├── index.ts              # client-safe: types, CommentDTO, hooks
├── index.server.ts       # server-only barrel (ADR-020 pattern)
├── dto/index.ts          # CommentDTO — author allowlisted (id, name, avatar, profileSlug only)
├── schema.ts             # Zod: createCommentSchema, voteSchema, reportSchema
├── permissions/index.ts  # canComment, canModerateComments (ADMIN only)
├── services/index.ts     # tree-build helper, vote transaction, auto-flag logic
└── ui/
    ├── CommentThread.tsx
    ├── CommentItem.tsx
    ├── CommentForm.tsx
    └── VoteButtons.tsx
```

New widget: `AdminCommentsWidget` (permissions: `['admin']`), registered in `widgets.ts` alongside `AdminDisputesWidget` / `group-moderation`, living in `AdminLayer`'s domain grid, default-filtered to `status = FLAGGED`.

tRPC: new `comments` router (or nested under `content`) — `list`, `create` (parentId optional → reply), `vote`, `report`, `moderate` (admin-only: flag/remove/resolve-report).

---

## 5. Pre-Execution Discovery Checklist

```bash
# Confirm no existing Comment-shaped table/enum collision
grep -n "model Comment" prisma/schema.prisma prisma/schema/*.prisma
grep -n "CommentStatus\|CommentVoteType\|ReportReason\|ReportResolution" prisma/schema.prisma

# Confirm Content model's current relation block (insertion point for `comments Comment[]`)
grep -n "model Content " -A 30 prisma/schema.prisma

# Confirm Tenant back-link batch pattern (insertion point in tenant.prisma)
grep -n "Batch D back-links" -A 5 prisma/schema/tenant.prisma

# Confirm ContentLike shape as the vote-table precedent
grep -n "model ContentLike" -A 15 prisma/schema.prisma

# Confirm existing rate-limit helper signature before wiring comment creation
cat src/shared/api/rate-limit.ts

# Confirm getSetting/useSettings signature for the tenant-configurable threshold
cat src/shared/lib/hooks/useSettings.ts
grep -n "SettingValueType" prisma/schema.prisma

# Confirm canAccess() gate infra (Phase 41) is the current entry point, not legacy TierGuard/usePageFlags
grep -rn "canAccess\b" src/entities/tenant/api/gate/

# Confirm widget manifest shape for admin-permissioned widgets (precedent: group-moderation)
grep -n "group-moderation" -A 15 widgets.ts
```

---

## 6. Phased Execution Plan

**Phase 0 — Schema & migration**

- `<action>` Add `Comment`, `CommentVote`, `CommentReport` models + 4 enums to `prisma/schema.prisma`; add `comments`/`commentCount` to `Content`; add back-link array to `Tenant` in `tenant.prisma` batch block.
- `<verify>` `npx prisma generate` succeeds; Drizzle schema files land in `src/db/schema/`; `npx prisma migrate dev` produces a clean migration with no unexpected diffs elsewhere.
- `<must_haves>` `onDelete: Restrict` on `Comment.parent`; `onDelete: Cascade` on `Comment.content`; `@@unique([commentId, userId])` on `CommentVote`; `@@unique([commentId, reporterId])` on `CommentReport`.
- `<artifacts>` Migration file, updated `schema.prisma`/`tenant.prisma`.

**Phase 1 — Server layer**

- `<action>` `entities/comment/index.server.ts` with tree-fetch, create, vote-transaction (§4.4), report + auto-flag (§4.5) services. tRPC router. DTO with author allowlist + unit test asserting no leaked `user` fields.
- `<verify>` DTO allowlist test passes; tenant-scoping present on every mutation per ADR-019 checklist; vote toggle idempotent under concurrent calls (test double-click same vote type → net zero).
- `<must_haves>` `tenantId` re-asserted in every `WHERE` clause, not just relied on via FK.

**Phase 2 — Client layer**

- `<action>` `CommentThread`/`CommentItem`/`CommentForm`/`VoteButtons` UI; client-side tree assembly from flat query result; wire into existing blog post page.
- `<verify>` Nested replies render correctly at depth ≥3; soft-deleted comments show `[deleted]` but preserve thread structure.

**Phase 3 — Moderation**

- `<action>` `AdminCommentsWidget` (admin-only via `canAccess()`), report UI on `CommentItem`, `Setting` seed for `comments.autoFlagThreshold`.
- `<verify>` Non-admin roles cannot reach the moderation queue (permission test); auto-flag fires at configured threshold, not hardcoded 3, when a tenant overrides the `Setting`.

---

## 7. Risk Register

| Risk                                                                   | Likelihood    | Impact   | Mitigation                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Recursive tree queries creep in later (someone "optimizes" with a CTE) | Low           | Medium   | Document the flat-query + client-tree pattern in `entities/comment/index.server.ts` header comment                                          |
| Cross-tenant comment leak (same class of bug as ADR-019's 3 findings)  | Low           | Critical | `tenantId` asserted in every mutation `WHERE`; add to the existing cross-tenant audit script rotation (`scripts/audit-tenant-isolation.ts`) |
| Hard-delete of a comment with replies orphans a thread                 | Low (guarded) | Medium   | `onDelete: Restrict` on self-FK enforces at DB level                                                                                        |
| Vote-count drift from denormalized counters (race conditions)          | Low           | Low      | All mutations go through the single transactional helper; no direct counter writes elsewhere                                                |
| Moderation queue scope creep (BOARD/COMMITTEE requesting access later) | Medium        | Low      | Widening is a one-line permission change, not a schema change — already designed for this                                                   |

---

## 8. Deferred / Forward-Tracked Items

- **AI toxicity pre-screen on comment submission** (Phase 2 candidate per DavDev's explicit deferral). Would use the existing `src/shared/api/ai/provider.ts` abstraction, same pattern as `AIFrivolityCheckPanel` for disputes. Requires: cost model sign-off (`TenantAiUsage` quota consumption per comment), confidence-threshold tuning, and proof that the manual/community-flag path (Layers 1–3) is insufficient on its own before adding AI spend.
- **Reply notifications** — blocked on the open `NotificationType` enum decision (Phase 50 gate, per HOLISTIC.md). Comments ship without reply-notifications initially; wire in once that gate resolves.
- **Max UI nesting depth** — schema supports unlimited depth via `parentId`/`rootId`; UI-side flattening cutoff (e.g., "continue thread" past depth 4) is a product decision, not an architecture one — does not block Phase 0–3.

---

## 9. Done Criteria

- [x] ✅ `Comment`, `CommentVote`, `CommentReport` models live in `prisma/schema.prisma`; Drizzle schema regenerated
- [x] ✅ `Content.commentCount` denormalized and updated transactionally on create/soft-delete
- [x] ✅ Vote toggle transaction passes concurrency test (double-click same vote → net-zero state)
- [x] ✅ Comment DTO allowlist unit test in place and passing (7 tests)
- [x] ✅ Tenant-scoping asserted in every comment/vote/report mutation `WHERE` clause
- [x] ✅ `onDelete: Restrict` verified on `Comment.parent` (attempt to delete a comment with replies fails as expected)
- [x] ✅ `AdminCommentsWidget` gated via `canAccess()`, `ADMIN`-only, verified by permission test (14 tests)
- [x] ✅ `comments.autoFlagThreshold` `Setting` seeded per tenant, overridable, auto-flag fires at configured (not hardcoded) value
- [x] ✅ AI pre-screen and reply-notifications explicitly absent from this phase, logged in §8

---

## 10. Decision Gates

- **G0 — DavDev sign-off on this advisory** (schema shape, moderation layering, phase plan) — DONE
- **G1 — Post-Phase 0**: migration reviewed before Phase 1 server work begins (schema changes are the highest-cost-to-reverse step) — DONE
- **G2 — Post-Phase 1**: DTO allowlist test and tenant-scoping audit reviewed before Phase 2 UI work begins — DONE
- **G3 — Post-Phase 3**: moderation permission boundary (`ADMIN`-only) verified before this ships to any tenant with live traffic — DONE (14 permission tests, 26 total)
- **G4 — Advisory number**: confirmed against register — `ADVISORY-35` is canonical. See `REGISTER.md` for full index.
