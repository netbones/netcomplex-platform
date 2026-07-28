# ADVISORY-012: Community Merits — Pre-Execution Corrections

**Status:** Blocking — apply Section 5 fixes to `45-02-PLAN.md` and `45-03-PLAN.md` before wave 2/3 execution begins.
**Scope:** Phase 45 (m5b-anchor-tenant), Plans 45-02 (data model + API) and 45-03 (admin UI + standing badges)
**Severity:** One blocking defect (will fail `prisma migrate dev`), six non-blocking architectural/governance gaps
**Author:** Claude (architectural advisory) — reviewed at DavDev's request prior to agent execution

**Revision 2026-06-21 (DavDev):** `BehaviorRecord` model renamed to `CommunityMerit` (`community_merits` table) to align branding with the Community Merits feature rather than a punitive "behaviour tracking" framing. All Prisma model names, Drizzle exports, relation names, and code references updated. Migration `20260621205302_rename_behavior_record_to_community_merits` created but pending apply. The underlying enums (`BehaviorType`, `BehaviorRecordStatus`, `BehaviorCategory`) retain their names as DB-level type systems — these are internal and do not surface the behavioural framing. See also: Phase 46 `ProviderMerit` (formerly `CommunityMerit` under Provider Platform) for naming disambiguation between resident and provider merit systems.

---

## 1. Problem Statement

Plans 45-02 and 45-03 introduce a `CommunityMerit` model (formerly `BehaviorRecord` — Community Merits / standing system) with split recognition/disciplinary scoring, a dispute workflow, an infraction-count escalation engine, and admin UI + public standing badges. The plans are well-specified at the feature level but contain one defect that will halt execution at Task 4 of 45-02 (`npx prisma migrate dev`), plus several deviations from established project conventions (FSD entity placement, the `canAccess()` gating direction set in Phase 41, navigation admission criteria, dual-ORM generation order) that should be corrected before the agent starts, rather than discovered mid-execution or cleaned up in a later advisory the way ADVISORY-009 and the Phase 31 tab removal were.

This advisory documents the defects, the reasoning, and a corrected execution sequence. It does not change scope or feature intent — only model correctness, file placement, and sequencing.

---

## 2. Root Cause Analysis

### 2.1 [BLOCKING] Ambiguous Prisma relation — three unnamed FKs to `user`

`45-02-PLAN.md` Task 1, Step A defines:

```prisma
model BehaviorRecord {
  ...
  userId              String
  createdById         String
  resolvedById        String?

  user          user    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdBy     user    @relation(fields: [createdById], references: [id])
  resolvedBy    user?   @relation(fields: [resolvedById], references: [id])
  ...
}
```

Three relation fields target the same model (`user`) with no `@relation("name")` disambiguation. Prisma requires an explicit name on every relation field once a model has more than one relation to the same target — it cannot otherwise infer which forward field corresponds to which back-relation array on `user`. This is not a style preference; it is a schema validation rule, and `prisma migrate dev` / `prisma generate` will reject the schema outright.

This is a known pattern in this codebase, already handled correctly three times:

| Model             | Relation names used                                                      |
| ----------------- | ------------------------------------------------------------------------ |
| `agentAccess`     | `agentAccess_agentIdTouser`, `agentAccess_grantedByIdTouser`             |
| `propertyListing` | `propertyListing_assignedAgentIdTouser`, `propertyListing_ownerIdTouser` |
| `profile`         | `profile_landlordIdTouser`, `profile_userIdTouser`                       |

`BehaviorRecord` has _three_ relations to `user` (worse than any existing case, which only have two), and the plan also never adds the three corresponding back-relation array fields to the `user` model block — even though `prisma/schema.prisma` is listed in Task 1's `files_modified`. As written, Task 4 fails on the first migrate command and the wave stalls.

### 2.2 Hand-authored Drizzle files vs. generator-first pipeline

`schema.prisma` uses `prisma-generator-drizzle` to produce `src/db/schema/*` automatically from the Prisma model. `HOLISTIC.md` already documents the exact risk here under "Hidden Dependencies": _"If someone edits a Drizzle schema directly without updating Prisma, the next `prisma generate` will silently overwrite it. The generation pipeline is the hidden contract."_

45-02 Task 1, Steps B–D have the agent hand-write `behavior-type-enum.ts`, `behavior-records.ts`, and `behavior-records-relations.ts` with literal code, with `npx prisma generate` only running in Task 4 — after Tasks 2 and 3 have already been built against the hand-written shape. Once the relation-naming fix in 2.1 is applied, the generator's actual output (relation key names in particular — `agentAccess_agentIdTouser`-style naming, not the plan's plain `createdBy`/`resolvedBy`) will not match what was hand-typed. Generate will either silently overwrite Tasks 2–3's import targets with different field names, or leave stale duplicate files behind.

