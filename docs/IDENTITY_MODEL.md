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

We need to decide between:

1. **Per-profile personal email** (recommended) - each user has own email for auth
2. **Magic link system** - single household email, identity selection on login

This affects Better Auth configuration and onboarding flow.

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

```

User
├── StandardSeat? (0:1) - Property owner household management
├── SoloSeat? (0:1) - Personal liberation identity
├── PremiumSeat? (0:1) - Multi-property portfolio management
└── AddressProfiles[] (0:n) - Household occupants (up to 5 per StandardSeat)

StandardSeat (Property Owner - Household Management)
├── householdId (links to managed household)
├── platformAddress (unitNNN@domain)
├── userId (property owner)
└── AddressProfiles[] (occupants, family, minors - all flat)

SoloSeat (Liberation - Independent Identity)
├── userId (liberated occupant)
├── platformAddress (name@domain - independent)
├── householdId (optional - current residence)
└── isComplimentary (board/committee members)

PremiumSeat (Portfolio - Multi-Property Management)
├── userId (property investor)
├── platformAddress (investor@domain)
├── linkedHouseholds[] (portfolio of managed properties)
├── subscriptionTier (pricing tier)
└── maxProperties (tier limits)

AddressProfile (Household Occupant - Flat under StandardSeat)
├── standardSeatId (parent household)
├── profileAddress (name.unitNNN@domain)
├── displayName
├── avatar
├── isPublic
├── occupantType (OCCUPANT, MINOR, FAMILY)
└── occupantSince (tenure tracking)

```

User
├── StandardSeat? (1:1) - Member household login
├── SoloSeat? (1:1) - Personal login (resident or member)
└── AddressProfiles[] (1:n) - up to 5 per StandardSeat

StandardSeat (Member)
├── householdId
├── platformAddress (unitNNN@domain)
├── memberId (User FK - property owner)
└── AddressProfiles[] (occupants, family)

SoloSeat
├── userId
├── platformAddress (name@domain)
└── isComplimentary (boolean)

AddressProfile (Occupant)
├── standardSeatId
├── profile (name.unitNNN)
├── displayName
├── avatar
└── isPublic

```

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

_Last Updated: 2026-03-30_
_Based on: SaaS License Agreement v4_

```

```

```
