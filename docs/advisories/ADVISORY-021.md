# ADVISORY-021: Education Portal Data Model — Bursary, BursaryField, and Resource Extensions

## Status

Proposed

## Context

Netcomplex is adding an education portal module (bursaries/scholarships + free learning resources, including a curated "Gutenberg shelf") for resident-facing and admin surfaces. No existing model covers bursaries. The existing `Resource` model almost covers education resources but lacks fields for external provider name, media type, and tags.

## Problem Statement

Two distinct domain concepts need schema support:

1. **Bursary** — a time-bound funding instrument (funder, amount, field of study, deadline, apply link). Nothing in the current schema models this.
2. **EducationResource** — a curated pointer to external learning material (course, book, journal, video). This is close in shape to the existing `Resource` model.

The naive path — bolting bursary fields (`amount`, `deadline`, `field`) onto `Resource` — was rejected. `Resource` is fundamentally a governance-document model (`ARCHITECTURAL`, `BOARD_REPORT`, `LEGAL`, etc., with `fileUrl`/`fileType`/`version`/`ResourceVersion`), and forcing bursary-shaped fields onto it repeats a pattern already flagged as a defect elsewhere in this codebase.

## Root Cause Analysis

This is net-new capability, not a bug fix, but it carries the same structural risk documented in `UBIQUITOUS_LANGUAGE.md`:

