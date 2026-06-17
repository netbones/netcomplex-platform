# Phase 101: Soft Deletes — Plan Review

**Reviewer:** gsd-plan-checker
**Date:** 2026-06-17
**Status:** BLOCKED — 4 HIGH issues found. Must fix before execution.

---

## Verification Methodology

Goal-backward analysis: start from the 18 locked decisions (D-01 through D-18) and the ROADMAP.md phase goal, then verify each plan task delivers against them.

**Dimensions evaluated:** Requirement Coverage, Task Completeness, Dependency Correctness, Key Links Planned, Scope Sanity, Verification Derivation, Context Compliance, Architectural Tier Compliance, Cross-Plan Data Contracts.

---

## Coverage Summary

| Decision                                  | Plan(s) | Status                                                        |
| ----------------------------------------- | ------- | ------------------------------------------------------------- |
| D-01: `deletedAt DateTime?` field         | 01      | ✅ Covered                                                    |
| D-02: `Message.isDeleted`→`deletedAt`     | 01      | ✅ Covered                                                    |
| D-03: `deletedAt` on maintenance entities | 01      | ✅ Covered                                                    |
| D-04: Fix Group hard-delete               | 02      | ✅ Covered                                                    |
| D-05: Apply to 22 domain entities         | 01      | ✅ Schema coverage; ⚠️ Route coverage incomplete (see issues) |
| D-06: Skip auth/internal tables           | 01      | ✅ Covered                                                    |
| D-07: Always soft-delete (no conditional) | 02, 03  | ✅ Covered                                                    |
| D-08: PATCH/PUT reject deleted records    | 02, 03  | ⚠️ Partial — see Issue #1                                     |
| D-09: `notDeleted()` query wrapper        | 01      | ✅ Covered                                                    |
| D-10: All GET/LIST use wrapper            | 02, 03  | ⚠️ Partial — see Issue #1                                     |
| D-11: Stats filter deleted records        | 03      | ✅ Covered                                                    |
| D-12: Partial unique indexes              | 01      | ✅ Covered (5 indexes)                                        |
| D-13: Entities with unique constraints    | 01      | ✅ Covered                                                    |
| D-14: No restore endpoints                | —       | ✅ Respected (not in any plan)                                |
| D-15: No admin view                       | —       | ✅ Respected (not in any plan)                                |
| D-16: 90-day auto-purge cron              | 03      | ✅ Covered                                                    |
| D-17: Integrate with existing cron infra  | 03      | ✅ Covered                                                    |
| D-18: No `deletedById` tracking           | —       | ✅ Respected (not in any plan)                                |

---

## HIGH Issues (Blockers — must fix before execution)

### Issue #1: Route files for D-05 entities NOT covered by any plan

**Severity:** HIGH
**Plan reference:** Cross-plan (all plans)
**Dimension:** Requirement Coverage

**Description:** Four D-05 domain entities have route files with handlers that need conversion but are NOT included in any plan's `files_modified` list. Without these conversions:

- **D-10** ("All existing LIST/GET endpoints must use `notDeleted()`") is violated
- **D-08** ("PATCH/PUT must reject updates to soft-deleted records") is violated for PUT endpoints

**Affected files:**

| File                                                          | Entity                  | Has        | Needs                                                    | Missing From  |
| ------------------------------------------------------------- | ----------------------- | ---------- | -------------------------------------------------------- | ------------- |
| `src/app/api/surveys/[id]/route.ts`                           | Survey                  | GET + PUT  | `notDeleted()` on GET, 410 guard on PUT                  | Plans 02 & 03 |
| `src/app/api/surveys/route.ts`                                | Survey                  | GET (LIST) | `notDeleted()` on GET list                               | Plans 02 & 03 |
| `src/app/api/conversations/route.ts`                          | Conversation            | GET + POST | `notDeleted()` on GET — AND fix `messages.isDeleted` ref | Plans 02 & 03 |
| `src/app/api/community-services/reviews/[listingId]/route.ts` | CommunityServiceReview  | GET + POST | `notDeleted()` on GET                                    | Plans 02 & 03 |
| `src/app/api/community-services/inquiries/route.ts`           | CommunityServiceInquiry | GET + POST | `notDeleted()` on GET                                    | Plans 02 & 03 |

**Evidence:**

