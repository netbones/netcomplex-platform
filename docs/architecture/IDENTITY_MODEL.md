---
title: Platform Identity Model
status: current
reviewed: 2026-08-16
tags: [architecture, design]
audience: developer
---

# Platform Identity Model

## Overview

This document defines the identity and routing structure for the Soralia Village Directory Platform, based on the SaaS License Agreement (Section 1, Definitions).

> **⚠️ Terminology Note**: To avoid confusion between platform multi-tenancy and HOA residency:
>
> - **Organization** = the HOA entity (multi-tenant "tenant")
> - **Occupant** = person living in a property (renter/tenant)
> - **Household** = a property unit with its occupants

---

## Key Concepts

### Member vs Occupant vs Resident

| Concept      | Definition                         | Has Property | Lives Here |
| ------------ | ---------------------------------- | ------------ | ---------- |
| **Member**   | Property owner (HOA member)        | ✅ Yes       | Maybe      |
| **Occupant** | Person who lives in community      | —            | ✅ Yes     |
| **Resident** | Premium Seat holder who lives here | ✅ Yes       | ✅ Yes     |

**Important**: A Member always has a property/homeImage associated with their seat. The platform is primarily for Residents, managed by the HOA (Members).

---

## Identity Types

### 1. Member (Standard Seat - Property Owner)

| Property  | Value                                |
| --------- | ------------------------------------ |
| Route     | `/unit/{id}`                         |
| Seat Type | Standard (1 per household, required) |
| HomeImage | ✅ Yes                               |
| Profiles  | Up to 5 (typically occupants)        |

A Member is a property owner in Soralia Village. Every household with a Member has:

- One authenticated Standard Seat login
- One household-level Platform Address (e.g., `unit042@soralia.org`)
- Up to five Address Profiles for household members (occupants, family)

### 2. Occupant (Address Alias)

| Property  | Value                                     |
| --------- | ----------------------------------------- |
| Route     | `/unit/{id}/member/{aliasId}`             |
| Seat Type | Alias (not independent)                   |
| HomeImage | ❌ No (uses rentalImage or occupantImage) |
| Login     | No (managed by Member)                    |

A Occupant is a non-owner resident who lives in the community. They begin their journey as an **Address Alias** attached to the Member's Standard Seat. A rentalImage is an image of the property that is displayed on the occupant's profile if they choose to use it. An occupantImage is an image of the occupant that is displayed on the occupant's profile if they choose to use it.

**Occupant Journey:**

1. Starts as Alias → Can participate in groups, messaging
2. After tenure → Eligible to upgrade to Solo Seat (liberation)
3. Solo Seat → Own independent login for personal identity

### 3. Resident (Solo Seat - Liberation Model)

| Property  | Value             |
| --------- | ----------------- |
| Route     | `/resident/{id}`  |
| Seat Type | Solo (liberation) |
| HomeImage | ✅ Yes (optional) |
| Profiles  | N/A               |

A Resident with a Solo Seat has achieved **liberation** from household constraints. This allows:

- Teenagers getting independent identities
- Adult occupants wanting separate profiles
- Leaseholders wanting independent platform presence
- Family members establishing personal digital identities

### 4. Property Investor (Premium Seat - Portfolio Consolidation)

| Property  | Value                                |
| --------- | ------------------------------------ |
| Route     | `/investor/{id}` (premium dashboard) |
| Seat Type | Premium (portfolio management)       |
| HomeImage | ✅ Yes (per property)                |
| Profiles  | Multi-household management           |

A Premium Seat holder is a **property investor** who owns multiple properties and needs unified management:

- Single login managing multiple Standard Seats
- Consolidated dashboard across all properties
- Cross-property analytics and insights
- Unified leaseholder/occupant management
- Volume pricing for multi-property portfolios

---

## Address Profiles

