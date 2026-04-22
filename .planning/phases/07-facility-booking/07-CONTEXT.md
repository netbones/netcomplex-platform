# Phase 07 Context

## Decisions Made

### Module Architecture

- **NetComplex Module**: Installable by any tenant
- **Feature Flag**: `FACILITY_BOOKING` module must be enabled by tenant
- **Configurable**: Each tenant defines their facilities (may be none = hidden)

### Facility Types (Default Set)

- **POOL** — Swimming pool
- **GYM** — Fitness center
- **COMMUNITY_CENTER** — Event space
- **TENNIS** — Tennis court
- **BBQ_AREA** — Braai/BBQ facilities

### External API Integration

- Tenants can optionally connect external facility providers:
  - San Marina Recreation Club
  - The Zone Gym
  - Any future facility API

### Booking Flow

1. Select facility from tenant-configured list
2. Choose date from calendar
3. Select time slot (availability check)
4. Add purpose (optional)
5. Confirm booking

### Implementation State

- Booking model + API exist in codebase
- Feature flag needed for module visibility
- Calendar UI + booking form needed
- External API integration hooks needed

## Requirements

1. Feature flag controls module visibility
2. Tenant configures their facilities
3. Calendar view shows availability
4. External API hooks for external facilities
