# COMMUNIQUE-02 — Provider Onboarding Flow & Address Management System

**To:** Architecture Advisors
**Date:** 2026-06-23
**Status:** Decision Required

---

## 1. What We Want

Architecture guidance on two foundational gaps that emerged during the Phase 46 Provider Platform work:

1. **Provider Onboarding Flow** — A clear, secure onboarding path for service providers (contractors, vendors) that distinguishes them from resident users with property addresses.
2. **Address Management System** — A system for provisioning, assigning, and managing Platform Addresses spanning Standard Seat (`unitNNN@soralia.org`), Solo/Premium (`name@soralia.org`), and Address Aliases (`name.unitNNN@soralia.org`).

---

## 2. Current State

### 2.1 Provider Onboarding

The provider platform has two route spaces:

| Space         | Route                   | Audience  |
| ------------- | ----------------------- | --------- |
| Provider Dash | `dashboard/providers/*` | Providers |
| Admin Panel   | `admin/providers/*`     | Admins    |

**Existing infrastructure:**

| Concern                        | Status                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| Provider registration API      | `POST /api/providers/register` — exists, validates against session  |
| Registration mode              | `OPEN` / `INVITE_ONLY` per tenant via `getProviderRegistrationMode` |
| Provider registration page     | `/providers/register` — self-serve form with legal acceptance       |
| Invitation system              | `/api/invitations` — general invitation tokens exist                |
| Provider admin CRUD            | `/api/admin/providers/` — approve, reject, suspend, verify          |
| Due diligence                  | `/api/admin/providers/[id]/due-diligence` — exists                  |
| Provider-facing billing        | `dashboard/providers/billing` — exists                              |
| Provider verification pipeline | `PENDING → PROBATION → VERIFIED → SUSPENDED` — exists (prisma:1757) |

**Current registration flow:**

```
User signs in → /providers/register
  ├── Not authenticated → "Sign in required"
  ├── Already linked → redirect to /dashboard/providers
  ├── Registration mode INVITE_ONLY → "Contact administrator"
  └── Registration mode OPEN → RegistrationForm
```

The `invite_only` path shows a static message. No invitation email, no invitation acceptance workflow — the general `/api/invitations` system exists but is not wired to provider onboarding.

### 2.2 Address Management — Partially Built, No Unified System

The seat tables from IDENTITY_MODEL.md **exist** in `prisma/schema.prisma`, but there is no unified address management layer:

| Entity            | Address Pattern                | Table                       | `platformAddress` | Unique?           |
| ----------------- | ------------------------------ | --------------------------- | ----------------- | ----------------- |
| **Standard Seat** | `unitNNN@soralia.org`          | `StandardSeat` (prisma:327) | `platformAddress` | `@unique` ✅      |
| **Address Alias** | `name.unitNNN@soralia.org`     | `Profile` (prisma:173)      | `profileAddress`  | `@unique` ✅      |
| **Solo Seat**     | `name@soralia.org`             | `SoloSeat` (prisma:307)     | `platformAddress` | `@unique` ✅      |
| **Premium Seat**  | `mycustomname@soralia.org`     | `PremiumSeat` (prisma:286)  | `platformAddress` | `@unique` ✅      |
| **Property**      | `unitNNN@soralia.org` (legacy) | `Property` (prisma:439)     | `platformAddress` | **NOT unique** ❌ |

**Current reality:**

- All three seat tables (`StandardSeat`, `SoloSeat`, `PremiumSeat`) exist with `@unique` platform addresses — individual namespace uniqueness **within each table** is enforced at DB level
- `Profile.profileAddress` is `@unique` — the alias system exists, just named `Profile` instead of `AddressProfile`
- `Property.platformAddress` is **not unique** — the same address could theoretically exist on multiple property records (likely a bug or oversight)
- `user.profileSlug` (prisma:117) exists — a per-user slug/identifier available
- `Role` enum (prisma:1906) includes `PROVIDER` — provider role is already defined, just not used in the auth flow
- **No cross-table uniqueness** — nothing prevents `john@domain` from existing as both a `SoloSeat` and a `PremiumSeat`. The DB-level `@unique` is per-table only
- **No unified address registry** — resolving `@john` for messaging requires querying up to 5 tables
- **No address lifecycle states** — no seat table has status fields for `ARCHIVED`, `COOLING_OFF`, etc. Only `Profile` has a `ProfileStatus` enum (`ACTIVE | UPGRADED | REMOVED | EVICTED | LEASE_ENDED`)
- **No alias management UI** — `Profile` table exists but no frontend for creating/managing aliases

### 2.3 Messaging Overlap

The chat system (`CONVERSATION` / `MESSAGE` tables) uses `userId`-based participant resolution. The system currently lacks any `@mention` or address-based routing. The AGENTS.md references a Chat E2EE discussion that notes the chat system uses addresses differently — but the SaaS agreement defines Platform Addresses as the routing mechanism for internal messaging.

