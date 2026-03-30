# Prisma Schema Changes - Identity Model Implementation

## Overview

This document outlines the schema changes needed to implement the Identity Model from `IDENTITY_MODEL.md`. The changes introduce support for:

- Households (Standard Seats)
- Profiles (Address Aliases) under households
- Premium Seats (independent identities)
- Platform address routing

## Current Schema vs Required

### Current (Flat User Model)

```prisma
model User {
  id           String
  email        String       // Login email
  name         String
  role         Role         // RESIDENT, BOARD, ADMIN
  residentType ResidentType // OWNER, RENTER, SUSPENDED
  street       String?      // Property street
  unit         String?      // Property unit
  // ... other fields
}
```

### Required (Identity Model)

```prisma
// User = Authentication entity (Better Auth)
model User {
  id           String
  email        String       // Login email (may differ from platform address)
  // ... Better Auth fields

  // Identity relationships
  standardSeats    StandardSeat[] // If they own property (co-owner support)
  premiumSeat      PremiumSeat?   // Their independent identity (if Premium)
  profiles         Profile[]      // Profiles they manage (if Standard Seat holder)

  // Legacy fields (for backward compatibility)
  residentType ResidentType?
  street       String?
  unit         String?
}
```

---

## New Models

### 1. Household (Standard Seat)

```prisma
model Household {
  id              String    @id @default(cuid())

  // Property reference
  street          String
  unit            String    // Unit number, e.g., "042"

  // Platform address (e.g., unit042@soralia.org)
  platformAddress String    @unique

  // Primary Member (owner) - the property owner who "owns" this household
  // For co-ownership, use the StandardSeats table to link multiple owners
  // NOTE: Deprecated - use StandardSeat instead. Kept for backward compatibility during migration.
  memberId        String?

  // HomeImage (property photo) - stored on household
  homeImage       String?

  // Status
  status          HouseholdStatus @default(ACTIVE)
  moveInDate      DateTime?
  moveOutDate     DateTime?

  // Relationships
  standardSeats   StandardSeat[]
  profiles        Profile[]
  premiumSeats    PremiumSeat[]   // For upgraded occupants linked back

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([street, unit]) // One household per property
  @@index([memberId]) // Deprecated - use StandardSeat for ownership
  @@map("household")
}

enum HouseholdStatus {
  ACTIVE
  ARCHIVED  // Previous owners, preserved for history
}
```

### 2. Standard Seat (Property Owner Identity)

```prisma
model StandardSeat {
  id              String    @id @default(cuid())

  // User (the property owner)
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Household (the property they own)
  householdId     String
  household       Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  // Role in household
  isPrimaryOwner  Boolean   @default(true)  // First owner, can manage household

  // Platform address (e.g., jack.unit042@soralia.org or jill.unit042@soralia.org)
  // For co-owners: both get separate addresses
  platformAddress String   @unique

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([userId, householdId]) // One seat per user per household
  @@index([userId])
  @@index([householdId])
  @@map("standardSeat")
}
```

> **Note**: In earlier draft, StandardSeat was merged with Household.
> Splitting out allows:
>
> - Multiple co-owners (multiple StandardSeats per Household)
> - Clear separation of authentication from property
> - Easier to query "my properties" vs "my households"

### 2. Profile (Address Alias)

```prisma
model Profile {
  id              String    @id @default(cuid())

  // Household relationship
  householdId     String
  household       Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  // Profile identity
  displayName     String
  profileAddress  String    @unique // e.g., john.unit042@soralia.org

  // User link (for upgrade to Premium - optional, null until upgrade)
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])

  // Profile details
  avatar          String?
  isPublic        Boolean   @default(true)
  showEmail       Boolean   @default(true)
  showPhone       Boolean   @default(true)

  // Tenure tracking (for upgrade eligibility)
  occupantSince   DateTime  @default(now()) // When they became occupant
  occupantType    OccupantType @default(OCCUPANT)

  status          ProfileStatus @default(ACTIVE)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([householdId, profileAddress])
  @@index([householdId])
  @@index([userId])
  @@map("profile")
}

enum OccupantType {
  OCCUPANT    // Adult renter/tenant
  FAMILY      // Non-owner family member
  MINOR       // Child (managed by member)
}

enum ProfileStatus {
  ACTIVE      // Currently living there
  UPGRADED    // Upgraded to Premium Seat
  REMOVED     // Moved out
  EVICTED     // Removed due to eviction
}
```

### 4. AgentAccess (Property Agent Authorization)

```prisma
model AgentAccess {
  id              String    @id @default(cuid())

  // Agent (user with AGENT role)
  agentId         String
  agent           User      @relation(fields: [agentId], references: [id])

  // Household being managed
  householdId     String
  household       Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  // Who granted access (the member/owner)
  grantedById     String
  grantedBy       User      @relation(fields: [grantedById], references: [id])

  // Access period
  startedAt       DateTime  @default(now())
  expiresAt       DateTime

  // Status
  isActive        Boolean   @default(true)

  // Reason/purpose
  reason          String?   // e.g., "tenant induction", "eviction", "property management"

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([agentId])
  @@index([householdId])
  @@index([expiresAt]) // For cleanup queries
  @@map("agentAccess")
}
```