1. **surveys/[id]/route.ts** — GET at line 55-59 queries `db.select().from(surveys).where(and(eq(...), eq(...)))` without `notDeleted()`. PUT at line 100-131 reads and updates the record but does NOT check `deletedAt` before mutating (data resurrection vulnerability — violates D-08).

2. **conversations/route.ts** — GET at line 31-50 queries conversations without `notDeleted()`. **CRITICALLY**, line 83 selects `isDeleted: messages.isDeleted` — this field is REMOVED from the schema in Plan 01. After Plan 01 runs, this file will FAIL typecheck. It must be updated to use `deletedAt` instead.

3. **community-services/reviews/[listingId]/route.ts** — GET at line 37-60 queries reviews without `notDeleted()`.

4. **community-services/inquiries/route.ts** — GET lists inquiries (D-05 entity) without `notDeleted()`.

**Recommendation:**

- Add these 5 files to Plan 02 or Plan 03's `files_modified` list
- For each file, apply `notDeleted()` to GET queries and 410 guard to mutation handlers (PUT/PATCH/DELETE where they exist)
- For conversations/route.ts specifically: replace `isDeleted: messages.isDeleted` with equivalent `deletedAt` selection (or remove if unused downstream)

---

### Issue #2: `conversations/route.ts` will break after Plan 01 migration

**Severity:** HIGH
**Plan reference:** Cross-plan
**Dimension:** Requirement Coverage / Task Completeness

**Description:** `src/app/api/conversations/route.ts` line 83 references `messages.isDeleted` in a SELECT query:

```typescript
isDeleted: messages.isDeleted,
```

Plan 01 Task 1 Category B removes `isDeleted` from the Message model (replaces it with `deletedAt`). After `npx prisma generate` regenerates the Drizzle schemas, `messages.isDeleted` will no longer exist. Any file referencing it will fail typecheck.

Conversations route is NOT in any plan's `files_modified`, so this breakage will remain unfixed. This means `pnpm tsc --noEmit` will fail after Plan 01 (contradicting Plan 01's Task 3 acceptance criteria that says "report any failures NOT related to isDeleted").

**Note:** Plan 01's Task 3 says "typecheck may fail on route files that reference `isDeleted`... this is expected and will be fixed in Plans 02 and 03." But conversations/route.ts is NOT in Plan 02 or Plan 03's `files_modified`.

**Recommendation:**

- Add `src/app/api/conversations/route.ts` to Plan 02 or Plan 03's `files_modified`
- Replace `isDeleted: messages.isDeleted` with an appropriate `deletedAt` reference, or remove the field from the select if the caller doesn't use it

---

## MEDIUM Issues (Warnings — fix recommended before execution)

### Issue #3: Plan 03 has 4 tasks — borderline scope

**Severity:** MEDIUM
**Plan reference:** 101-03-PLAN.md
**Dimension:** Scope Sanity

**Description:** Plan 03 has 4 tasks:

1. Convert 4 secondary entity route files
2. Update stats routes (2 files)
3. Create auto-purge cron endpoint (1 new file)
4. Final verification checkpoint

This enters warning territory (4 tasks). While each task is small, combining secondary entity routes + stats + a NEW endpoint + final verification in one plan is a lot. If any task hits issues, the ripple effect on the plan's timeline is amplified. The plan also handles route conversion for files whose existence is uncertain ("Read the file to determine if DELETE handler exists").

**Metrics:**

- Tasks: 4 (warning threshold)
- Files modified: 7 existing + 1 new + auto-generated Drizzle schemas
- Task 1 alone covers 4 files with uncertain handler structures

**Recommendation:** Consider splitting Task 3 (purge endpoint) into a separate Plan 04 at Wave 2. This isolates the risk of the new endpoint from the route conversions.

---

### Issue #4: `community-services/moderation/listings/[id]/route.ts` — DELETE handler not addressed

**Severity:** MEDIUM
**Plan reference:** 101-02-PLAN.md, 101-03-PLAN.md
**Dimension:** Requirement Coverage

**Description:** `src/app/api/community-services/moderation/listings/[id]/route.ts` has a DELETE handler (line 262) and PUT handler (line 192). This is a moderation (admin) endpoint for community service listings. CommunityServiceListing IS a D-05 entity.

The plans cover `community-services/listings/[id]/route.ts` (the standard listing route) but NOT the moderation variant. If the moderation route hard-deletes, it bypasses the soft-delete pattern.