Address Profiles are sub-identities attached to a Standard Seat (Member's household). They represent occupants, family members, or minors who participate in the platform.

| Property          | Value                                |
| ----------------- | ------------------------------------ |
| Format            | `{name}.{unit}@soralia.org`          |
| Example           | `john.unit042@soralia.org`           |
| Max per Household | 5 (total, all types)                 |
| Route             | `/unit/{id}/member/{aliasId}`        |
| Login             | No (managed by Standard Seat holder) |

### Alias Types

All profiles are flat under the Member's Standard Seat (no nesting):

| Alias Type     | Example                     | Notes                                        |
| -------------- | --------------------------- | -------------------------------------------- |
| Adult Occupant | `john.unit042@soralia.org`  | Non-owner resident, may upgrade later        |
| Minor Child    | `sarah.unit042@soralia.org` | No independent login, managed by Member      |
| Family Member  | `mary.unit042@soralia.org`  | Non-owner family, same structure as occupant |

### Alias Capabilities

- Join interest groups
- Participate in messaging
- Have own profile card
- Receive internal messages (routed to Member's Standard Seat)

### Minor Handling

- Minors start as profiles (direct children of Member, no nesting)
- No independent login capability
- Managed entirely by Member (Standard Seat holder)
- When minor turns 18: eligible for Premium Seat upgrade (after 1 year tenure as profile)
- No special routing or data model distinction needed

### Alias Management

The Standard Seat holder (Member) manages ALL profiles via their household dashboard:

- Create/remove profiles (occupants, family, minors)
- Assign display names
- Set avatar
- Control visibility (public/private)
- No nesting - all profiles at same level

### Alias Login Model

Each household member (Standard Seat holder and Profiles) has their **own personal email** for authentication, but shares the household's **platform address** for internal messaging:

| Entity                 | Login Email (Auth)            | Platform Address (Messaging) |
| ---------------------- | ----------------------------- | ---------------------------- |
| Member (Standard Seat) | `member@email.com` (personal) | `unit042@soralia.org`        |
| Alias 1 (Occupant)     | `john@gmail.com` (personal)   | `john.unit042@soralia.org`   |
| Alias 2 (Minor)        | `sarah@gmail.com` (personal)  | `sarah.unit042@soralia.org`  |

**Login Flow:**

1. User enters their personal email + password
2. System authenticates and loads their profile
3. Profile users see their profile, Member sees Member profile
4. Messages addressed to platform address (`john.unit042@`)

**Benefits:**

- Standard password reset flow per person
- No shared credentials
- Clear identity per user
- Better Auth compatible (standard email/pass)
- Profiles can have different emails (personal or household-subaddressed)

### Alternative: Magic Link + Alias Selection

If password management is a concern, consider magic link authentication:

```
1. User enters: unit042@soralia.org (household)
2. System shows: "Select who you are:" [Member] [John] [Sarah]
3. Magic link sent to registered email for that person
4. Click link → logged in as that identity
```

**Pros:** No passwords to reset
**Cons:** Requires email per profile anyway, extra login step

### Design Decision Pending

**Status: RESOLVED (2026-08-16) via ADVISORY-038.**

The platform has adopted **per-profile personal email** as the canonical login
model. Evidence trail:

- Accounts are only ever created via `Invitation` acceptance, which is
  already personal-email-scoped (`Invitation.email`, `user.email` uniqueness).
- The self-registration join-request flow (ADVISORY-038) submits a personal
  `requestedEmail` and promotes to a normal `Invitation` on admin approval —
  it does **not** introduce a household-credential or name-picker path.
- `Profile.userId` remains nullable to represent non-login household occupants,
  while login-capable members each have their own `user` row.

The magic-link + household-name-picker alternative (Option 2 below) is
**rejected** for this codebase. It would require a second account-creation
code path alongside `Invitation` and contradicts the existing
personal-email-per-person acceptance flow.

<details>
<summary>Original open decision (retained for history)</summary>

We need to decide between:

1. **Per-profile personal email** (recommended) - each user has own email for auth
2. **Magic link system** - single household email, identity selection on login

This affects Better Auth configuration and onboarding flow.

</details>

---

## Route Mapping

```
/unit/{id}                 → Member (Standard Seat - property owner)
/unit/{id}/member/{alias} → Occupant (Address Profile - non-owner resident)
/resident/{id}             → Resident (Premium Seat - lives here, has own seat)
/member/{id}               → Member (Premium Seat - doesn't live here, HOA role)
```

### Route Priority

1. `/unit/{id}` - Always exists for Member households
2. `/unit/{id}/member/{aliasId}` - Profiles attached to Member's seat
3. `/resident/{id}` - Premium Seat (resident, owns or upgraded occupant)
4. `/member/{id}` - Premium Seat (non-resident owner or HOA role)

---

## Organization Model (Multi-Tenant)

This section defines how the platform supports multiple HOAs (future multi-tenancy).

### Key Terminology

| Term             | Platform Context                            | HOA Context                  |
| ---------------- | ------------------------------------------- | ---------------------------- |
| **Organization** | A separate instance (HOA) on the platform   | The HOA itself               |
| **Member**       | User belonging to an Organization           | Property owner               |
| **Seat**         | Authentication identity within Organization | Standard/Premium seat in HOA |
| **Profile**      | Persona under a Seat (profile)              | Occupant under household     |

### Organization Hierarchy

```
Platform
└── Organization (HOA)
    └── Household (Property Unit)
        ├── Standard Seat (Member account)
        └── Profiles (up to 5: Occupants, family, minors)
    └── Premium Seats (Independent, may exist outside household)
```

### Multi-Tenant Data Isolation

- Every data record includes `organizationId`
- Row-Level Security (RLS) in PostgreSQL enforces isolation
- Subdomain routing: `{community}.soralia.app` for each HOA

### Netflix Model for Household Login

**Recommendation**: Each household shares ONE login credentials, with profile selection at session start.

**Flow**:

1. User enters household credentials (email/password)
2. System shows profile selector: "Who is using?"
3. User selects their persona (Member or Occupant)
4. Session scoped to selected profile

**Benefits**:

- Simpler authentication (Better Auth standard config)
- No credential sharing required
- Clear identity per profile
- Works with existing per-profile email approach

**Alternative**: Per-profile credentials (more complex, requires Better Auth Organization/Teams)

---

## Upgrade Paths

### 1. Occupant Liberation Path (Alias → Solo Seat)

```
┌──────────────────────────────────────────────────────────────────┐
│                     OCCUPANT LIBERATION                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  START                      LIBERATION ELIGIBLE                   │
│  ┌─────────┐               ┌─────────────┐                      │
│  │ Occupant  │ ─────────────►│ Occupant w/   │                      │
│  │ Alias   │  Tenure        │ Tenure       │                      │
│  │         │  Complete      │ Complete     │                      │
│  └─────────┘               └─────────────┘                      │
│       │                          │                               │
│       │                          │ (pay liberation fee)           │
│       │                          ▼                               │
│       │                 ┌─────────────┐                         │
│       │                 │  Solo Seat  │                         │
│       │                 │  (Liberation)│                         │
│       │                 │             │                         │
│       │                 │/resident/{id}│                         │
│       │                 └─────────────┘                         │
│                              │                                   │
│                              │ Own independent identity          │
│                              ▼                                   │
│                       ┌─────────────┐                           │
│                       │ Independent │                           │
│                       │ Platform    │                           │
│                       │ Presence    │                           │
│                       └─────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

**Liberation Triggers:**

- Teenager becoming independent
- Adult occupant wanting separate profile
- Leaseholder wanting independent identity
- Family member establishing personal presence

### 2. Property Investor Path (Multiple Standard Seats → Premium Seat)

```
┌──────────────────────────────────────────────────────────────────┐
│                     PROPERTY INVESTOR UPGRADE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  START                      MULTI-PROPERTY OWNER                  │
│  ┌─────────┐               ┌─────────────┐                      │
│  │ 1 Std   │ ─────────────►│ 2+ Standard │                      │
│  │ Seat    │  Acquire      │ Seats        │                      │
│  │         │  Properties   │ (Separate)   │                      │
│  └─────────┘               └─────────────┘                      │
│       │                          │                               │
│       │                          │ (consolidation upgrade)        │
│       │                          ▼                               │
│       │                 ┌─────────────┐                         │
│       │                 │ Premium     │                         │
│       │                 │ Seat        │                         │
│       │                 │ (Portfolio) │                         │
│       │                 │             │                         │
│       │                 │/investor/{id}│                         │
│       │                 └─────────────┘                         │
│                              │                                   │
│                              │ Unified portfolio management      │
│                              ▼                                   │
│                       ┌─────────────┐                           │
│                       │ Single      │                           │
│                       │ Dashboard   │                           │
│                       │ for All     │                           │
│                       │ Properties  │                           │
│                       └─────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

**Portfolio Benefits:**

- Single login for all properties
- Unified dashboard and analytics
- Cross-property leaseholder management
- Volume pricing discounts
- Streamlined property operations

---

## Profile Widgets by Route

### `/unit/{id}` (Member - Standard Seat)

- HomeImage banner (property photo)
- Member avatar + occupant profile avatar stack
- Bookshelf widget (collective household reading)
- Published content (aggregated from all household members)
- Groups widget (collective household interests)
- Occupant management panel
- Contact info (primary owner)
- Household tag cloud (from all content)

### `/unit/{id}/member/{aliasId}` (Occupant - Profile)

- Avatar + display name (uses rentalImage or occupantImage)
- Groups (joined as profile)
- Content (published as profile)
- Household link (back to main unit page)
- Personal interests and activities

### `/resident/{id}` (Solo Seat - Liberation)

- HomeImage banner (optional, personal residence)
- Personal avatar (independent identity)
- Bookshelf widget (personal reading)
- Published content (individual authorship)
- Groups widget (personal memberships)
- Contact info (personal, privacy controlled)
- Independent social features

### `/investor/{id}` (Premium Seat - Portfolio)

- Portfolio dashboard (multiple properties)
- Property cards with homeImages
- Cross-property analytics
- Unified leaseholder management
- Multi-property calendar
- Investment performance metrics
- Consolidated notifications

---

## Seat Comparison Matrix

| Feature             | Standard Seat       | Address Alias               | Solo Seat (Liberation)    | Premium Seat (Portfolio)     |
| ------------------- | ------------------- | --------------------------- | ------------------------- | ---------------------------- |
| Route               | `/unit/{id}`        | `/unit/{id}/member/{alias}` | `/resident/{id}`          | `/investor/{id}`             |
| Required            | Yes (per household) | No                          | No (optional upgrade)     | No (optional consolidation)  |
| Platform Address    | `unitNNN@domain`    | `name.unitNNN@domain`       | `name@domain`             | `investor@domain`            |
| Max per Household   | 1                   | 5                           | N/A (per person)          | Unlimited households         |
| Has HomeImage       | ✅ Yes              | ❌ No                       | ✅ Yes (optional)         | ✅ Yes (per property)        |
| Independent Login   | Yes                 | ❌ No                       | ✅ Yes                    | ✅ Yes                       |
| Travels with Person | ❌ No               | N/A                         | ✅ Yes                    | ❌ No (portfolio management) |
| Can Have Profiles   | ✅ Yes              | ❌ No                       | ❌ No                     | ❌ No                        |
| Manages Households  | 1 household         | N/A                         | 0-1 household             | Multiple households          |
| Price               | Included            | Included                    | $Y/month (liberation fee) | $Z/month (volume pricing)    |
| Target User         | Property Owner      | Household Occupant          | Independent Occupant      | Property Investor            |

---

## Complimentary Allocation

Five Premium Seats provided at no charge for HOA board members and committee representatives.

- Type: Premium Seat
- Route: `/member/{id}` (non-resident)
- HomeImage: ✅ Yes (property owner)
- Price: Complimentary

---

## Data Model Summary

> **Canonical source:** `prisma/schema.prisma`. The model below reflects the actual schema. See "Schema Drift Notes" below for rationale behind changes from the original IDENTITY_MODEL.md design.

```
user
├── standardSeat[] (0:n) - Property owner household management
├── soloSeat[] (0:n) - Personal liberation identity
├── premiumSeat? (0:1) - Multi-property portfolio management
├── Profile[] (0:n) - Household occupants (via Household)
├── ServiceProvider? (0:1) - Provider registration link
└── profileSlug? - Per-user slug/identifier

StandardSeat (Property Owner - Household Management)
├── propertyId (links to Property, not Household)
├── platformAddress (unitNNN@domain) @unique
├── userId (property owner)
├── isPrimaryOwner (supports co-ownership)
└── user (FK)

SoloSeat (Liberation - Independent Identity)
├── userId (liberated occupant)
├── platformAddress (name@domain) @unique
├── propertyId? (optional - current residence property)
├── seatType (RESIDENT | MEMBER)
├── isComplimentary (board/committee members)
└── linkedFromProfileId? (origin alias when upgrading)

PremiumSeat (Portfolio - Multi-Property Management)
├── userId (property investor) @unique
├── platformAddress (investor@domain) @unique
├── subscriptionTier (pricing tier)
├── maxProperties (tier limits)
├── messageRetentionDays (chat retention override)
├── tier (feature tier: "foundation" etc.)
└── propertyPremiumSeats[] (join table to Property)

Profile (Household Occupant - was AddressProfile)
├── householdId (parent Household, not StandardSeat)
├── profileAddress (name.unitNNN@domain) @unique
├── displayName
├── avatar / occupantImage / rentalImage
├── isPublic
├── householdRole (OCCUPANT | MINOR | FAMILY)
├── status (ACTIVE | UPGRADED | REMOVED | EVICTED | LEASE_ENDED)
├── residencyType (FAMILY | RENTER | OWNER)
├── landlordId? (FK to user)
├── occupantSince / leaseStartDate / leaseEndDate
└── household (FK)
```

---

## Schema Drift Notes

The following deviations exist between the original design in this document and the actual `prisma/schema.prisma` implementation, with rationale:

| Original Design                                 | Actual Schema                                                                    | Rationale                                                                                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `AddressProfile` table                          | `Profile` table                                                                  | Generic name supports reuse beyond address-aliasing (agent profiles, service profiles). `profileAddress` field still serves the alias purpose.                                                                          |
| `Profile.standardSeatId` (FK to StandardSeat)   | `Profile.householdId` (FK to Household)                                          | Profiles belong to a Household (occupancy period), not a StandardSeat (ownership). This correctly models rental turnover — when a new tenant moves in, the Household changes but the StandardSeat stays with the owner. |
| `StandardSeat.householdId`                      | `StandardSeat.propertyId` + `isPrimaryOwner`                                     | Direct link to Property enables co-ownership (multiple owners per property). Household is a separate temporal occupancy record.                                                                                         |
| `SoloSeat.householdId`                          | `SoloSeat.propertyId` + `seatType` + `linkedFromProfileId`                       | propertyId links SoloSeats to a Property instead of Household. seatType (RESIDENT/MEMBER) distinguishes living-in vs HOA-member-only. linkedFromProfileId tracks liberation origin.                                     |
| `PremiumSeat.linkedHouseholds[]` (direct array) | `PropertyPremiumSeat` join table                                                 | Proper many-to-many between PremiumSeat and Property, normalized with join table.                                                                                                                                       |
| `OccupantType` enum (`OCCUPANT                  | MINOR                                                                            | FAMILY`)                                                                                                                                                                                                                | `HouseholdRole` enum + `ResidencyType` enum | Split into two concerns: role within household (HouseholdRole) vs legal/lease status (ResidencyType: FAMILY/RENTER/OWNER). |
| `SeatType` enum                                 | Removed — not needed                                                             | Seat type is inherently known by which table the record lives in. No cross-table type discriminator required.                                                                                                           |
| `User.AddressProfiles[]` direct relation        | `user.Profile[]` via `Household`                                                 | Profiles are scoped to Households, not directly to users. A user can have profiles across multiple Households (e.g. property owner with profiles in their own household + as landlord in another).                      |
| `MessageRead` table                             | Removed — replaced by `ConversationParticipant.lastReadAt` + `lastReadMessageId` | Simpler: tracking last-read position per participant instead of individual read receipts per message.                                                                                                                   |
| `UserGroup` table                               | `GroupMember` table                                                              | Renamed for clarity. Same structure.                                                                                                                                                                                    |

**Note:** The `prisma/schema.prisma` evolves independently. Cross-table uniqueness (preventing the same address across different seat types) is not enforced at DB level — this is a known gap tracked in COMMUNIQUE-02.

---

## Implementation Notes

1. **Three Distinct Seat Types**: Standard (household), Solo (liberation), Premium (portfolio)
2. **Liberation Model**: Solo Seats enable occupant independence from household constraints
3. **Portfolio Model**: Premium Seats consolidate multiple Standard Seats for investors
4. **Household Integrity**: Standard Seats always tied to specific properties
5. **Upgrade Paths**: Clear progression from profiles → liberation → portfolio management
6. **Business Model**: Tiered pricing reflecting value (Standard < Solo < Premium)
7. **Route Structure**: `/unit/{id}`, `/resident/{id}`, `/investor/{id}` for three seat types
8. **Address Profiles**: Flat structure under Standard Seats (max 5 per household)

---

_Last Updated: 2026-06-23_
_Based on: SaaS License Agreement v4; schema drift reconciled against prisma/schema.prisma_

```

```

```

```