### 2.3 Self-contradicting constant — `DEFAULT_TIER_THRESHOLDS.WATCHLIST`

45-02 Task 2's `<behavior>` block (Test 2) asserts:

```
DEFAULT_TIER_THRESHOLDS.WATCHLIST === -1
```

but the `<action>` code sample for the same constant only defines `GOLD`, `SILVER`, `BRONZE`, `PROBATION` — `WATCHLIST` exists only as a code comment, not an object key:

```typescript
export const DEFAULT_TIER_THRESHOLDS = {
  GOLD: 50,
  SILVER: 20,
  BRONZE: 0,
  // Watchlist: between -1 and -20 (inclusive)
  PROBATION: -20,
} as const;
```

If the agent copies the code sample as given, the TDD test in the same task fails immediately. The `getStandingTier(overall, thresholds?: Partial<typeof DEFAULT_TIER_THRESHOLDS>)` signature is also affected — `Partial<typeof DEFAULT_TIER_THRESHOLDS>` won't even include a `WATCHLIST` key unless the object literal does.

### 2.4 No owning entity slice — inconsistent with every comparable domain

Every comparable domain (`booking`, `content`, `event`, `maintenance`, `service`) owns a full `src/entities/<name>/` slice: `schema.ts`, `dto/`, `model/`, `permissions/`, `services/`, `ui/`. Merits skips this. `merits-constants.ts` and `merits-helpers.ts` land directly in `src/shared/lib/`, and the API routes in `src/app/api/merits/*` have no owning entity at all.

This is not a Steiger `shared → entities` violation in the forbidden-imports sense — nothing illegal is imported — but it breaks the project's own structural convention, and it has a visible downstream consequence: `StandingBadge` (45-03 Task 2) is placed under `src/entities/directory/ui/` purely because there's no `entities/merit` slice to own it, even though it's consumed by both the directory grid and the standalone resident profile page, which is exactly the kind of mis-owned shared UI element ADVISORY-series work has cleaned up before.

### 2.5 Bypasses the Phase 41 `canAccess()` gating consolidation

45-02 and 45-03 gate every merits route and admin UI surface with `hasPermission(role, 'users')` exclusively. `UBIQUITOUS_LANGUAGE.md` Conflict C2 documents that the project is actively mid-migration away from ad hoc role checks toward `canAccess()` (five-layer precedence: Role → Tier → Module → PageFlag → FeatureToggle), with Phase 41 having landed the foundation specifically so new features stop adding to the legacy-pattern pile while migration is in flight. Shipping a brand-new admin feature entirely outside that system adds a fourth gating callsite pattern at the exact moment the project is trying to consolidate to one. This may be a deliberate scope decision (anchor-tenant-only, fast-tracked feature) — but it should be a stated decision, not a default.

Separately: `hasPermission(role, 'users')` is the same blunt check used for ordinary user management. Nothing in either plan restricts who can issue disciplinary points or action a `SUSPENSION_RECOMMENDATION`, despite the `Role` enum already distinguishing `COMMITTEE`, `BOARD`, and `ADMIN`. A feature that can recommend suspending a resident arguably warrants a narrower permission than "anyone who can edit users."

### 2.6 Navigation Governance — admission criteria not met

45-03 Task 3 adds `merits` directly to `ADMIN_DOMAINS` and `ADMIN_DOMAIN_WIDGET_MAP` in `src/widgets/dashboard/model/spaces.ts`. `NAVIGATION_GOVERNANCE.md`'s Admin Dashboard Tab admission criteria require **at least 2 admin-specific widgets** before a new admin domain is added. Neither plan registers a single widget in `src/widgets/dashboard/widgets.ts` (the only file that calls `registry.register()` per its own header comment). The domain itself plausibly satisfies the other three criteria (distinct administrative domain, dedicated workflows, role-scoped), but the widget requirement is unmet as written — this is a violation of the project's own documented governance, not a stylistic nit.

### 2.7 Resident-facing and admin-notification gaps

Neither plan creates a `Notification` record at any point in the merits lifecycle:

