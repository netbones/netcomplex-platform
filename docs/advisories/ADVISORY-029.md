---
title: ADVISORY-29: Maintenance Teams — Multi-Member Teams & In-House Provider Lifecycle
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-29: Maintenance Teams — Multi-Member Teams & In-House Provider Lifecycle

**Responds to:** COMMUNIQUE-11
**Status:** Draft — awaiting decision gates
**Numbering note:** `tree.md` shows advisories through ADVISORY-028 in flight (tenant directory/showcase per your current session). I don't have visibility into the external register, so treat this as content-complete and confirm/assign the filename number before agents execute anything.

---

## 1. Problem Statement

`MaintenanceTeam` is currently a label (`name`, `trade`, `contactName`) with no membership — it cannot represent "five people who mow lawns." Separately, `ServiceProvider` is a single Prisma model serving two different jobs at once: a thin maintenance-assignment record (optional `userId`) and the full platform provider lifecycle (verification, legal agreements, reputation, billing). Neither model knows about the other, and there's no concept of an HOA-employed team member who should skip the external-provider onboarding gate entirely.

## 2. Root Cause Analysis

Three separate gaps compound into one problem:

1. **No team membership model.** `MaintenanceTeam` has no join table to `user`. A "team" is currently just metadata attached to `MaintenanceRequest.assignedTeamId`.
2. **`ServiceProvider` conflates two lifecycles under one schema without a discriminator.** It's used both for `MaintenanceRequest.assignedProviderId` (thin, tenant-internal) and for the full marketplace provider journey (`ProviderVerification`, `ProviderSubscription`, `ProviderLegalAgreement`, etc.). There's no field distinguishing "HOA staff" from "external contractor who went through registration."
3. **`Role` is a single-valued column, not a capability set.** `user.role: Role @default(USER)` (schema.prisma) holds exactly one value at a time. This matters directly for your Question 1 — see §4 below, this is the one place your proposed plan has a real architectural hazard.

There's also a naming collision worth flagging for the Conflict Register: `CommunityServiceListing.providerType` already uses `ProviderType { COMMUNITY | THIRD_PARTY }` in the marketplace domain. Your proposed `ServiceProvider.employmentType { IN_HOUSE | EXTERNAL }` is a conceptually adjacent but distinct axis (employment relationship, not listing origin). Recommend documenting both in `UBIQUITOUS_LANGUAGE.md` so a future reader doesn't assume they're interchangeable.

## 3. Answers to Your Questions

### Q1: Auto-promote to PROVIDER role?

**Recommend: No — not via mutating `user.role`.**

This is the one place I'd stop you before an agent executes it. `Role` is a single enum column (`user.role`, default `USER`/`RESIDENT` depending on which doc you trust — see drift note below). If a resident joins a maintenance team and gets promoted `role: PROVIDER`, they **lose** whatever role-gated permissions RESIDENT/BOARD/COMMITTEE gave them, because there's only one slot. A board member's spouse who mows lawns two days a week would silently lose board access the moment they're added to a team. That's a data-integrity-adjacent behavior change, not a cosmetic one, and it'd be easy for an agent to implement literally as written and not notice the collision.

**Options:**

| Option                                                       | Mechanism                                                                                                                                                                                                                                  | Trade-off                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Mutate `user.role` to PROVIDER (as proposed)              | Single-value overwrite                                                                                                                                                                                                                     | Simplest, but silently destroys existing role-based access. Rejected.                                                                                                      |
| B. Gate-based capability, no Role mutation (**recommended**) | `canAccess()` (the five-layer gate system already in flight per C2/Phase 41) checks "does this user have an active `ServiceProvider` record with `employmentType: IN_HOUSE`" and grants the provider dashboard space independent of `role` | Consistent with where the platform is already heading (gate consolidation). No schema change to `Role`. Provider dashboard becomes an additional surface, not a role swap. |
| C. Multi-role model (`UserRole[]` join table)                | Proper fix for "one person, multiple hats" generally                                                                                                                                                                                       | Correct long-term, but a much bigger migration than this communique asked for — out of scope here, worth its own advisory if this pattern recurs elsewhere.                |

I'd take **Option B**. It reuses infrastructure you're already building (ADR C2 gate consolidation) instead of adding a second, conflicting mechanism for "does this user have provider access."

_Schema drift note surfaced while checking this:_ `SPEC.md`'s curated schema shows `role Role @default(RESIDENT)`, but `schema.prisma` (source of truth) shows `role Role @default(USER)`, and `Role` enum includes both `RESIDENT` and `USER` as distinct values. Worth a one-line fix or a Conflict Register entry so it doesn't get "corrected" wrongly by an agent trusting the doc over the schema.

### Q2: Migrate existing thin `ServiceProvider` records?

**Recommend: No migration — default them to `EXTERNAL`, leave `userId` nullable as-is.**

These are unlinked, no-verification records for the existing maintenance-assignment flow. Forcing user-linkage retroactively is a data-quality project with no clear payoff right now. `employmentType: EXTERNAL` as the default preserves current behavior for every existing row with zero backfill risk. If a specific external contractor later needs a login, that's a targeted one-off, not a migration.

### Q3: Mandatory vs. opt-out notifications?

**Recommend: Mandatory for now, but flag the dependency.** Team-assignment notifications should ride on the existing `user.notificationPreferences` JSON shape (`{info, warning, success, error} × {email, inApp}`), but that taxonomy is by _severity_, not by _category_ — there's no "maintenance" bucket to opt out of independently. Per your own tracking, the **Service Marketplace Phase 50 review has an open `NotificationType` enum conflict decision gate.** Building team-assignment notifications now means picking a notification shape that Phase 50 might redefine out from under you. Recommend either resolving the NotificationType conflict gate first, or building Phase 3 here explicitly as a stopgap using the existing `info`/`warning` categories, clearly marked for revisit once Phase 50 lands. Don't let this advisory quietly become the thing that decides the NotificationType conflict by default.

