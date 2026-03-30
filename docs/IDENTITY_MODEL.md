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
- One household-level Platform Address (e.g., `unit042@sorialia.org`)
- Up to five Address Profiles for household members (occupants, family)

### 2. Occupant (Address Alias)

| Property  | Value                          |
| --------- | ------------------------------ |
| Route     | `/unit/{id}/member/{aliasId}`  |
| Seat Type | Alias (not independent)        |
| HomeImage | ❌ No (uses member's property) |
| Login     | No (managed by Member)         |

A Occupant is a non-owner resident who lives in the community. They begin their journey as an **Address Alias** attached to the Member's Standard Seat.

**Occupant Journey:**

1. Starts as Alias → Can participate in groups, messaging
2. After 1 year tenure → Eligible to upgrade to Premium Seat
3. Premium Seat → Own independent login, can be resident or not

### 3. Resident (Premium Seat - Living in Community)

| Property  | Value              |
| --------- | ------------------ |
| Route     | `/resident/{id}`   |
| Seat Type | Premium (optional) |
| HomeImage | ✅ Yes             |
| Profiles  | N/A                |

A Resident is a Premium Seat holder who physically lives in the community (owner-occupier or upgraded occupant). Premium Seats are independent of the household unit.

### 4. Member (Premium Seat - Non-Resident)

| Property  | Value                   |
| --------- | ----------------------- |
| Route     | `/member/{id}`          |
| Seat Type | Premium (optional)      |
| HomeImage | ✅ Yes (property owner) |
| Profiles  | N/A                     |

A non-resident Member is a property owner who doesn't live in the community but maintains HOA involvement (board member, committee representative).

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

## Venn Diagram: User Categories

```
                          ALL PLATFORM USERS
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │    ┌───────────────────────────────────────────────────┐   │
    │    │              HOA MEMBERS (Property Owners)           │   │
    │    │  ┌───────────────────────────────────────────────┐ │   │
    │    │  │ Member (Standard Seat /unit/{id})             │ │   │
    │    │  │                                               │ │   │
    │    │  │  Profiles (flat, up to 5):                      │ │   │
    │    │  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐     │ │   │
    │    │  │  │Adult  │ │Adult  │ │Minor  │ │Family │     │ │   │
    │    │  │  │Occupant │ │Occupant │ │Child  │ │Member │     │ │   │
    │    │  │  └───────┘ └───────┘ └───────┘ └───────┘     │ │   │
    │    │  │                                               │ │   │
    │    │  │  Premium Seats (if upgraded):                  │ │   │
    │    │  │  ┌─────────┐  ┌─────────┐                     │ │   │
    │    │  │  │Resident │  │Non-Res. │                     │ │   │
    │    │  │  │Member   │  │Member   │                     │ │   │
    │    │  │  └─────────┘  └─────────┘                     │ │   │
    │    │  └───────────────────────────────────────────────┘ │   │
    │    └───────────────────────────────────────────────────┘   │
    │                                                             │
    │    ┌───────────────────────────────────────────────────┐   │
    │    │              STANDALONE PREMIUM SEATS                │   │
    │    │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
    │    │  │Resident │  │Resident │  │  Board  │             │   │
    │    │  │(Owner)  │  │(Occupant) │  │ Member  │             │   │
    │    │  └─────────┘  └─────────┘  └─────────┘             │   │
    │    └───────────────────────────────────────────────────┘   │
    │                                                             │
    │  ALL ALIASES (Occupants, Minors, Family) = flat under Member  │
    │  MINORS = No independent login, managed by Member           │
    │  UPGRADE PATH: Alias → Premium Seat (after 1 year tenure)   │
    └─────────────────────────────────────────────────────────────┘

    Standard Seat:  /unit/{id}       (required, Member = property owner)
    Profiles:        /unit/{id}/member/{aliasId}  (up to 5, all flat)
    Premium:        /resident/{id}  (resident with own seat)
                    /member/{id}    (non-resident Member)
```

---

## Occupant Upgrade Path

```
┌──────────────────────────────────────────────────────────────────┐
│                     OCCUPANT JOURNEY                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  START                      UPGRADE ELIGIBLE                      │
│  ┌─────────┐               ┌─────────────┐                      │
│  │ Occupant  │ ─────────────►│ Occupant w/   │                      │
│  │ Alias   │  1 year       │ 1 Year      │                      │
│  │         │  tenure        │ Tenure      │                      │
│  └─────────┘               └─────────────┘                      │
│       │                          │                               │
│       │                          │ (pay premium)                  │
│       │                          ▼                               │
│       │                 ┌─────────────┐                         │
│       └────────────────►│  Premium    │                         │
│         (member's      │  Seat       │                         │
│          household)   │             │                         │
│                       │/resident/{id}│                         │
│                       │ or /member/ │                         │
│                       └─────────────┘                         │
│                              │                                   │
│                              │ Own independent identity          │
│                              ▼                                   │
│                       ┌─────────────┐                           │
│                       │ Can leave   │                           │
│                       │ household   │                           │
│                       └─────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

### Upgrade Criteria

- **Minimum tenure**: 1 year as Address Alias
- **Approval**: HOA Administrator review
- **Cost**: Premium Seat rate (1.5x Standard Seat)
- **Benefits**:
  - Independent login
  - Own profile page (`/resident/{id}`)
  - Can maintain or detach from household

---

## Profile Widgets by Route

### `/unit/{id}` (Member - Standard Seat)

- HomeImage banner
- Member avatar + occupant profile avatar stack
- Bookshelf widget (collective)
- Published content (collective)
- Groups widget (collective)
- Occupant management panel
- Contact info

### `/unit/{id}/member/{aliasId}` (Occupant - Profile)

- Avatar + display name (no homeImage)
- Groups (joined as profile)
- Content (published as profile)
- Back to household link

### `/resident/{id}` (Premium - Resident)

- HomeImage banner
- Personal avatar
- Bookshelf widget
- Published content
- Groups widget
- Contact info

### `/member/{id}` (Premium - Non-Resident Member)

- Personal avatar + property homeImage (owner)
- Published content
- Groups widget
- HOA role display (board/committee)

---

## Seat Comparison Matrix

| Feature             | Standard Seat       | Address Alias               | Premium Seat                       |
| ------------------- | ------------------- | --------------------------- | ---------------------------------- |
| Route               | `/unit/{id}`        | `/unit/{id}/member/{alias}` | `/resident/{id}` or `/member/{id}` |
| Required            | Yes (per household) | No                          | No (optional)                      |
| Platform Address    | `unitNNN@domain`    | `name.unitNNN@domain`       | `name@domain`                      |
| Max per Household   | 1                   | 5                           | Unlimited                          |
| Has HomeImage       | ✅ Yes              | ❌ No                       | ✅ Yes (resident) / ❌ No          |
| Independent Login   | Yes                 | ❌ No                       | Yes                                |
| Travels with Person | ❌ No               | N/A                         | ✅ Yes                             |
| Can Have Profiles   | ✅ Yes              | ❌ No                       | ❌ No                              |
| Price               | Included            | Included                    | 1.5x Standard                      |

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
  ├── StandardSeat?      (1:1) - Member household login
  ├── PremiumSeat?        (1:1) - Personal login (resident or member)
  └── AddressProfiles[]    (1:n) - up to 5 per StandardSeat (flat, no nesting)

StandardSeat (Member - Property Owner)
  ├── householdId
  ├── platformAddress    (unitNNN@domain)
  ├── memberId           (User FK - property owner)
  └── AddressProfiles[]   (adult occupant, minor child, family member - all flat)

PremiumSeat
  ├── userId
  ├── platformAddress    (name@domain)
  └── isComplimentary    (boolean)

AddressProfile (Occupant/Family/Minor - All same type)
  ├── standardSeatId
  ├── profile              (name.unitNNN)
  ├── displayName
  ├── avatar
  ├── isPublic
  └── occupantSince        (Date - for upgrade eligibility tracking)
```

User
├── StandardSeat? (1:1) - Member household login
├── PremiumSeat? (1:1) - Personal login (resident or member)
└── AddressProfiles[] (1:n) - up to 5 per StandardSeat

StandardSeat (Member)
├── householdId
├── platformAddress (unitNNN@domain)
├── memberId (User FK - property owner)
└── AddressProfiles[] (occupants, family)

PremiumSeat
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

1. **Backward Compatibility**: Existing `/resident/{id}` routes remain for current users
2. **Occupant Flow**: Occupants start as profiles, upgrade to Premium after 1 year
3. **Member Always Has Property**: All Standard Seats (Members) have homeImage
4. **Alias Isolation**: Profiles cannot access household admin functions
5. **Deprecation**: When household moves out, Standard Seat archived per Section 6.7
6. **Portability**: Premium Seat holders can export data during Portability Window

---

_Last Updated: 2026-03-30_
_Based on: SaaS License Agreement v4_
```