The overlap creates ambiguity:

- Should `@john` in a group chat resolve to an Address Alias, a Solo Seat, or a user's display name?
- Does addressing `@unit042` route to the household (Standard Seat), forwarding to all members?
- How do providers factor into this — do they get `@provider.companyname` addresses?

---

## 3. Why It's Not Simple

### 3.1 Provider Onboarding — Unclear Identity Model

Providers are not residents. They don't have a property, a unit number, or a Household License. Yet they need:

- A platform account linked to a Better Auth session
- Access to `dashboard/providers/*` (provider workspace)
- A verification/due diligence pipeline
- Billing integration (provider tiers exist)
- Possibly their own Platform Address (`provider.company@soralia.org`?)

Open questions:

| Question                                            | Impact                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Should providers be `User` records with a new role? | Reuses Better Auth; but providers don't need directory profiles, groups, etc.  |
| Should providers be a separate entity with auth?    | Cleaner domain separation; but means custom auth logic, no out-of-box sessions |
| Does a provider == a person or a company?           | Company billing + person dashboard — two identities or one?                    |
| Can a resident also be a provider?                  | John (Unit 42) runs VoltSafe Electrical — one account or two?                  |
| What happens when a provider leaves the community?  | Archival/cool-off? Data portability?                                           |

### 3.2 Address Namespace Collisions

```
unit042@soralia.org          ← Property (Standard Seat)
john.unit042@soralia.org     ← Alias (AddressProfile)
john@soralia.org             ← Solo Seat (if John liberates)
j.smith@soralia.org          ← Premium Seat
soralia-plumbing@soralia.org ← Provider address (theoretical)
```

The SaaS agreement defines a **Community Domain** namespace (`@soralia.org`). Every address within it must be unique. Without a central address registry, collisions are inevitable — especially as aliases, solo seats, and provider addresses all draw from the same pool of human-readable names.

### 3.3 Address Lifecycle

The SaaS agreement defines:

| Event              | Duration  | Rule                                                           |
| ------------------ | --------- | -------------------------------------------------------------- |
| Portability Window | 30 days   | Departing Premium Seat can export data                         |
| Archival Period    | 90 days   | Read-only retention before permanent deletion                  |
| Cooling-Off Period | 6 months  | Premium Seat address cannot be reissued                        |
| Household turnover | Immediate | New occupant moves in — alias addresses reassign?              |
| Liberation         | Per event | John upgrades from alias `john.unit042` to solo `john@soralia` |

None of these lifecycle rules have database schema or code to enforce them.

### 3.4 Messaging Routing Architecture

Current chat system routes messages by `userId` via `ConversationParticipant`. Introducing address-based routing (`@unit042` → household, `@john.unit042` → alias, `@john` → solo seat) means either:

- **Central address resolution service** — every chat message resolves `@mentions` at send-time to participant IDs
- **External ID per participant** — each Platform Address maps to a `ConversationParticipant` directly
- **Hybrid** — `@unit042` mentions route via address lookup, while direct conversation adds stay userId-based

---

## 4. Options

### 4.1 Provider Onboarding

#### Option A — User-as-Provider (Current Direction)

Providers are `User` records with a linked `service_providers` record. The registration flow creates a Better Auth user if one doesn't exist, then links a `service_providers` row. Provider dashboard routes are gated by the provider link, not by role.

**Pros:** Reuses existing auth. Provider sees "my dashboard" with their existing identity. Impersonation works.  
**Cons:** Blurs domain boundary between resident and provider. Every user query needs "is this a provider?" branching. Provider-specific fields pollute the user model.

#### Option B — Separate Provider Auth

Providers register through a distinct `/providers/register` flow. The `Role` enum already includes `PROVIDER` (prisma:1915) — a user record could be created with `role: PROVIDER`. Dashboard routes are gated by role check.

**Pros:** `PROVIDER` role already exists in the schema. Clean domain separation via role gating. Single auth session works for all roles.  
**Cons:** Provider users inherit the full `user` model (interests, directory profile, groups — irrelevant for providers). Session context-switching needed if a user is both resident and provider.

#### Option C — Invitation-Only with Self-Service

Admin initiates provider onboarding via invitation. Invitation encodes tenant + provider metadata. Provider clicks link → accepts → fills registration form (some fields pre-filled from invitation) → legal acceptance → due diligence → activation.

**Pros:** Controlled onboarding. Admin curates which providers enter. Prevents spam registrations. Works well with existing `/api/invitations` system.  
**Cons:** Slower provider acquisition. Requires invitation UI in admin panel. Open registration closed by default — providers must be invited for every tenant.

### 4.2 Address Management

#### Option A — Central Address Registry Table

Create a single `PlatformAddress` table as the source of truth:

```prisma
model PlatformAddress {
  id          String        @id @default(cuid())
  tenantId    String
  address     String        @unique  // "unit042@soralia.org"
  type        AddressType   // STANDARD_SEAT | ALIAS | SOLO | PREMIUM
  ownerId     String?       // User, ServiceProvider, or null
  ownerType   String?       // polymorphic: "user", "provider"
  linkedTo    String?       // parent address for aliases (unit042 → john.unit042)
  status      AddressStatus // ACTIVE | ARCHIVED | COOLING_OFF
  expiresAt   DateTime?
  createdAt   DateTime
}
```

**Pros:** Single query for all address resolution. Uniqueness enforced at DB level. Lifecycle states baked in. Clean `@mention` resolution.  
**Cons:** Polymorphic owner reference (no FK constraint). Migration to populate from existing `Property.platformAddress`. Dual-write concern during migration.

#### Option B — Per-Seat Type Tables (Current State)

Already implemented: `StandardSeat`, `SoloSeat`, `PremiumSeat`, `Profile` (alias) tables each carry their own address with per-table `@unique`. This is the **current design** in `prisma/schema.prisma`.

**Pros:** Matches the SaaS agreement and IDENTITY_MODEL. Strong typing per seat type. No polymorphic references. DB-enforced uniqueness within each type.  
**Cons:** No single query for address resolution (must UNION up to 5 tables). Cross-table uniqueness is NOT enforced — nothing prevents a `SoloSeat` and `PremiumSeat` sharing the same address. No lifecycle states. `Property.platformAddress` lacks `@unique` (likely a bug).

#### Option C — Hybrid: Registry Table + Seat-Specific Tables

Both exist. The registry table is the "routing table" containing only address + type + ownerId for fast lookup. Seat-specific tables contain the full domain model. The registry is populated by triggers/events when seat records are created.

**Pros:** Fast address resolution for messaging/mentions. Full domain model in seat tables. DB-enforced uniqueness in the registry.  
**Cons:** Dual-write complexity. Eventual consistency window between seat table and registry. More migration work.

### 4.3 Messaging Addressing

#### Option A — Resolve @mentions at Send-Time

When a message contains `@unit042`, the send handler queries the address registry → resolves to one or more `userId`s → adds them as conversation participants if not already.

**Pros:** No schema changes to chat. Natural UX. Works with existing `ConversationParticipant`.  
**Cons:** Every message send needs a lookup. Group chats with many @mentions get complex. Archived addresses need handling.

#### Option B — Pre-resolve Addresses to Participant Records

Each Platform Address is mapped to a `ConversationParticipant` record at conversation creation time. The chat system never queries the address registry at send-time — the participant list already contains all addressable identities.

**Pros:** No lookup at message send time. Familiar pattern (Slack/Discord). Conversation participants stay in sync with address lifecycle.  
**Cons:** Address-to-user mapping changes over time (renter moves out). Participant records need reconciliation when addresses change. More complex conversation creation.

#### Option C — Username Plugin (Better Auth)

Use Better Auth's `username` plugin to assign each user a `@username`. Standard Seats get `@unitNNN`, Solo Seats get `@name`, Aliases get `@name.unitNNN`. The chat system uses these usernames for mention resolution.

**Pros:** Built into Better Auth. No custom table for names. Username uniqueness enforced by Better Auth. Login can use username or email.  
**Cons:** `@name.unitNNN` format may hit username character limits. Better Auth username is per-user, not per-address — so a user with multiple aliases needs multiple Better Auth accounts. No lifecycle management (archival, cool-off).

---

## 5. Recommendation Needed

We need guidance on the preferred path across all three dimensions:

### Priority Questions

1. **Provider identity model** — Should providers be `User` records (Option A) or a separate auth persona (Option B)?

2. **Provider onboarding** — Should we double down on invitation-only (Option C, current direction) or build self-service registration with admin approval (Option A/B)?

3. **Address registry** — Central table (Option A), per-seat tables (Option B), or hybrid (Option C)?

4. **Messaging routing** — Resolve at send-time (Option A), pre-resolve to participants (Option B), or use Better Auth username plugin (Option C)?

5. **Provider addresses** — Should providers get Platform Addresses at all? If so, in what namespace (`@provider.company`)?

---

## 6. Related

- `prisma/schema.prisma` — **Canonical source of truth** for all tables referenced above
- `docs/architecture/IDENTITY_MODEL.md` — Seat types, address formats, alias limits
- `docs/architecture/PROPERTY_HOUSEHOLD_MODEL.md` — Property vs Household distinction
- `docs/product/SaaS/SaaS_License_Agreement_Soralia_v6.md` — Legal definitions of Platform Address, Address Alias, Archival/Cool-off periods
- `docs/features/CHAT_DESIGN.md` — Current chat/messaging implementation
- `docs/architecture/domain_username_mapping.md` — Better Auth username plugin notes
- `src/app/(tenant)/providers/register/page.tsx` — Current registration flow
- `src/app/api/providers/register/route.ts` — Registration API handler
- `docs/communiques/COMMUNIQUE.md` — Earlier architecture communique (Better Auth admin plugin)