## 4. Proposed Data Model

```prisma
model MaintenanceTeamMember {
  id        String   @id @default(cuid())
  tenantId  String
  teamId    String
  userId    String
  createdAt DateTime @default(now())
  team      MaintenanceTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user      user            @relation(fields: [userId], references: [id], onDelete: Cascade)
  Tenant    Tenant          @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
  @@index([tenantId])
}
```

`ServiceProvider` gains:

```prisma
employmentType  ProviderEmploymentType  @default(EXTERNAL)

enum ProviderEmploymentType {
  IN_HOUSE
  EXTERNAL
}
```

Note the enum name is deliberately **not** `ProviderType` (already taken by the marketplace domain, different meaning) — keeps the Conflict Register clean.

## 5. Pre-Execution Discovery Checklist

Before drafting migrations, an agent should confirm:

```bash
# Confirm no existing employmentType-like field or naming collision
grep -rn "employmentType\|ProviderEmploymentType" prisma/schema prisma/ src/

# Confirm current Role enum usage sites that would be affected by any role mutation
grep -rn "role.*PROVIDER\|role:\s*Role\.PROVIDER\|role === .PROVIDER" src/

# Confirm the actual default on user.role in the live DB (schema drift check)
grep -n "role\s*Role" prisma/schema/schema.prisma

# Locate the canAccess() gate implementation to confirm Option B is wireable
grep -rn "canAccess\b" src/entities/tenant/api/gate/

# Confirm NotificationType conflict status before wiring Phase 3
grep -rn "NotificationType" src/db/schema/notification-type-enum.ts src/server/routers/notifications.ts

# Confirm no orphaned ServiceProvider.userId assumptions in existing maintenance code
grep -rn "assignedProvider\b" src/entities/maintenance/ src/app/api/maintenance/
```

## 6. Phased Execution Plan

**Phase 1 — Multi-member teams (schema + CRUD)**

- `MaintenanceTeamMember` migration (standalone, low risk, no data-loss surface)
- `/api/maintenance/teams/[id]/members` GET/POST/DELETE as proposed
- `/admin/teams` UI: expandable member list, add/remove

**Phase 2 — `employmentType` + auto-provider linkage (no Role mutation)**

- Add `ProviderEmploymentType` enum + field, default `EXTERNAL`
- On `MaintenanceTeamMember` creation: if user has no `ServiceProvider`, create one with `employmentType: IN_HOUSE`, `verification: VERIFIED` (skip probation), `trade` from team
- If user already has a `ServiceProvider`, link/update `employmentType` only if currently unset — do not overwrite an existing `EXTERNAL` provider's status without an explicit admin action
- **Do not touch `user.role`.** Grant provider-dashboard visibility via `canAccess()` gate keyed on "has active IN_HOUSE ServiceProvider," per Option B

**Phase 3 — Notifications (contingent on NotificationType gate)**

- `maintenance.team_assigned` event → in-app + email to team members
- Blocked/coordinated on Phase 50's `NotificationType` conflict resolution — see §3 Q3

**Phase 4 — `/admin/teams` enhanced UI**

- Member list with avatars, provider-status indicator (linked/verified/in-house badge), add/remove

## 7. Risk Register

| Risk                                                                                                     | Severity | Mitigation                                                                                      |
| -------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| Role-mutation approach silently strips existing user permissions                                         | High     | Rejected in favor of Option B (gate-based, no Role mutation)                                    |
| `ProviderEmploymentType` vs `ProviderType` naming collision confuses future readers                      | Low      | Distinct enum name chosen; add Conflict Register entry                                          |
| Notification shape built now gets invalidated by Phase 50's `NotificationType` decision                  | Medium   | Explicitly sequence Phase 3 after or alongside that gate, not before                            |
| Auto-creating `ServiceProvider` on team-add silently overwrites an existing `EXTERNAL` provider's fields | Medium   | Auto-create only when no `ServiceProvider` exists; link-only (no field overwrite) when one does |
| `user.role` schema drift (SPEC.md vs schema.prisma) misleads an agent mid-execution                      | Low      | Flag in discovery checklist; fix doc or confirm intended default before Phase 2                 |

## 8. Done Criteria

- `MaintenanceTeamMember` table live with unique `(teamId, userId)`, tenant-indexed
- Team CRUD supports members end-to-end in `/admin/teams`
- Joining a team creates/links a `ServiceProvider` with correct `employmentType`, without mutating `user.role`
- Provider-dashboard access for team members proven via `canAccess()` gate, not role check
- Phase 3 notification wiring either deferred with a written reason, or aligned to the resolved `NotificationType` shape

## 9. Decision Gates

- **G0:** Confirm advisory number against external register before any file is created.
- **G1:** Confirm Option B (gate-based provider access) over Option A (role mutation) — this is the one I'd want explicit sign-off on given the permission-loss risk.
- **G2:** Confirm `EXTERNAL` default + no-migration stance on existing thin `ServiceProvider` rows.
- **G3:** Confirm whether Phase 3 waits on the `NotificationType` conflict gate or ships as a marked stopgap.
- **G4:** Approve Phase 1 for immediate execution (lowest risk, no dependencies) independent of G1–G3 resolution, if you want to unblock the UI work now.

Let me know which way you want to go on G1 in particular — everything downstream in Phase 2 hinges on it.