- A resident who receives a `WARNING` or `INFRACTION` has no in-product way to learn it happened — `POST /api/merits` never calls the existing `Notification` model.
- A resident whose standing has dropped into `WATCHLIST` or `PROBATION` sees the _public_ `StandingBadge` render nothing (by design, per Concern 5) — meaning the one resident-facing surface that exists deliberately goes silent exactly when the resident most needs visibility into their own status.
- `checkAndEscalateStanding` writes an audit log entry on `REVIEW_FLAG` / `SUSPENSION_RECOMMENDATION`, but nothing surfaces this to an admin proactively — `UserStandingCard` (45-03) only shows it to an admin who is already on that specific resident's page. There is no link from a `SUSPENSION_RECOMMENDATION` into the existing `/users/[id]/suspend` flow (Phase 33), despite that flow already existing and being the natural next step.

This may be acceptable for a first iteration, but it should be a tracked follow-up (BD issue or GAP entry), not silently absent.

### 2.8 POPIA / threat-model sensitivity classification

45-03's threat model rates "Standing scores" as **Low** sensitivity on the basis that negative tiers are hidden from public view. A publicly displayed positive tier is still a derived publication of disciplinary history to other residents (e.g., the _absence_ of a badge, combined with directory familiarity, can itself be informative), and neither plan describes resident notice or any opt-out. Given POPIA compliance is an active project-wide requirement (per project context), this classification deserves an explicit decision rather than a default "Low," particularly paired with the notification gap in 2.7.

### 2.9 Minor — TDD tasks with no test files; stale cross-reference

Several tasks are marked `tdd="true"` with detailed `<behavior>` test lists, but no `*.test.ts` files appear in either plan's `files_modified`, and neither plan's `<verify>` block runs anything beyond `pnpm typecheck && pnpm build` — no `pnpm lint`, no `vitest`. Compare to the existing `src/test/api/maintenance.test.ts` pattern, which this feature's API surface most closely resembles. Separately, 45-02 Task 1 Step E says "same pattern as original Task 1 Steps E-G" — there is no such step range in the current plan numbering; it's an editing leftover on the one step that has no code sample for three non-trivial wiring edits (barrel, db proxy, server index).

---

## 3. Options Considered

**For 2.1 (relation naming):**

- _Option A — Named relations, one row per actor (chosen)._ Add `@relation("BehaviorRecordSubject")`, `@relation("BehaviorRecordCreatedBy")`, `@relation("BehaviorRecordResolvedBy")` and matching back-relation arrays on `user`. Matches existing codebase convention exactly (see 2.1 table).
- _Option B — Drop `createdBy`/`resolvedBy` as direct relations, store as plain `String` columns without FK._ Rejected: loses referential integrity and `onDelete` semantics; inconsistent with `RequestNote`/`RequestHistory` which do use proper `user` relations for their actor fields.

**For 2.4 (entity placement):**

- _Option A — New `src/entities/merit/` slice (chosen)._ Matches every comparable domain; gives `StandingBadge` a correct home (`entities/merit/ui/StandingBadge.tsx`) instead of borrowing `entities/directory`.
- _Option B — Leave in `shared/lib` as planned._ Rejected: inconsistent with project convention, defers cleanup to a future advisory the project has explicitly tried to avoid (see ADVISORY-009 precedent on Steiger consolidation).

**For 2.5 (gating):**

- _Option A — Migrate to `canAccess()` now._ Correct long-term, but adds scope/risk to an already multi-task wave and duplicates work Phase 41 hasn't finished landing platform-wide.
- _Option B — Keep `hasPermission()` for this phase, but narrow it and flag the legacy-pattern debt explicitly (chosen, pending DavDev confirmation)._ Lowest risk to ship; adds one line to the gate-system tracking rather than silently growing it.

This advisory recommends **Option B** for gating as the default unless DavDev specifies otherwise — but treats it as an explicit decision gate (Phase 4 below), not a silent default.

---

## 4. Architecture Before / After

**Before (as planned):**

```
prisma/schema.prisma          ← BehaviorRecord with 3 unnamed user relations (invalid)
src/shared/lib/
  merits-constants.ts          ← no owning entity
  merits-helpers.ts
src/app/api/merits/...         ← no owning entity
src/entities/directory/ui/
  StandingBadge.tsx             ← borrowed home
```

**After (corrected):**

