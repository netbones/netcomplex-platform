# P3 Implementation Plan

**Date:** 2026-03-31  
**Branch:** `dev`  
**Scope:** Two architectural improvements deferred from the identity-permissions-review.

---

## P3-A: Add `organizationId` to Identity Tables

### Rationale

`IDENTITY_MODEL.md` specifies multi-tenancy requires `organizationId` on every identity record for Row-Level Security (RLS) enforcement. Adding it now (before data accumulates) avoids a costly backfill migration later.

### Affected Models

| Model          | File                   |
| -------------- | ---------------------- |
| `Household`    | `prisma/schema.prisma` |
| `StandardSeat` | `prisma/schema.prisma` |
| `SoloSeat`     | `prisma/schema.prisma` |
| `Profile`      | `prisma/schema.prisma` |
| `AgentAccess`  | `prisma/schema.prisma` |

### Schema Changes

1. Add `Organization` model stub
2. Add `organizationId String?` (nullable — safe for single-tenant mode) to each identity model
3. Add `@@index([organizationId])` on each model
4. Add `organizationId` to tRPC `Context` interface and `createContext()`
5. Pass `organizationId: ctx.organizationId` in all identity router mutations

### Migration

```bash
pnpm prisma migrate dev --name add_organization_id_to_identity_tables
```

Safe for existing rows — nullable column, no default required.

### Future Step (after production data populated)

Once all records have an `organizationId`, enforce NOT NULL and add FK:

```prisma
organizationId String
organization   Organization @relation(fields: [organizationId], references: [id])
```

---

## P3-B: Deprecate Legacy `User.street/unit/homeImage/residentType`

### Rationale

These fields on the `User` model duplicate data now properly modelled in `Household`, `StandardSeat`, and `SoloSeat`. Dual sources of truth cause stale data bugs and confuse onboarding code.

### Affected Callers

| File                                      | Usage                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/api/invitations/route.ts:22-24`  | Writes `street`, `unit`, `residentType` to `Invitation` (not `User` — OK to keep on Invitation model) |
| `src/app/api/users/[id]/route.ts:60-61`   | Updates `residentType` on `User`                                                                      |
| `src/app/api/users/route.ts:67-138`       | Reads/writes `street`, `unit`, `residentType` on `User`                                               |
| `src/app/page.tsx:104-389`                | Reads `street`, `unit`, `homeImage`, `residentType` from user for directory display                   |
| `src/app/interest/page.tsx:275-276`       | Reads `street` from user                                                                              |
| `src/app/admin/requests/page.tsx:129-130` | Reads `street`, `unit` from `request.user`                                                            |
| `src/app/admin/users/page.tsx:155-295`    | Reads/writes `residentType`, `street`, `unit`                                                         |
| `src/app/groups/page.tsx:30`              | Reads `residentType` from session user                                                                |

### Migration Steps

#### Phase 1 — Mark deprecated (this PR) [X]

Add `/// @deprecated` comments to `User.street`, `User.unit`, `User.homeImage`, `User.residentType` in `prisma/schema.prisma`.

#### Phase 2 — Migrate read callers (this PR) [X]

Replace `user.street/unit/homeImage/residentType` with data joined through:

- `user.standardSeats[0].household` for property owners
- `user.soloSeat.household` for solo seat holders

Affected: `src/app/page.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/interest/page.tsx`

#### Phase 3 — Migrate write callers (this PR) [X]

Remove `street/unit/residentType` from user create/update payloads in:

- `src/app/api/users/route.ts` (POST)
- `src/app/api/users/[id]/route.ts` (PATCH)

Note: `src/app/api/invitations/route.ts` writes to the `Invitation` model (not `User`) — those fields are valid on `Invitation` and should be kept.

#### Phase 4 — Data backfill script [X]

Extend `prisma/migrate-identity.ts` to copy `User.street/unit/homeImage` → `Household` for any users not yet migrated.

#### Phase 5 — Remove fields (future PR, after backfill verified) [outstanding]

```bash
pnpm prisma migrate dev --name remove_legacy_user_address_fields
```

---

## Sequencing

| Step   | Action                                                         | Status                                                  |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| P3-A-1 | Add `Organization` model + `organizationId` to identity tables | ✅ Done                                                 |
| P3-A-2 | Run `prisma migrate dev`                                       | ✅ Done                                                 |
| P3-A-3 | Expose `organizationId` on tRPC ctx                            | ✅ Done                                                 |
| P3-B-1 | Add `@deprecated` comments to legacy `User` fields             | ✅ Done                                                 |
| P3-B-2 | Migrate read callers                                           | ✅ Done                                                 |
| P3-B-3 | Migrate write callers                                          | ✅ Done                                                 |
| P3-B-4 | Data backfill in `migrate-identity.ts`                         | ✅ Done                                                 |
| P3-B-5 | Remove legacy fields (future PR)                               | ⏳ Deferred — requires production backfill verification |
| P3-A-7 | Enforce `organizationId` NOT NULL + FK                         | ⏳ Deferred — requires production data                  |
