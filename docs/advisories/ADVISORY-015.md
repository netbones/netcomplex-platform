---
title: ADVISORY-015 — USER Role Lifecycle, Provider Admission, and Address System Hardening
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-015 — USER Role Lifecycle, Provider Admission, and Address System Hardening

**Status:** Awaiting DavDev approval
**Date:** 2026-06-23
**Supersedes:** COMMUNIQUE-02 open questions (§4.1, §4.2, §4.3 partial)
**Tracked issues:** BD `5z3g` (USER role), COMMUNIQUE-02 (provider onboarding + address management)

---

## 1. Problem Statement

Three related issues surfaced in parallel during Phase 46 Provider Platform work:

**1A — Better Auth / Role enum mismatch (immediate, blocking sign-up)**
Better Auth hardcodes `role: 'user'` on every sign-up. The PostgreSQL `Role` enum has no `USER` value. The current workaround in `auth.ts:214` overrides this to `RESIDENT`, which is semantically incorrect — a freshly registered account that has not yet been admitted to any community is not a resident.

**1B — No role lifecycle model**
There is no defined lifecycle for how a `User` record progresses from initial registration through to a meaningful community role (`RESIDENT`, `PROVIDER`, `AGENT`, etc.). Admission hooks do not exist. The `Invitation.role` field encodes the target role but no code acts on it at acceptance time.

**1C — Provider identity model is undefined (COMMUNIQUE-02 §3.1)**
Providers need a platform account, a verification pipeline, and billing integration — but the relationship between their `user` record, their `role`, and the `ServiceProvider` table is undocumented and inconsistently implemented. The quick-fix override to `RESIDENT` means providers currently sign up as residents.

**1D — Address system gaps (COMMUNIQUE-02 §2.2, §3.2)**
`Property.platformAddress` is not `@unique` despite being a namespace identifier. No cross-table uniqueness guard exists. Seat tables have no lifecycle status fields, violating the SaaS agreement's archival and cooling-off requirements.

---

## 2. Root Cause Analysis

### 2A — The `RESIDENT` default is doing two jobs

`user.role @default(RESIDENT)` (schema line 104) currently represents both "not yet placed" and "placed as a community resident." These are different states. Better Auth's `role: 'user'` string was absorbed by the override because there was no correct target — the enum had no pre-admission value.

### 2B — Admission is implicit, not modelled

The `Invitation` model carries a `role` field (line 543) encoding the intended target role. But no code reads that field at `POST /api/invitations/accept` and upgrades the user's role. The invitation system creates users but leaves them at whatever role they had at sign-up.

### 2C — `ServiceProvider` is a floating record

`ServiceProvider` exists as a separate table with no FK to `user`. The registration API at `POST /api/providers/register` creates a `ServiceProvider` row and links it by session, but the `user.role` is not updated at any point in that flow. A provider who completes registration is still `role: RESIDENT` (or the workaround role).

### 2D — `Property.platformAddress` uniqueness gap

The `Property` model has `@@index([platformAddress])` but no `@unique` constraint (line 442 vs line 333/311/294 on seat tables). The property address is the root of the Standard Seat namespace — a duplicate here breaks address resolution silently.

---

## 3. Architecture Decision

### 3A — Introduce `USER` as the pre-admission staging role

`USER` is added to the `Role` enum as the lowest-privilege value. It represents: _authenticated via Better Auth, no community context assigned yet._ It is not a permission level — it is a lifecycle state.

```
Sign-up (any path) → USER
     │
     ├─ Invitation accepted (resident/board/committee) → target role from Invitation.role
     ├─ Provider registration completed + admin approved → PROVIDER
     └─ Agent onboarding + AgentAccess grant created → AGENT
```

`USER` accounts have no seat, no community access, and should be routed to a "complete your setup" wall by middleware. The gate is implemented via seat-absence, not a new `canAccess()` layer: any route requiring community context checks for the presence of a valid seat record. `USER` role maps naturally to "no seat exists yet."