```
prisma/schema.prisma          ← BehaviorRecord with 3 named relations + 3 back-relation
                                  arrays added to `user` model
src/db/schema/                ← generator-produced (not hand-authored) for
  behavior-type-enum.ts          BehaviorType / BehaviorRecordStatus / BehaviorCategory,
  behavior-records.ts            behaviorRecords table, and relations — verified
  behavior-records-relations.ts  against generator output, not authored ahead of it
src/entities/merit/
  schema.ts                     ← re-exports generated Drizzle schema (project convention)
  dto/index.ts
  model/
    constants.ts                 ← merits-constants.ts content, WATCHLIST key fixed
    types.ts
  permissions/index.ts            ← narrower than blanket hasPermission('users')
  services/index.ts               ← merits-helpers.ts content
  ui/StandingBadge.tsx            ← moved from entities/directory
  index.ts
src/app/api/merits/...           ← unchanged routes, importing from entities/merit
src/widgets/dashboard/widgets.ts  ← +2 admin-specific widget registrations
                                     (e.g. 'merits-escalations', 'merits-recent-disputes')
```

---

## 5. Pre-Execution Discovery Checklist

Per project principle ("agents must verify, not infer"), run before touching any plan file:

```bash
# 1. Confirm current Prisma multi-relation naming convention is as documented
grep -n '@relation("' prisma/schema.prisma | grep -i touser

# 2. Confirm the user model's existing back-relation array naming style
grep -n 'agentAccess_\|propertyListing_\|profile_' prisma/schema.prisma | grep 'model user' -A 60 | head -80

# 3. Confirm prisma-generator-drizzle is still the active generator (don't assume)
grep -n 'provider = "prisma-generator-drizzle"' prisma/schema.prisma

# 4. Confirm no BehaviorRecord-related files already exist (avoid clobbering partial prior runs)
find src/db/schema src/entities src/app/api -iname '*behavior*' -o -iname '*merit*'

# 5. Confirm canAccess() Phase 41 status before deciding gating approach
grep -rn 'canAccess\b' src/entities/tenant/api/gate/ | head -20
cat .planning/phases/41-feature-gate-consolidation/41-CONTEXT.md 2>/dev/null | grep -A5 'Trajectory\|Phase 2/3 Deferrals'

# 6. Confirm widgets.ts registration pattern before adding merits widgets
grep -n "registry.register({" src/widgets/dashboard/widgets.ts | wc -l

# 7. Confirm existing Notification creation pattern to reuse for resident-facing alerts
grep -rn 'db.insert(notifications)' src/app/api --include='*.ts' | head -5

# 8. Confirm existing suspend route shape, to link SUSPENSION_RECOMMENDATION → admin action
sed -n '1,40p' src/app/api/users/[id]/suspend/route.ts
```

If any command returns unexpected results (e.g., merits files already partially exist, or `canAccess()` has progressed further than 41-CONTEXT.md indicates), stop and escalate rather than proceeding on the assumptions in this advisory.

---

## 6. Phased Execution Plan

| Phase | Action                                                                                                                                                                                                                                                                        | Files                                                      | Gate                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| **0** | Apply this advisory's fixes directly to `45-02-PLAN.md` / `45-03-PLAN.md` before either is executed                                                                                                                                                                           | both plan files                                            | DavDev review                                            |
| **1** | Fix Prisma model: add 3 named `@relation()` tags + matching back-relation arrays on `user`                                                                                                                                                                                    | `prisma/schema.prisma`                                     | Resolves 2.1 (blocking)                                  |
| **2** | Re-sequence Task 1: run `migrate dev --create-only` + `prisma generate` immediately after the Prisma model edit; verify generated `src/db/schema/behavior-*` files against the plan's intended shape rather than hand-authoring first                                         | `45-02-PLAN.md` Task 1, Task 4                             | Resolves 2.2                                             |
| **3** | Add `WATCHLIST: -1` to `DEFAULT_TIER_THRESHOLDS`; update `getStandingTier` threshold type accordingly                                                                                                                                                                         | `45-02-PLAN.md` Task 2                                     | Resolves 2.3                                             |
| **4** | Create `src/entities/merit/` slice; move `merits-constants.ts` → `model/constants.ts`, `merits-helpers.ts` → `services/index.ts`, `StandingBadge.tsx` → `ui/StandingBadge.tsx`; update all import paths in both plans                                                         | `45-02-PLAN.md`, `45-03-PLAN.md`, new entity slice         | Resolves 2.4                                             |
| **5** | **Decision gate — DavDev confirms:** keep `hasPermission('users')` for this phase (tracked as gate-system debt) vs. migrate to `canAccess()` now. Narrow permission if a BOARD/COMMITTEE distinction is wanted for disciplinary actions specifically                          | both plans, `src/entities/tenant/api/permissions.ts`       | Explicit confirmation required — do not default silently |
| **6** | Add 2 admin-specific widgets to `widgets.ts` (`registry.register()`) before registering `merits` in `ADMIN_DOMAINS`                                                                                                                                                           | `45-03-PLAN.md` Task 3, `src/widgets/dashboard/widgets.ts` | Resolves 2.6                                             |
| **7** | Add `Notification` creation on `POST /api/merits` (resident-facing) and on `SUSPENSION_RECOMMENDATION` escalation (admin-facing); link `UserStandingCard`'s suspension-recommended state to `/admin/users/[id]/suspend` — track as in-scope or explicitly defer to a BD issue | `45-02-PLAN.md` Task 3, `45-03-PLAN.md` Task 1             | Resolves 2.7 — DavDev decides scope                      |
| **8** | Re-classify "Standing scores" / public badge visibility sensitivity in the threat model with explicit POPIA reasoning rather than default Low                                                                                                                                 | `45-02-PLAN.md`, `45-03-PLAN.md` threat models             | Resolves 2.8                                             |
| **9** | Add `*.test.ts` files matching `files_modified` for tasks marked `tdd="true"`, and add `pnpm lint` / `vitest run` to `<verify>` blocks; fix the stale "Steps E-G" cross-reference                                                                                             | both plans                                                 | Resolves 2.9                                             |