**Recommendation:** Verify whether this moderation route uses `db.delete()` for its DELETE handler. If so, convert to `db.update().set({deletedAt})`. Add the file to Plan 02 or 03's `files_modified`.

---

### Issue #5: Purge endpoint action contains confusing dual code versions

**Severity:** LOW
**Plan reference:** 101-03-PLAN.md Task 3
**Dimension:** Task Completeness

**Description:** Plan 03 Task 3's action section first shows purge code with `typeof` guards (lines 228-426), then says "IMPORTANT: The code above uses generic table variable names... These MUST match the actual exported Drizzle table names" and on line 432-448 recommends removing the `typeof` guards entirely, presenting a cleaner version.

This dual-version approach is confusing. An executor might write the first version (with `typeof` guards) and miss the edit instructions. The `typeof` guard pattern is explicitly described as "NOT standard TypeScript for checking Drizzle table existence."

**Recommendation:** Remove the first (guarded) code version from the action. Keep only the recommended clean version. This reduces ambiguity during execution.

---

### Issue #6: PATTERNS.md lists 26 D-05 entities and 7 partial unique indexes — inconsistent with CONTEXT.md

**Severity:** LOW
**Plan reference:** 101-PATTERNS.md
**Dimension:** Verification Derivation

**Description:** PATTERNS.md line 193 lists 26 entities including CompetitionEntry, EventAttendee, SurveySection, Response — but D-05 explicitly excludes these child records. PATTERNS.md also lists 7 partial unique indexes (lines 402-412) including two for `profile` model, but Plan 01 correctly handles only 5 (profile is not a D-05 entity).

The PLANS themselves are correct (Plan 01 Task 1 explicitly says "Do NOT touch CompetitionEntry, EventAttendee, SurveySection, Response"), but the inconsistency in PATTERNS.md creates confusion. An executor who consults PATTERNS.md first might incorrectly add `deletedAt` to these entities.

**Recommendation:** Update PATTERNS.md line 193 to align with D-05 scope (remove CompetitionEntry, EventAttendee, SurveySection, Response). Remove profile unique constraints from the partial index table (lines 404-405 for `profile_*_key` entries).

---

## Verified Correct (Notable strengths)

### Dependency Graph

Plan 01 (Wave 1) → Plans 02 & 03 (Wave 2). Correct — all route conversions depend on schema changes and the `notDeleted()` helper. No cycles.

### 18 Decision Coverage

All 18 D-XX decisions are either implemented in plans or respected by exclusion:

- D-14 (no restore): Respected — no restore endpoints in any plan ✓
- D-15 (no admin view): Respected — no admin view endpoints ✓
- D-18 (no deletedById): Respected — no `deletedById` field ✓
- Deferred ideas (restore, admin manager, deletedById, event sourcing): None appear in plans ✓

### Task Completeness

All 10 tasks across 3 plans have complete structures: `<read_first>`, `<action>`, `<acceptance_criteria>`, `<verify>`, `<done>`. The CHECKPOINT tasks correctly use `gate="blocking"`.

### Schema Changes (Plan 01)

The 25-model count (22 from D-05 + 3 maintenance from D-03) is correct. The Message migration (UPDATE before DROP COLUMN) is correctly planned. The 5 partial unique indexes match D-12 scope.

### notDeleted() Helper Design

The helper's minimal interface `{ deletedAt: unknown }` avoids circular imports. Barrel export via `@api/server` is correct. All planned to be the first condition in `and(...)` arrays.

### Auto-Purge Endpoint (Plan 03 Task 3)

Correctly implements ADMIN-only auth, 90-day hardcoded cutoff, returns purge counts. Integration with Vercel Cron Jobs is deferred (as the endpoint is the integration point).

### stats/route.ts and data-fetching.ts Updates

Plan 03 Task 2 correctly adds `notDeleted()` filtering while preserving `isActive` lifecycle filters. The guidance to NOT modify queries for entities without `deletedAt` is correct.

### Threat Models

Each plan includes a thorough STRIDE threat register. Mitigations are appropriate. No security gaps identified.

---

## Verification Checklist Results