This keeps `USER` as a DB artifact of Better Auth compatibility. No new permission layer is required.

**Default changes:**

| Field                                 | Before     | After                                                          |
| ------------------------------------- | ---------- | -------------------------------------------------------------- |
| `user.role @default(...)`             | `RESIDENT` | `USER`                                                         |
| `Invitation.role @default(...)`       | `RESIDENT` | `RESIDENT` (unchanged — invitations always target a real role) |
| Better Auth override in `auth.ts:214` | `RESIDENT` | removed (Better Auth's `'user'` maps to `USER` naturally)      |

### 3B — Provider identity model: User record + PROVIDER role + ServiceProvider row

Providers are `User` records with `role: PROVIDER`. They arrive via the `USER` staging role and are promoted by an admission hook. The `ServiceProvider` table holds the business-level identity (company name, trade, billing, verification pipeline). The `User` record holds the authentication identity and dashboard access.

This is Option B from COMMUNIQUE-02 §4.1, implemented cleanly through the `USER` lifecycle rather than as a special case.

**The dual-role edge case** (a resident who is also a provider — "John at Unit 42 who runs VoltSafe") is deferred. For now, such users are created with `role: PROVIDER` and admin manually manages seat allocation. A future `RESIDENT_PROVIDER` composite role or a role-set model can address this in a later advisory.

### 3C — Provider onboarding: Invitation-first with open-registration fallback, always through probation

`role: PROVIDER` is **never** granted at invitation acceptance or registration completion. The provider verification pipeline is mandatory for all paths. `PROVIDER` role is only granted when an admin explicitly approves the provider after due diligence.

The full lifecycle for both paths:

```
USER (sign-up)
  ↓ invitation accepted (role: PROVIDER) OR /providers/register completed
USER (role unchanged)
+ ServiceProvider row created { status: PENDING }
+ ProviderVerification row created { status: PROBATION,
                                     verificationThreshold: <from SubscriptionTier>,
                                     probationThreshold: <from SubscriptionTier> }
  ↓ Admin completes due diligence + approves
PROVIDER (role granted at approval only)
```

**Path A — Invitation-based (INVITE_ONLY tenants):**

1. Admin creates an invitation with `role: PROVIDER` via `/api/invitations`
2. Provider accepts invitation token → `POST /api/invitations/accept`
3. Hook detects `invitation.role === PROVIDER` — **does not** assign role; instead:
   - Creates stub `ServiceProvider` row (`status: PENDING`)
   - Creates `ProviderVerification` row (`status: PROBATION`, thresholds from `SubscriptionTier`)
   - Redirects provider to `/providers/register` to complete due diligence form
4. Admin reviews and approves → `POST /api/admin/providers/[id]/approve`
5. Approval hook: `user.role = PROVIDER`, `ProviderVerification.status = VERIFIED`

**Path B — Open registration (OPEN tenants):**

1. Provider self-registers → `user.role = USER`
2. Provider completes `/providers/register` form
3. Same stub rows created as Path A step 3
4. Admin approves → same approval hook as Path A step 5

**Important:** The invitation acceptance hook in Phase 3A must carve out the `PROVIDER` case. When `invitation.role === PROVIDER`, skip the generic role assignment and instead trigger the provider stub creation flow. For all other invitation roles (`RESIDENT`, `BOARD`, `COMMITTEE`, etc.), the generic hook applies unchanged.

In both paths, the provider dashboard gate checks `role === PROVIDER` **and** `serviceProvider.verification.status !== SUSPENDED`.

### 3D — Address system: targeted fixes now, registry deferred

The full central `PlatformAddress` registry (COMMUNIQUE-02 §4.1 Option A) is deferred — it requires a migration-heavy dual-write and the messaging `@mention` feature is not yet in scope.

Immediate fixes only:

1. Add `@unique` to `Property.platformAddress`
2. Add `SeatStatus` enum and `status` + `archivedAt` fields to `StandardSeat`, `SoloSeat`, `PremiumSeat`
3. Add application-layer cross-table uniqueness guard in seat-creation services

The address lifecycle fields (`status`, `archivedAt`) fulfil the SaaS agreement's archival and cooling-off clauses without requiring the full registry.

---

## 4. Architecture: Before / After

### Before

```
Better Auth sign-up
  └── override role: 'user' → RESIDENT (auth.ts:214)

user.role options: RESIDENT | GROUP_ADMIN | COMMITTEE |
                   BOARD | ADMIN | AGENT | MANAGER |
                   ASSOCIATE | PROVIDER
(no pre-admission state)

Invitation.accept: creates user, role unchanged
Provider.register: creates ServiceProvider row, role unchanged

Property.platformAddress: index only, not unique
StandardSeat/SoloSeat/PremiumSeat: no status field
```

### After

```
Better Auth sign-up
  └── role: 'user' → USER (natural mapping, no override)

user.role options: USER | RESIDENT | GROUP_ADMIN | COMMITTEE |
                   BOARD | ADMIN | AGENT | MANAGER |
                   ASSOCIATE | PROVIDER
(USER = staging, all others = admitted)

Admission hooks:
  Invitation.accept (non-PROVIDER) → user.role = Invitation.role (RESIDENT/BOARD/etc.)
  Invitation.accept (PROVIDER)     → ServiceProvider{PENDING} + ProviderVerification{PROBATION},
                                     user.role stays USER until admin approves
  Provider.register (open path)    → ServiceProvider{PENDING} + ProviderVerification{PROBATION},
                                     user.role stays USER until admin approves
  Provider.approve                 → user.role = PROVIDER + ProviderVerification{VERIFIED}
  Agent.onboard                    → user.role = AGENT

Property.platformAddress: @unique enforced
StandardSeat/SoloSeat/PremiumSeat: status SeatStatus @default(ACTIVE)
                                    archivedAt DateTime?
```

---

## 5. Schema Changes

### 5.1 Role enum — add USER

```prisma
enum Role {
  USER        // ← NEW: pre-admission staging role (Better Auth default)
  RESIDENT
  GROUP_ADMIN
  COMMITTEE
  BOARD
  ADMIN
  AGENT
  MANAGER
  ASSOCIATE
  PROVIDER
}
```

### 5.2 user model — change default

```prisma
model user {
  // ...
  role  Role  @default(USER)   // was: @default(RESIDENT)
  // ...
}
```

### 5.3 Property — add @unique

```prisma
model Property {
  // ...
  platformAddress  String  @unique   // was: String (index only)
  // ...
  // @@index([platformAddress])  ← remove, @unique creates its own index
}
```

### 5.4 New SeatStatus enum

```prisma
enum SeatStatus {
  ACTIVE
  ARCHIVED
  COOLING_OFF
}
```

### 5.5 Seat tables — add status fields

```prisma
model StandardSeat {
  // ... existing fields ...
  status      SeatStatus  @default(ACTIVE)
  archivedAt  DateTime?
}

model SoloSeat {
  // ... existing fields ...
  status      SeatStatus  @default(ACTIVE)
  archivedAt  DateTime?
}

model PremiumSeat {
  // ... existing fields ...
  status      SeatStatus  @default(ACTIVE)
  archivedAt  DateTime?
}
```

---

## 6. Pre-Execution Discovery Checklist

The agent must verify each item before executing any schema or code change.

**G1 — Confirm existing USER role users (should be zero)**

```bash
# Via psql or Supabase SQL editor
SELECT COUNT(*) FROM "user" WHERE role = 'USER';
# Expected: 0 (enum value does not yet exist — this is a syntax check)
# If the enum already exists somehow, STOP AND ESCALATE
```

**G2 — Confirm RESIDENT default impact**

```bash
SELECT COUNT(*) FROM "user" WHERE role = 'RESIDENT';
# Document this count before migration
# These users are correctly RESIDENT — no change needed for them
```

**G3 — Confirm Property.platformAddress has no existing duplicates**

```bash
SELECT "platformAddress", COUNT(*) FROM "Property"
GROUP BY "platformAddress"
HAVING COUNT(*) > 1;
# If any rows returned: STOP AND ESCALATE — duplicates must be resolved before adding @unique
```

**G4 — Confirm auth.ts override location**

```bash
grep -n "RESIDENT\|role.*user\|role.*override" src/shared/api/auth.ts
# Find and document the override at line ~214 before removing it
```

**G5 — Identify all role === RESIDENT filter callsites**

```bash
grep -rn "role.*RESIDENT\|RESIDENT.*role\|role === 'RESIDENT'\|role: 'RESIDENT'" src/ --include="*.ts" --include="*.tsx" | grep -v ".test."
# Review each result: does it intend "any admitted user" or specifically "a resident"?
# Document findings — agent must not change these callsites without DavDev approval
```

**G6 — Confirm invitation acceptance handler location**

```bash
find src -name "*.ts" -path "*/invitations/*accept*" -o -name "*.ts" | xargs grep -l "accept.*invitation\|invitation.*accept" 2>/dev/null
# Identify where the admission hook will be added
```

**G7 — Confirm provider approval handler location**

```bash
find src -name "route.ts" -path "*/admin/providers*/approve*"
# Should be: src/app/api/admin/providers/[id]/approve/route.ts
```

**G9 — Confirm SubscriptionTier defaults for probation/verification thresholds**

```bash
# Check SubscriptionTier table for existing rows
# Via psql or Supabase SQL editor:
SELECT id, name, "verificationRequired" FROM subscription_tiers LIMIT 10;
# Also check ProviderVerification model defaults in schema.prisma:
grep -A 10 "model ProviderVerification" prisma/schema.prisma
# The stub ProviderVerification row must use thresholds from the tenant's
# active SubscriptionTier, not hardcoded values.
# If no SubscriptionTier rows exist for the tenant: STOP AND ESCALATE —
# the stub creation will need a fallback default (e.g. verificationThreshold: 300,
# probationThreshold: 0 from the existing schema defaults).
```

**G8 — Confirm seat tables have no existing status field**

```bash
grep -n "status.*SeatStatus\|SeatStatus\|archivedAt" prisma/schema.prisma
# Expected: zero results (field does not yet exist)
```

---

## 7. Phased Execution Plan

### Phase 1 — Schema migration (no code changes yet)

1. Add `USER` to `Role` enum in `schema.prisma`
2. Change `user.role @default(USER)`
3. Add `@unique` to `Property.platformAddress`, remove `@@index([platformAddress])`
4. Add `SeatStatus` enum
5. Add `status SeatStatus @default(ACTIVE)` and `archivedAt DateTime?` to `StandardSeat`, `SoloSeat`, `PremiumSeat`
6. Run `npx prisma migrate dev --name add_user_role_and_seat_lifecycle`
7. Run `npx prisma generate` to regenerate Drizzle schema
8. Verify: `npx prisma migrate status` shows no drift

**STOP: confirm migration applied cleanly before proceeding to Phase 2.**

### Phase 2 — Auth.ts override removal

1. Locate override in `src/shared/api/auth.ts` (~line 214)
2. Remove the hardcoded `RESIDENT` override — Better Auth's `'user'` string now maps to `USER` naturally via the enum
3. Verify sign-up flow: new accounts should receive `role: USER` in the database
4. Run existing auth tests: `pnpm test src/test/auth*`

**STOP: confirm sign-up creates USER role before proceeding.**

### Phase 3 — Admission hooks

**3A — Invitation acceptance hook (non-PROVIDER roles)**
In `src/app/api/invitations/accept/route.ts` (and `/v1` equivalent):
After a successful invitation acceptance and user creation/login, and **only if** `invitation.role !== 'PROVIDER'`:

```typescript
// Guard: never downgrade an already-admitted user
if (user.role === 'USER') {
  await db.update(users).set({ role: invitation.role }).where(eq(users.id, userId));
}
```

The `Invitation.role` field already carries the correct target role for resident/board/committee paths.

**3B — Provider stub creation hook (both paths)**
This logic fires in two places: invitation acceptance when `invitation.role === PROVIDER`, and `/providers/register` completion. Extract into a shared service function `createProviderStub(userId, tenantId)`:

```typescript
async function createProviderStub(userId: string, tenantId: string) {
  // Fetch thresholds from SubscriptionTier if available, else use schema defaults
  const tier = await getActiveTierForTenant(tenantId);
  const verificationThreshold = tier?.verificationRequired ? 300 : 300; // schema default
  const probationThreshold = 0; // schema default

  const provider = await db
    .insert(serviceProviders)
    .values({
      id: createId(),
      tenantId,
      userId, // FK — agent must confirm ServiceProvider has userId column or equivalent
      companyName: '', // placeholder, completed in /providers/register form
      trade: '',
      isActive: false,
    })
    .returning();

  await db.insert(providerVerifications).values({
    id: createId(),
    providerId: provider[0].id,
    tenantId,
    status: 'PROBATION',
    verificationThreshold,
    probationThreshold,
  });
}
```

> **⚠️ STOP AND ESCALATE:** The current `ServiceProvider` schema has no `userId` FK column (confirmed in root cause §2C). Before implementing `createProviderStub`, the agent must confirm how the existing `POST /api/providers/register` links a provider to a user (likely via session), and either add a `userId` FK column to `ServiceProvider` in this migration or use the existing linkage pattern. Do not invent a new approach — surface the current pattern to DavDev first.

**3C — Provider approval hook**
In `src/app/api/admin/providers/[id]/approve/route.ts`:
This is the **only** place `role: PROVIDER` is ever assigned. Fire after all due diligence checks pass:

```typescript
await db.transaction(async tx => {
  await tx
    .update(providerVerifications)
    .set({ status: 'VERIFIED', endDate: null })
    .where(eq(providerVerifications.providerId, providerId));

  await tx.update(users).set({ role: 'PROVIDER' }).where(eq(users.id, provider.userId));
});
```

Use a transaction — role and verification status must be consistent. If either update fails, neither should commit.

**STOP: confirm provider approval sets both `ProviderVerification.status = VERIFIED` and `user.role = PROVIDER` atomically before proceeding.**

### Phase 4 — Application-layer cross-table address uniqueness guard

In the seat-creation service(s) (wherever `StandardSeat`, `SoloSeat`, `PremiumSeat` records are created — identify from G6/G7 discovery):

Add a guard function:

```typescript
async function assertAddressUnique(platformAddress: string, tenantId: string) {
  const [standard, solo, premium] = await Promise.all([
    db
      .select()
      .from(standardSeats)
      .where(eq(standardSeats.platformAddress, platformAddress))
      .limit(1),
    db.select().from(soloSeats).where(eq(soloSeats.platformAddress, platformAddress)).limit(1),
    db
      .select()
      .from(premiumSeats)
      .where(eq(premiumSeats.platformAddress, platformAddress))
      .limit(1),
  ]);
  if (standard.length || solo.length || premium.length) {
    throw new Error(`Platform address '${platformAddress}' is already in use`);
  }
}
```

Call before any seat insert. This is belt-and-suspenders over the per-table `@unique` constraints.

### Phase 5 — Provider dashboard gate update

In the provider dashboard middleware/route guards, update the gate condition:

```typescript
// Before:
// (no consistent check)

// After:
const isProvider = session.user.role === 'PROVIDER';
const isNotSuspended = serviceProvider?.verification?.status !== 'SUSPENDED';
if (!isProvider || !isNotSuspended) redirect('/dashboard');
```

---

## 8. Risk Register

| ID  | Risk                                                                                                                                                                           | Severity | Mitigation                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Existing `role = 'RESIDENT'` filter callsites implicitly include all non-admin users — adding `USER` means staged users no longer appear in directory, maintenance lists, etc. | Medium   | **Desired behaviour** — staged users should not appear. G5 discovery confirms scope. No callsite changes needed unless a filter is found that explicitly wants "all authenticated users."              |
| R2  | `Property.platformAddress @unique` fails if duplicates exist in production                                                                                                     | High     | G3 discovery is mandatory. If duplicates exist, a data cleanup script must run before migration. STOP gate enforced.                                                                                   |
| R3  | Removing auth.ts override causes sign-up failures if Drizzle schema regeneration is incomplete                                                                                 | High     | Phase 1 must fully complete and `prisma generate` must run before Phase 2 begins.                                                                                                                      |
| R4  | Invitation acceptance hook fires on an already-admitted user (re-accepting an expired invitation)                                                                              | Low      | Guard added: only update role if `user.role === 'USER'`. Never downgrade an admitted role.                                                                                                             |
| R5  | Dual-role users (resident + provider) lose resident access when promoted to PROVIDER                                                                                           | Medium   | Deferred by design. Document in ADR. Admin can manually manage these cases until a composite role model is defined.                                                                                    |
| R6  | Agent onboarding path is not addressed in Phase 3                                                                                                                              | Low      | `AgentAccess` grant creation is a separate flow. Agents arriving via invitation with `role: AGENT` are handled by Phase 3A automatically.                                                              |
| R7  | Drizzle-generated seat schema files do not include new `status`/`archivedAt` fields if `prisma generate` is run before migration lands                                         | Medium   | Always run `prisma migrate dev` before `prisma generate`. Enforced by Phase 1 step ordering.                                                                                                           |
| R8  | `ServiceProvider` has no `userId` FK — `createProviderStub` cannot link provider to user                                                                                       | High     | Explicit STOP AND ESCALATE gate in Phase 3B. Agent must surface existing linkage pattern before implementing the stub function. May require a `userId` column addition in the Phase 1 migration.       |
| R9  | Provider completing `/providers/register` before admin creates their `ServiceProvider` stub (race condition on invitation path)                                                | Low      | Invitation path creates stub on acceptance; the registration form should detect an existing stub and update it rather than create a second one. Agent to confirm idempotency of the register endpoint. |

---

## 9. Deferred Items (Tracked, Not Executed Here)

| Item                                       | Rationale for deferral                                                   | Tracking                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Central `PlatformAddress` registry table   | Requires dual-write migration; no `@mention` routing requirement yet     | COMMUNIQUE-02 §4.3 Option A — revisit when chat addressing becomes a hard requirement |
| Messaging `@mention` routing               | Depends on registry table                                                | COMMUNIQUE-02 §4.4 — deferred with registry                                           |
| `RESIDENT_PROVIDER` composite role         | No dual-role users in production yet                                     | Flag in ADR, revisit when first case emerges                                          |
| Agent onboarding admission hook (explicit) | Phase 3A covers it via invitation `role: AGENT`                          | Confirm in Phase 46 agent testing                                                     |
| Provider `@soralia.org` addresses          | Providers are not community members; use `ServiceProvider.email` for now | Revisit if provider messaging within the platform becomes a requirement               |
| Profile alias management UI                | `Profile` table exists; no frontend CRUD                                 | Separate feature advisory when alias management is scoped                             |

### 9.1 — Provider Platform Hardening BD Issues (G4-Deferred)

The following BD issues were logged at the ADVISORY-026 G4 scope boundary (2026-07-03) as hardening follow-ups from Phase 46 Provider Platform work. They surface gaps noted but not resolved within ADVISORY-015's execution.

| BD Issue | P   | Title                                                             | Advisory §         | Assessment                                                                     |
| -------- | --- | ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `hh1t`   | P2  | Paystack/PayPal gateway — remote subscription lifecycle           | §3C (billing)      | Gateway API integration; webhooks, sandbox testing. Not low-hanging.           |
| `vlfd`   | P3  | Remote recurring subscription identifiers                         | §3C (billing)      | Child of `hh1t`. Blocked until gateway integration lands.                      |
| `woqt`   | P3  | Backward-compatible PayPal refund handling                        | §3C (billing)      | Child of `hh1t`. Blocked.                                                      |
| `rkns`   | P3  | Active gateway health probes                                      | §3C (billing)      | Related to `hh1t`. Requires gateway API integration.                           |
| `he4l`   | P3  | Dedicated due-diligence workflow table                            | §3C (verification) | New table + migration. Straightforward CRUD — moderate effort.                 |
| `a5a5`   | P3  | Immutable provider audit/moderation history table                 | §9 (audit trail)   | New table, append-only pattern — moderate effort.                              |
| `zuju`   | P3  | Harden provider identity bridge                                   | §1C / §2C / §3B    | Core identity architecture (User ↔ ServiceProvider linkage). Not low-hanging.  |
| `b51v`   | P3  | Centralize nav-level provider access gating                       | §5 (gate)          | Utility refactor — **low-hanging**: no schema change, pure code consolidation. |
| `h3wr`   | P3  | Listing view/impression telemetry model                           | _(tangential)_     | New analytics table — moderate effort, independent of advisory scope.          |
| `27ft`   | P3  | Migrate admin components from `@/components/admin/` to FSD layers | _(tangential)_     | File moves + import updates — **low-hanging**: no logic or schema change.      |

**Low-hanging fruit (recommended order):**

1. **`b51v`** — centralize nav gating (refactor only, no schema, unblocks consistent provider UX)
2. **`27ft`** — FSD migration (file moves, removes ESLint override, pure tech debt)
3. **`he4l`** — due-diligence table (small migration, directly extends §3C verification pipeline)

---

## 10. Done Criteria

- [ ] ⏳ `prisma migrate status` shows no drift after Phase 1 migration
- [ ] ⏳ New sign-up creates `user.role = USER` in the database
- [ ] ⏳ Invitation acceptance promotes `user.role` to the role encoded in the invitation (non-PROVIDER paths)
- [ ] ⏳ Invitation acceptance with `role: PROVIDER` creates `ServiceProvider{PENDING}` + `ProviderVerification{PROBATION}`, does **not** set `user.role = PROVIDER`
- [ ] ⏳ Provider self-registration creates same stub rows, does **not** set `user.role = PROVIDER`
- [ ] ⏳ Provider approval sets `user.role = PROVIDER` and `ProviderVerification.status = VERIFIED` atomically in a transaction
- [ ] ⏳ Provider dashboard is inaccessible to `USER`-staged accounts
- [ ] ⏳ `Property.platformAddress` has `@unique` constraint in DB (`\d "Property"` confirms)
- [ ] ⏳ `StandardSeat`, `SoloSeat`, `PremiumSeat` have `status` and `archivedAt` columns
- [ ] ⏳ Cross-table address guard function exists and is called in seat-creation paths
- [ ] G5 callsite review documented — no unintended breakage from `USER` introduction
- [ ] ⏳ G9 SubscriptionTier threshold source confirmed and used in stub creation
- [ ] ⏳ All auth tests pass: `pnpm test src/test/auth*`
- [ ] ⏳ BD `5z3g` closed

---

## 11. ADR Entry Required

On completion, add to `docs/STEERING/ADR.md`:

**ADR-022: USER as Pre-Admission Staging Role**

Decision: `USER` is added to the `Role` enum as the canonical pre-admission state for all sign-ups. Better Auth's hardcoded `role: 'user'` maps naturally to this value. All community roles (`RESIDENT`, `PROVIDER`, `AGENT`, etc.) are reached only via explicit admission hooks. The `USER` role carries no community permissions and is gated by seat-absence rather than a new permission layer.

Consequences (positive): Semantically correct sign-up state; no workaround override needed; admission hooks become the single place where community roles are assigned. Consequences (negative): Any code that assumes `role !== ADMIN` implies a valid community member must be audited (G5).
