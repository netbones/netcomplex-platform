# Identity Model Migration Plan

## Overview

This document plots the migration from the legacy `/resident/[id]` model to the new identity model with Households, Profiles, and Premium Seats.

---

## Legacy Model (Current)

```
User (flat)
├── role: RESIDENT, BOARD, ADMIN
├── residentType: OWNER, RENTER
├── street, unit
├── homeImage
└── route: /resident/{userId}
```

**Routes**:

- `/resident/[id]` - User profile page
- `/dashboard` - User dashboard
- `/admin` - Admin pages

---

## Target Model

```
User (authentication)
├── StandardSeat[] - Property owner links
├── PremiumSeat? - Independent identity
└── Profile[] - Occupants they manage

Household
├── standardSeats: StandardSeat[]
├── profiles: Profile[]
└── homeImage

Route Mapping:
├── /unit/{id} - Household page (property owner)
├── /unit/{id}/member/{profileId} - Profile page (occupant)
├── /resident/{id} - Premium Seat (backward compat)
└── /member/{id} - Non-resident member (premium)
```

---

## Migration Phases

### Phase 1: Foundation (Current)

**Status**: ✅ Completed

- [x] Add new tables: Household, StandardSeat, Profile, PremiumSeat, AgentAccess
- [x] Add AGENT role to enum
- [x] Set up tRPC infrastructure
- [x] Create pages: `/unit/[id]`, `/unit/[id]/member/[profileId]`, `/member/[id]`

**Database**: Tables created, initial data migrated (2026-03-30)

---

### Phase 2: Data Migration

**Status**: ✅ Mostly Complete (2026-03-30)

- [x] Create Household records from existing OWNER users (3 created)
- [x] Create StandardSeat links for property owners (3 created)
- [x] Migrate homeImage from User to Household
- [x] Create PremiumSeat for BOARD members (1 created - Sarah Mitchell, complimentary)
- [ ] Create Profile records for existing RENTER users (0 created - no matching households)

**Known Gaps**:

- Renters: Michael Chen, Lisa Chen, Emma Williams - no matching Households found
- These renters are in properties (Silkypuff St 3, Conebrush Rd 8, Beechwood Rd 15) without registered owners

**Next Step**: Register property owners for those addresses, then rerun migration to create Profiles

**Clarification on Premium Seats**:

- Premium Seat holder need NOT be an HOA member - could be an ordinary resident
- 5 complimentary Premium Seats reserved for current Board members
- Board members are mostly residents (live in community)
- Premium Seat can be RESIDENT (lives here) or MEMBER (doesn't live here)

**Premium Seat Mapping**:

| User Type                             | Premium Seat Type | isComplimentary |
| ------------------------------------- | ----------------- | --------------- |
| Board member (lives here)             | RESIDENT          | true            |
| Board member (doesn't live here)      | MEMBER            | true            |
| Upgraded occupant (after 1 year)      | RESIDENT          | false           |
| Non-resident property owner           | MEMBER            | false           |
| Ordinary resident (voluntary upgrade) | RESIDENT          | false           |

**Data Mapping**:

| Legacy Field               | New Location                                                     |
| -------------------------- | ---------------------------------------------------------------- |
| User.residentType = OWNER  | Household + StandardSeat                                         |
| User.homeImage             | Household.homeImage                                              |
| User.residentType = RENTER | Profile (under owner's household)                                |
| User.role = BOARD          | PremiumSeat(seatType: based on residence, isComplimentary: true) |

**Script**: Create migration script to populate new tables from existing User data

---

### Phase 3: Route Integration

**Status**: ✅ Done (2026-03-30)

- [x] Update `/resident/[id]` to resolve via PremiumSeat → User
- [x] Add resolveUserId tRPC endpoint for backward compatibility
- [x] Updated page to handle: premiumSeat → profile → standardSeat → not found

**Route Resolution Order**:

1. PremiumSeat (RESIDENT or BOARD member with complimentary)
2. Profile (Occupant under household)
3. StandardSeat (Property owner → redirect to Household page)
4. Legacy User fallback (not found)

---

### Phase 4: Dashboard Updates

**Status**: Pending

- [ ] Add "My Households" section to `/dashboard`
- [ ] Add household management UI (`/unit/[id]/manage`)
- [ ] Add agent dashboard section (if user.role = AGENT)
- [ ] Deprecate legacy user management in `/admin/users`

---

### Phase 5: Deprecation

**Status**: Future

- Remove legacy fields from User model (street, unit, homeImage, residentType)
- Remove direct /resident routes (after redirect period)
- Archive inactive households

---

## Route Mapping Table

| Old Route            | New Route                                                               | Action                    |
| -------------------- | ----------------------------------------------------------------------- | ------------------------- |
| `/resident/{userId}` | `/resident/{premiumSeatId}` or `/unit/{householdId}/member/{profileId}` | Resolve dynamically       |
| —                    | `/unit/{householdId}`                                                   | NEW - Household page      |
| —                    | `/unit/{householdId}/member/{profileId}`                                | NEW - Profile page        |
| —                    | `/member/{premiumSeatId}`                                               | NEW - Non-resident member |

---

## API Changes

| Old API               | New tRPC                                                   | Status  |
| --------------------- | ---------------------------------------------------------- | ------- |
| GET `/api/users`      | `identity.listHouseholds`                                  | Replace |
| GET `/api/users/[id]` | `identity.getHousehold` + `identity.getPremiumSeat`        | Replace |
| POST `/api/users`     | `identity.createHousehold` + `identity.createStandardSeat` | Replace |

---

## Deprecation Timeline

1. **Phase 1-2**: Both models coexist, new routes work alongside legacy
2. **Phase 3**: Legacy routes resolve through new model
3. **Phase 4**: Legacy routes redirect to new routes
4. **Phase 5**: Remove legacy code (6+ months after full migration)

---

## Testing Strategy

1. **Unit Tests**: New tRPC procedures
2. **Integration**: Data migration script
3. **E2E**: User flows (owner adding occupant, agent managing property)
4. **Regression**: Legacy /resident routes still work

---

## Open Questions

1. **Renter Data**: How do we map existing RENTER users to households? (Need street+unit to find household)
2. **Multiple Properties**: Should user have multiple households? (Current model: yes)
3. **Migration Timing**: When to run migration - on first access or batch?

---

_Last Updated: 2026-03-30_