| Dimension                     | Status                                                  |
| ----------------------------- | ------------------------------------------------------- |
| Requirement Coverage          | ❌ FAIL (Issue #1, #2)                                  |
| Task Completeness             | ✅ PASS                                                 |
| Dependency Correctness        | ✅ PASS                                                 |
| Key Links Planned             | ✅ PASS                                                 |
| Scope Sanity                  | ⚠️ WARNING (Issue #3)                                   |
| Verification Derivation       | ⚠️ WARNING (Issue #6)                                   |
| Context Compliance            | ❌ FAIL (Issue #1, #2 — D-08, D-10 not fully delivered) |
| Architectural Tier Compliance | ✅ PASS                                                 |
| Cross-Plan Data Contracts     | ✅ PASS                                                 |
| AGENTS.md Compliance          | ✅ PASS                                                 |

---

## Structured Issues

```yaml
issues:
  - plan: 'cross-plan'
    dimension: 'requirement_coverage'
    severity: 'blocker'
    description: "Route files for 4 D-05 entities (surveys/[id], surveys, conversations, reviews/[listingId], inquiries) not included in any plan's files_modified — violates D-08 and D-10"
    fix_hint: "Add 5 route files to Plan 02 or Plan 03's files_modified with notDeleted() GET filter + 410 guard on mutation handlers"

  - plan: 'cross-plan'
    dimension: 'requirement_coverage'
    severity: 'blocker'
    description: "conversations/route.ts line 83 references messages.isDeleted which will be removed by Plan 01 — file will fail typecheck after migration and is not listed in any plan's files_modified"
    fix_hint: "Add conversations/route.ts to Plan 02 or 03's files_modified and fix isDeleted reference"

  - plan: '101-03-PLAN.md'
    dimension: 'scope_sanity'
    severity: 'warning'
    description: 'Plan 03 has 4 tasks — enters warning territory. Combining secondary route files + stats + new purge endpoint + final verification in one plan increases risk'
    fix_hint: 'Consider splitting purge endpoint (Task 3) into a separate Plan 04, or proceed with 4 tasks if each is confirmed small'

  - plan: 'cross-plan'
    dimension: 'requirement_coverage'
    severity: 'warning'
    description: 'community-services/moderation/listings/[id]/route.ts has DELETE + PUT handlers but is not in any plan. Moderation routes might bypass soft-delete'
    fix_hint: 'Verify moderation DELETE handler behavior and add to plans if it hard-deletes'

  - plan: '101-03-PLAN.md'
    dimension: 'task_completeness'
    severity: 'low'
    description: 'Purge endpoint action contains confusing dual code versions (typeof guards + recommended clean version). Risk executor writes wrong version'
    fix_hint: 'Remove the typeof-guard version from the action. Keep only the recommended clean import pattern'

  - plan: '101-PATTERNS.md'
    dimension: 'verification_derivation'
    severity: 'low'
    description: "PATTERNS.md lists 26 D-05 entities and 7 partial unique indexes — inconsistent with CONTEXT.md's actual D-05 scope (22 entities, 5 indexes)"
    fix_hint: 'Update PATTERNS.md to remove CompetitionEntry, EventAttendee, SurveySection, Response from D-05 list and profile constraints from partial index table'
```

---

## Recommendation

**BLOCKED — 4 HIGH issues found. Must fix before execution.**

### Required fixes (blockers):

1. **Add 5 uncovered route files** to Plans 02 or 03: `surveys/[id]/route.ts`, `surveys/route.ts`, `conversations/route.ts`, `community-services/reviews/[listingId]/route.ts`, `community-services/inquiries/route.ts`. Apply `notDeleted()` to GET queries and 410 guard to mutation handlers.

2. **Fix conversations/route.ts `isDeleted` reference** — line 83 will break after Plan 01 removes the column.

### Recommended fixes (warnings):

3. Consider splitting Plan 03 if scope risk is concerning.
4. Verify moderation route's DELETE handler.
5. Clean up purge endpoint code template (dual version confusion).
6. Align PATTERNS.md with CONTEXT.md for entity count and index count.

### Revised plan structure after fixes:

| Wave | Plan | Objective                                                                                      | Modified   |
| ---- | ---- | ---------------------------------------------------------------------------------------------- | ---------- |
| 1    | 01   | Schema foundation: `deletedAt` on 25 models, migration, `notDeleted()` helper, partial indexes | No change  |
| 2    | 02   | Primary entity route conversions (existing) + surveys + conversations                          | +2-3 files |
| 2    | 03   | Secondary entity routes + stats + purge (consider splitting purge to Plan 04)                  | +2-3 files |
