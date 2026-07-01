# COMMUNIQUE-04 — Tenant Foreign Key Relations: Schema Integrity Architecture

**To:** Architecture Advisors
**Date:** 2026-07-01
**Status:** Decision Required
**Trigger:** PRISMA_ANALYSIS.md audit finding — 92 of 95 tenant-scoped models lack `@relation` FK constraints to the `Tenant` table.

---

## 1. Problem Statement

### 1.1 — What's missing

The `prisma/schema.prisma` contains **95 models** with a `tenantId` field. Only **3** declare a proper `@relation` to the `Tenant` model:

| Model | onDelete | Purpose |
|-------|----------|---------|
| `TenantModule` | Cascade | Junction: tenant ↔ module enablement |
| `AssistSession` | Cascade | Agent assist session scoped to tenant |
| `TenantAchievement` | Cascade | Junction: tenant ↔ achievement definitions |

The remaining **92 models** use a bare `tenantId String` field with **no referential integrity constraint**. This means:

- **No database-level FK** — orphan `tenantId` values (pointing to non-existent Tenant rows) are possible
- **No cascade or restrict semantics** — deleting a Tenant leaves orphan rows across 20+ tables
- **No Prisma-level relation** — queries cannot use Prisma's relational API (`include: { tenant: true }`) to traverse from child to Tenant
- **Application-layer multi-tenancy only** — data isolation relies entirely on `WHERE tenantId = $1` in query logic

### 1.2 — Why this matters

The SaaS License Agreement (v10, `docs/product/SaaS/`) defines the Tenant as the contracting entity — the Soralia Village HOA. The agreement specifies:

| Lifecycle Event | Rule | Source |
|----------------|------|--------|
| **User Departure** | 90-day archival → permanent deletion | §6.7 |
| **Premium Seat Cooling-Off** | 6 months before address reissue | §6.7 |
| **Contract Termination** | All data returned/deleted within 30 days | §6.5 |
| **Data subject rights** | Self-service export/deletion via dWallet | §6.8 |

These lifecycle rules govern **user and seat data**, not the Tenant itself. The agreement has no concept of "deleting the tenant" — the Tenant IS the HOA and can only be terminated through contract expiry or breach.

**However**, the current schema cannot distinguish between:
- A legitimate `tenantId` → orphan data pointing to nowhere
- A departed user's archival data → user-scoped lifecycle, not tenant-scoped
- A tenant in deletion → data that should have been cascaded or blocked

---

## 2. The 92 Models: Domain Breakdown

### 2.1 — Excluded: Better Auth Tables (managed by auth library)

| Model | tenantId | Reason for exclusion |
|-------|----------|---------------------|
| `account` | Optional | Better Auth OAuth account linking |
| `session` | Optional | Better Auth session management |
| `passkey` | — | Better Auth passkey auth |
| `user` | Required | Central identity; RLS-managed |
| `verification` | Optional | Better Auth email verification |
| `twoFactor` | — | Better Auth 2FA |

These tables are managed by Better Auth's internal lifecycle. Adding `@relation` constrains the auth library's ability to create/destroy records during auth flows.

### 2.2 — Included: 86 tenant-scoped models by domain

| Wave | Domain | Count | Representative Models |
|------|--------|-------|----------------------|
| 1 | Core Community | 20 | Profile, Member, Organization, Notification, Property, Household, Conversation, Message, Content, Group, Event, Booking |
| 2 | Seats & Listings | 7 | PremiumSeat, SoloSeat, StandardSeat, PropertyListing, ServiceBooking, AgentProfile |
| 3 | Maintenance & Providers | 14 | MaintenanceRequest, MaintenanceTeam, ServiceProvider, CommunityServiceListing, ProviderVerification, ProviderSubscription |
| 4 | Billing & Commerce | 12 | PaymentTransaction, ProviderInvoice, BillingPlan, TenantSubscription, TenantInvoice, Coupon, CouponRedemption |
| 5 | Surveys & Merits | 8 | Survey, Question, Response, SurveySection, ExternalSurvey, CommunityMerit, Competition |
| 6 | dWallet & Data | 6 | DWallet, WalletTransaction, DataConsent, PayoutRequest, DataRevenueStream, DataShareBatch |
| 7 | Admin & Agents | 6 | AgentAccess, AgentToken, DelegationAction, ResidentDelegation, PlatformSuspension, SubscriptionTier |
| 8 | Achievements & Disputes | 7 | UserAchievementProgress, UserAchievement, DisputeCase, DisputeEvidence, DisputeMessage |
| 9 | Address & AI | 6 | Setting, Address, Handle, Bursary, TenantAiUsage, AiUsageEvent |

---

## 3. The `onDelete` Question

### 3.1 — Option A: Restrict (tentatively recommended)

```prisma
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
```

Every domain model gets a FK. Deleting a Tenant **blocks** until all child data is removed.

**Pros:**
- Referential integrity enforced: no orphan `tenantId` values possible
- Accidental tenant deletion is impossible — requires explicit cleanup
- Matches the SaaS contract: tenant deletion = contract termination, a deliberate multi-step process
- Safe for all 86 models regardless of domain

**Cons:**
- No automatic cleanup. An admin deleting a tenant must manually clear all 86 tables first
- A `DELETE FROM Tenant WHERE id = 'X'` will fail until every referencing row is handled
- Requires a tenant deletion workflow (or a SQL script) to be built