- **C1 (Property shape inconsistency)** and **C6 (OccupancyType vs occupantType)** both stem from the same root cause: two semantically distinct concepts sharing one model or one near-identical name. Overloading `Resource` with bursary fields would be a new instance of the same defect class.
- `Resource.category` is a closed, HOA-document-oriented taxonomy. Adding `EDUCATION` as a value is fine (it's still "a category of resident-facing reference material"), but adding `amount`/`deadline`/`fieldOfStudy` columns that are meaningless for the other seven categories is not — it's a shape conflation, not a taxonomy extension.

## Options Considered

1. **Single polymorphic `EducationItem` model** (JSON blob differentiated by a `kind` discriminator) — rejected. Defeats Prisma type safety and indexing (can't index into JSON deadline fields cleanly), and is the same class of problem as the Property 4-shape drift (C1), just moved into one table instead of four.
2. **Extend `Resource` for both Bursary and EducationResource** — rejected. See Root Cause Analysis above.
3. **New `Bursary` + `BursaryField` models; minimal additive extension of `Resource` for EducationResource** — **selected**.

Sub-decisions locked in with DavDev:

- `BursaryField` is an admin-manageable lookup table (mirrors `MaintenanceCategory`/`MaintenanceTeam` precedent), not a Prisma enum — admins can add/rename fields of study without a deploy.
- `ResourceMediaType` (Book/Course/Journal/Video) is a Prisma enum — closed set, maps cleanly to fixed UI iconography, doesn't need runtime extensibility.

## Architecture Before/After

**Before:** `Resource` covers governance/board-document categories only (`ARCHITECTURAL` … `LEGAL`, `OTHER`). No bursary concept exists anywhere in the schema. No `education` key exists in `PlatformModule`, `FeatureRegistry`, or `PlatformPageFlags`.

**After:**

- `Resource` gains `EDUCATION` as an eighth `ResourceCategory` value, plus three new nullable/default fields: `provider String?`, `tags String[]`, `mediaType ResourceMediaType?`.
- New `BursaryField` model (lookup table, tenant-scoped, admin-managed — `value`/`label`/`description`/`isActive`, following the `MaintenanceCategory` shape exactly).
- New `Bursary` model (tenant-scoped, FK to `BursaryField`, `deadline: DateTime` for real sort/filter, `status: BursaryStatus` for publish state only — "closing soon"/"expired" is derived from `deadline` at query/render time, not stored, to avoid a cron keeping a stale enum in sync).
- New `education` module key registered across `PlatformModule` / `FeatureRegistry` / `PlatformPageFlags` (per the triple-gating system documented as C2 — all three must be updated together or the module will be inconsistently visible).

### Schema diff

```prisma
model BursaryField {
  id          String    @id @default(cuid())
  tenantId    String
  value       String
  label       String
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?
  bursaries   Bursary[]

  @@index([tenantId])
}

model Bursary {
  id          String        @id @default(cuid())
  tenantId    String
  title       String
  funder      String
  fieldId     String
  amount      String
  description String
  applyUrl    String?
  deadline    DateTime
  status      BursaryStatus @default(DRAFT)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?
  field       BursaryField  @relation(fields: [fieldId], references: [id])

  @@index([tenantId])
  @@index([deadline])
  @@index([status])
  @@index([fieldId])
}

enum BursaryStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ResourceMediaType {
  BOOK
  COURSE
  JOURNAL
  VIDEO
}
```

```prisma
model Resource {
  // ...existing fields unchanged...
  provider  String?
  tags      String[]
  mediaType ResourceMediaType?
}

enum ResourceCategory {
  ARCHITECTURAL
  ENGINEERING
  GOVERNANCE
  BOARD_REPORT
  DIY
  FINANCIAL
  LEGAL
  EDUCATION
  OTHER
}
```

The Gutenberg shelf is modeled as `Resource` rows with `category = EDUCATION`, `mediaType = BOOK`, `externalUrl` pointing at gutenberg.org, and a new `featured Boolean @default(false)` flag controlling whether the item renders in the horizontal shelf strip versus the general grid. No third model needed for the shelf.

## Pre-Execution Discovery Checklist

Run these before touching `schema.prisma`. Do not proceed to Phase 1 if any command surfaces an unexpected result — surface findings to DavDev rather than resolving unilaterally.

```bash
# 1. Confirm no pending drift between schema.prisma and applied migrations
pnpm prisma migrate status

# 2. Validate current schema parses cleanly before edits
pnpm prisma validate

# 3. Check for name collisions — "Bursary" or "EducationResource" must not already exist
grep -rn "Bursary" prisma/ src/ docs/ --include="*.ts" --include="*.prisma" --include="*.md"
grep -rn "EducationResource" prisma/ src/ docs/ --include="*.ts" --include="*.prisma" --include="*.md"

# 4. Check ResourceCategory isn't already carrying an education-adjacent value under another name
grep -n "enum ResourceCategory" -A 10 prisma/schema.prisma

# 5. Confirm 'education' is not already a registered module/feature/flag key
grep -rn "'education'" src/entities/tenant/api/features/registry.ts src/entities/tenant/api/flags/platform-flags.ts prisma/seed/modules.ts

# 6. Check for existing switch/map statements over ResourceCategory that lack a default case
# (a new enum value can silently fall through unstyled/unhandled UI branches)
grep -rn "ResourceCategory" src --include="*.tsx" --include="*.ts" -l | xargs grep -ln "switch\|case '"

# 7. Row-count sanity check on Resource before adding columns (confirms additive-only impact)
psql "$DATABASE_URL" -c "SELECT \"category\", count(*) FROM \"Resource\" GROUP BY \"category\";"

# 8. Confirm tenant-isolation audit script's model list will need updating
grep -n "MaintenanceCategory\|MaintenanceTeam" scripts/audit-tenant-isolation.ts
```

**STOP-AND-ESCALATE gate:** if step 1 (`prisma migrate status`) reports drift, or step 6 finds an unguarded `switch` over `ResourceCategory`, halt and report findings to DavDev before generating the migration. Do not add the `EDUCATION` enum value while drift is unresolved — the migration generated against a drifted baseline is unreliable.

## Phased Execution Plan

### Phase 1 — Schema

1. Add `BursaryStatus`, `ResourceMediaType` enums.
2. Add `EDUCATION` to `ResourceCategory`.
3. Add `provider`, `tags`, `mediaType` to `Resource` (all nullable/defaulted — non-breaking).
4. Add `BursaryField`, `Bursary` models.
5. Run `pnpm prisma migrate dev --name add_education_portal_models`.
6. Run `pnpm prisma generate` and verify new Drizzle output files exist:
   ```bash
   ls src/db/schema/ | grep -i bursary
   ls src/db/schema/ | grep -i resource-media-type
   ```
   This project has a tracked systemic risk (per `HOLISTIC.md`) of Drizzle generation sequencing errors — do not proceed to Phase 2 until these files are confirmed present.

### Phase 2 — Seed

1. Seed a starter `BursaryField` set per tenant (STEM, Commerce, Arts, Health, Law, Education, General) using the established Drizzle `db.insert().onConflictDoNothing()` pattern — **not** Prisma `createMany`.
2. **Decision needed before this phase runs:** seed at migration time (recommended — avoids an empty-dropdown first-run experience in the admin bursary form) versus leave empty for admins to populate from scratch. Flagging this as still open.

### Phase 3 — Module / feature / flag registration

Add the `education` key consistently across all three gating systems (per C2 — partial registration causes inconsistent visibility):

1. `PlatformModule` row: `key: 'education'`, `minTier: STANDARD`.
2. `FeatureRegistry`: `page.education`, `feature.education.bursaries`, `feature.education.resources`, `widget.education-admin`.
3. `PlatformPageFlags`: add `education` alongside the existing 15 flags.

### Phase 4 — FSD entity slice

Scaffold `src/entities/education/` (self-contained, following the `entities/booking` / `entities/event` precedent):

- `schema.ts` — Zod schemas for `Bursary`, `BursaryField`, education-flavored `Resource` queries.
- `dto/index.ts` — DTO shaping.
- `permissions/index.ts` — who can create/edit/publish.
- `services/index.ts` — server-only query/mutation logic.
- `index.server.ts` — server-only sub-barrel (mandatory per ADR-024, since `services/` will import `@api/db`).
- `index.ts` — client-safe public API (types, constants).

## Risk Register

| Risk                                                                                                                         | Likelihood | Impact | Mitigation                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BursaryField` seeded empty — admin form has no dropdown options on first use                                                | Medium     | Medium | Seed default taxonomy at migration time (Phase 2), not left to runtime                                                                                            |
| Drizzle generation sequencing error after Prisma schema change (tracked systemic risk, `HOLISTIC.md`)                        | Medium     | High   | Explicit verification step in Phase 1.6 before proceeding                                                                                                         |
| New `ResourceCategory.EDUCATION` value falls through an unguarded `switch`/map in existing UI, rendering blank               | Low        | Medium | Discovery checklist step 6; grep before migration                                                                                                                 |
| Partial registration across `PlatformModule`/`FeatureRegistry`/`PlatformPageFlags` (C2) leaves education module half-visible | Medium     | Medium | Phase 3 treated as one atomic step, not three independent PRs                                                                                                     |
| New models omitted from tenant-isolation audit                                                                               | Low        | High   | Discovery checklist step 8; add `Bursary`/`BursaryField` to `scripts/audit-tenant-isolation.ts` in Phase 1                                                        |
| Orphaned FK if a `BursaryField` is soft-deleted while a `Bursary` still references it                                        | Low        | Low    | `fieldId` FK has no `onDelete: Cascade` — deletion of a referenced field should be blocked at the service layer, not the DB layer; enforce in `services/index.ts` |

## Done Criteria

- [ ] ⏳ Discovery checklist run in full, no unresolved drift or collisions
- [ ] ⏳ Migration applied; `prisma generate` run; Drizzle schema files confirmed present for `Bursary`, `BursaryField`, `ResourceMediaType`, `BursaryStatus`
- [ ] ⏳ `Resource` extension fields confirmed nullable/non-breaking; existing row count unchanged
- [ ] ⏳ `BursaryField` seeded with starter taxonomy (pending seed-timing decision)
- [ ] ⏳ `education` key present and consistent across `PlatformModule`, `FeatureRegistry`, `PlatformPageFlags`
- [ ] ⏳ `entities/education` slice scaffolded with `index.server.ts` sub-barrel
- [ ] ⏳ `scripts/audit-tenant-isolation.ts` updated to include `Bursary` and `BursaryField`
- [ ] ⏳ No orphaned `Bursary.fieldId` references post-migration (spot-check query)

## Related

- `docs/STEERING/UBIQUITOUS_LANGUAGE.md` — C1, C2, C6 (shape-conflation precedents this advisory avoids repeating)
- ADR-003 — Dual ORM strategy (Prisma schema source of truth, Drizzle query layer)
- ADR-024 — Server-only modules use `server.ts` sub-barrels in FSD slices
- `MaintenanceCategory`/`MaintenanceTeam` — precedent for admin-manageable lookup tables