Phases 1–3 are mechanical and low-risk; apply before any agent run. Phase 4 is a moderate refactor of plan structure but no behavior change. Phase 5 is the only true decision point and should not be resolved unilaterally by the executing agent. Phases 6–9 can be folded into the existing wave-2/wave-3 task lists rather than spawning new waves.

---

## 7. Risk Register

| ID       | Risk                                                                                                                         | Severity | Disposition                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| R-012-01 | Ambiguous Prisma relation halts `migrate dev` mid-wave, leaving partial schema state                                         | High     | Mitigate — Phase 1, apply before any execution                  |
| R-012-02 | Hand-authored Drizzle files silently overwritten by `prisma generate`, breaking Task 2/3 imports                             | Medium   | Mitigate — Phase 2, resequence generation before dependent code |
| R-012-03 | TDD test asserts a constant key the code sample never defines, failing CI on first run                                       | Low      | Mitigate — Phase 3, one-line fix                                |
| R-012-04 | Merits becomes the only domain without an entity slice, requiring a future cleanup advisory                                  | Medium   | Mitigate — Phase 4, fix now while cost is low                   |
| R-012-05 | New feature adds a fourth gating pattern at the exact point Phase 41 is consolidating to one                                 | Medium   | Accept-with-confirmation — Phase 5, explicit DavDev decision    |
| R-012-06 | New admin domain violates own documented widget-admission criteria                                                           | Low      | Mitigate — Phase 6                                              |
| R-012-07 | Resident escalating toward suspension has no way to discover it; admin has no proactive alert on `SUSPENSION_RECOMMENDATION` | Medium   | Flag — Phase 7, scope decision needed                           |
| R-012-08 | Public standing badge treated as Low sensitivity without explicit POPIA reasoning                                            | Medium   | Flag — Phase 8, scope decision needed                           |
| R-012-09 | `tdd="true"` tasks ship without corresponding test files or lint/test verification                                           | Low      | Mitigate — Phase 9                                              |

---

## 8. Done Criteria

- [ ] ⏳ `prisma/schema.prisma` validates (`npx prisma validate`) with three named relations on `BehaviorRecord` and matching back-relation arrays on `user`
- [ ] ⏳ `src/db/schema/behavior-*` files are generator-produced, not hand-authored ahead of generation
- [ ] ⏳ `DEFAULT_TIER_THRESHOLDS` includes `WATCHLIST`, and its TDD test passes
- [ ] ⏳ Merits constants, helpers, and `StandingBadge` live under `src/entities/merit/`, consistent with `booking`/`content`/`event`/`maintenance`/`service`
- [ ] Gating approach for merits (legacy `hasPermission` vs. `canAccess()`) is an explicit, recorded decision — not a silent default
- [ ] `ADMIN_DOMAINS` registration for `merits` is preceded by ≥2 widget registrations in `widgets.ts`, per `NAVIGATION_GOVERNANCE.md`
- [ ] ⏳ Resident notification on new behavior record, and admin notification (or explicit deferral with a tracked BD issue) on `SUSPENSION_RECOMMENDATION`, is either implemented or explicitly deferred with a tracked issue ID
- [ ] ⏳ Threat model sensitivity rating for standing scores / public badges carries explicit POPIA reasoning
- [ ] ⏳ `tdd="true"` tasks have matching `*.test.ts` files in `files_modified`, and `<verify>` blocks include `pnpm lint`
- [ ] ⏳ `45-02-PLAN.md` and `45-03-PLAN.md` are updated in place to reflect all of the above before being handed to the execution agent