### 3.2 — Option B: Cascade

```prisma
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
```

Matches the existing 3 relations (TenantModule, AssistSession, TenantAchievement).

**Pros:**
- Single `DELETE FROM Tenant` cleans everything
- Consistent with existing FK relations
- No orphan cleanup burden

**Cons:**
- One accidental query destroys **all** tenant data — irreversible without backups
- No distinction between "tenant being sunset" and "tenant being deleted by bug"
- Does not align with the SaaS agreement's structured data lifecycle (archival periods, portability windows, cooling-off)
- If tenant deletion is ever automated (e.g., non-renewal pipeline), a single-line bug could cascade-delete community data

### 3.3 — Option C: Mixed strategy (Restrict for content, Cascade for infra)

Content-bearing models (Profile, Message, Survey, Booking) use `Restrict`. Infrastructure models (Notification, WalletTransaction, AiUsageEvent) use `Cascade`.

**Pros:** Protects user-facing data while allowing automatic cleanup of ephemeral records.  
**Cons:** Inconsistent. Requires a per-model judgment call across 86 models. Easy to misclassify. Future models inherit ambiguity.

---

## 4. The Back-Link Question

Adding `tenant Tenant @relation(...)` creates a forward link. Should the reverse — adding relation fields on the `Tenant` model — also be applied?

```prisma
model Tenant {
  // ... existing fields ...
  profiles    Profile[]       // ← back-link (new)
  events      Event[]         // ← back-link (new)
  surveys     Survey[]        // ← back-link (new)
  // ... 86 total back-links ...
}
```

### Option A — Add back-links (complete relational graph)

**Pros:** Prisma's `include: { profiles: true }` works when querying Tenant. Full relational integrity in both directions.  
**Cons:** Adds ~86 relation arrays to the `Tenant` model, which already has 55 relation back-links. This creates a 141-field god-model. Eager-loading the tenant with any `include` becomes dangerous. TypeScript compilation of the Tenant type slows significantly.

### Option B — Forward-link only (slim Tenant model)

Do not add reverse relation fields on `Tenant`. The FK exists in the child table; queries traverse child → tenant, not tenant → children.

**Pros:** Keeps the Tenant model lean. No N+1 risk from eager-loading Tenant. Simplifies the Prisma client type.  
**Cons:** Cannot `include` children when querying Tenant. Asymmetric relation graph. Prisma may warn about missing reverse fields.

---

## 5. Postgres Index Concern

PostgreSQL does **not** automatically index foreign key columns. Adding `@relation` creates the FK constraint but not the index. Many of the 86 models already have `@@index([tenantId])` — but some do not.

### Question

Should every new `@relation` be accompanied by an explicit `@@index([tenantId])`? This doubles the migration work but ensures all FK lookups are index-backed.

**Context:** The SENIOR_REPORT.md audit (Sprint 4, S4-2) already added missing indexes on `Conversation(tenantId)`, `Survey(tenantId, status)`, `ExternalSurvey(tenantId, isActive)`. Sprint 5 (S5-7) added `Content(tenantId)`, `Event(date)`. The indexes exist on the most queried models but may be missing on many others.

---

## 6. Pre-Flight Constraint

Before any FK can be created, every existing `tenantId` value must reference a valid `Tenant.id`. A single orphan row will cause the `ALTER TABLE ... ADD CONSTRAINT` to fail. This requires:

1. A diagnostic SQL sweep across all 86 tables
2. Either: fix orphans (delete orphan rows or create placeholder Tenants)
3. Or: create the FK with `NOT VALID` (Postgres allows this, but Prisma Migrate may not)

---

## 7. Priority Questions for Advisory

1. **onDelete strategy** — Option A (Restrict), Option B (Cascade), or Option C (Mixed)? The tentative recommendation is **Restrict** given the SaaS agreement's structured lifecycle.

2. **Scope** — Should we target all 86 models, or phase this — critical models first (conversations, events, bookings, surveys), infrastructure models later?

3. **Back-links** — Add reverse relation fields on the `Tenant` model (Option A) or keep Tenant lean with forward-links only (Option B)?

4. **Better Auth tables** — Confirm exclusion of `account`, `session`, `passkey`, `user`, `verification`, `twoFactor` from the FK scope. Any dissent?

5. **Indexes** — Should `@@index([tenantId])` be added alongside every new `@relation`? Or only where query patterns justify it?

6. **Existing Cascade FKs** — Should the existing 3 models (`TenantModule`, `AssistSession`, `TenantAchievement`) be changed from `Cascade` to `Restrict` for consistency? Or left as-is?

---

## 8. Related

- `prisma/schema.prisma` — All 95 affected models
- `docs/to-claude/PRISMA_ANALYSIS.md` — Original audit findings (consolidated summary §5)
- `SENIOR_REPORT.md` — Sprints 4-6 resolved: S4-1 (DelegationAction FK), S4-2 (indexes), S4-3 (SurveySection back-link), S5-7 (Content/Event indexes)
- `docs/product/SaaS/SaaS_License_Agreement_Soralia_v10.txt` — §6.5 (data return), §6.7 (departure lifecycle)
- `docs/communiques/COMMUNIQUE.md` — Better Auth admin plugin (auth table lifecycle context)
- `docs/communiques/COMMUNIQUE-02.md` — Provider onboarding & address management (domain model context)