> **Note**: AgentAccess uses soft-delete (isActive). When access expires or is revoked, set isActive=false rather than deleting, for audit trail.

### 3. PremiumSeat (Independent Identity)

```prisma
model PremiumSeat {
  id              String    @id @default(cuid())

  // User relationship (the person who owns this seat)
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])

  // Platform address (e.g., john@soralia.org)
  platformAddress String    @unique

  // Property reference (if property owner)
  // Can be null if they don't own property in the community
  householdId     String?
  household       Household? @relation(fields: [householdId], references: [id])

  // Premium type
  seatType        PremiumSeatType

  // Complimentary (for board/committee)
  isComplimentary Boolean  @default(false)

  // For upgraded occupants - link back to original household
  linkedFromProfileId String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([householdId])
  @@map("premiumSeat")
}

enum PremiumSeatType {
  RESIDENT   // Lives in community (owner-occupier or upgraded occupant)
  MEMBER     // HOA member, doesn't live here (board, committee)
}
```

---

## Relationships Diagram

```
User (Authentication - Better Auth)
│
├── [Standard Seat] ────► Household (Standard Seat)
│     │                       │
│     │                       ├── platformAddress: unit042@soralia.org
│     │                       ├── homeImage: (property photo)
│     │                       ├── memberId: (property owner User)
│     │                       └── profiles: Profile[]
│     │                            │
│     │                            ├── Profile 1: john.unit042@soralia.org
│     │                            └── Profile 2: mary.unit042@soralia.org
│     │
└── [Premium Seat] ────► PremiumSeat
      │                     │
      │                     ├── platformAddress: john@soralia.org
      │                     ├── seatType: RESIDENT | MEMBER
      │                     └── linkedFromProfileId: (optional, if upgraded from occupant)
      │
      └── [Profile] (if Standard Seat holder manages profiles)
           └── Profile[]
                │
                └── can upgrade to PremiumSeat after 1 year
```

---

## Migration Path

### Phase 1: Add New Models

```prisma
// 1. Add Household model
// 2. Add Profile model
// 3. Add PremiumSeat model
// 4. Add relationships to User
```

### Phase 2: Data Migration

```sql
-- Convert existing Users with residentType=OWNER to Households
INSERT INTO Household (id, street, unit, platformAddress, memberId, homeImage, status)
SELECT
  gen_random_uuid(),
  street,
  unit,
  CONCAT('unit', unit, '@soralia.org'),
  id,
  homeImage,
  'ACTIVE'
FROM "user"
WHERE "residentType" = 'OWNER';

-- Convert existing Users with residentType=RENTER to Profiles (if owner exists)
-- This requires finding the household by street+unit
```

### Phase 3: Route Updates

- Add `/unit/[id]` route → Household page
- Add `/unit/[id]/member/[profileId]` route → Profile page
- Keep `/resident/[id]` for backward compatibility
- Add `/member/[id]` for non-resident members

---

## Backward Compatibility

### Legacy User Fields (Deprecate Over Time)

```prisma
model User {
  // Keep these for migration period:
  residentType ResidentType? // Map: OWNER → has Household, RENTER → has Profile
  street       String?       // Move to Household
  unit         String?       // Move to Household
  homeImage    String?       // Move to Household

  // Remove after full migration:
  // - The flat role/permissions model
}
```

### Route Compatibility

| Old Route        | New Route                       | Action                                |
| ---------------- | ------------------------------- | ------------------------------------- |
| `/resident/[id]` | `/resident/[id]`                | Keep, resolve via PremiumSeat or User |
| —                | `/unit/[id]`                    | New - Household page                  |
| —                | `/unit/[id]/member/[profileId]` | New - Profile page                    |
| —                | `/member/[id]`                  | New - Non-resident Member page        |

---

## API Changes Required

### New Endpoints

```typescript
// Household
GET / api / households; // List households (admin)
GET / api / households / [id]; // Get household with profiles
POST / api / households; // Create household (admin)
PATCH / api / households / [id]; // Update household

// Profiles
GET / api / profiles; // List profiles (admin)
GET / api / profiles / [id]; // Get profile
POST / api / households / [id] / profiles; // Add profile (landlord/SEEF)
PATCH / api / profiles / [id]; // Update profile
DELETE / api / profiles / [id]; // Remove profile
POST / api / profiles / [id] / setup; // Occupant completes setup
POST / api / profiles / [id] / upgrade; // Request Premium upgrade

// PremiumSeats
GET / api / premium - seats; // List (admin)
GET / api / premium - seats / [id]; // Get
POST / api / premium - seats; // Create (upgrade or admin)
```

---

## Notes

1. **Organization Multi-Tenancy**: The schema doesn't yet include `organizationId` for multi-HOA support. Add later when implementing multi-tenant.

2. **Better Auth Integration**: User model already has Better Auth relations (Session, Account, TwoFactor, Passkey). The new models extend, not replace, this.

3. **Profile Limit**: Enforce max 5 profiles per household in application logic.

4. **SEEF (Letting Agent)**: Not a separate model - SEEF would be a User with special permissions to manage households (future: Agent role).

5. **HomeImage**: Moved from User to Household since it's a property attribute, not person.

---

_Draft Version: 2026-03-30_
