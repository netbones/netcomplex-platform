# Phase 40 Context — Maintenance Ticketing Overhaul

## Decisions Made

### Status Workflow

```
SUBMITTED → ASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED
                                              ↘ CANCELLED
                                IN_PROGRESS → PENDING_PARTS → IN_PROGRESS (loop back)
```

**DB enum updated to:** `SUBMITTED | ASSIGNED | SCHEDULED | IN_PROGRESS | PENDING_PARTS | COMPLETED | CANCELLED`

### Assignment Model

- **In-house teams** — by trade (Plumbing, Electrical, HVAC, Landscaping, etc.)
- **Third-party service providers** — external companies with name, phone, email, trade
- A ticket can have both assigned simultaneously (team handling, provider consulting)
- **Reassignment flow:** team encounters scope issue → sets status + suggests provider via assign API → admin reviews → reassigns to provider → ticket history shows "Previously: [team] → [provider]"

### Category Management

- Admin manages categories **inline on the requests page** (modal/expandable section, not separate page)
- `MaintenanceCategory` model replaces hardcoded `categoryOptions` arrays
- Backward compatible: settings key `maintenance_categories` remains the source of truth

### Ticket Number Format

- Tenant-configurable via setting `ticket_number_format`
- Default format: `SRV-{YYYY}-{NNNN}` (e.g., SRV-2026-0001)
- Generated server-side on creation

### Activity Zone Integration

- **Admin activity** (`/api/admin/activity` — maintenance domain): Already wired, reads from `maintenanceRequests.updatedAt`. Update CASE statement to handle all 7 statuses.
- **User activity** (HomeLayer ActivityZone): Currently shows announcements only. Add a user-specific maintenance activity endpoint that returns status changes for the current user's requests. Surface in the ActivityZone card list.

### Schema Additions

1. Extend `RequestStatus` enum
2. Add `ticketNumber`, `preferredDate`, `preferredTime` to `MaintenanceRequest`
3. Add `assignedTeamId`, `assignedProviderId` foreign keys
4. **New model: `MaintenanceTeam`** — id, tenantId, name, trade/category, contactName, isActive
5. **New model: `ServiceProvider`** — id, tenantId, companyName, contactName, phone, email, trade, isActive
6. **New model: `MaintenanceCategory`** — id, tenantId, value, label, description, isActive
7. Migrate `RequestNote` and `RequestHistory` from ad-hoc Drizzle tables into Prisma schema with proper FK relations

### Seed Data (7 requests)

1. Lawn irrigation system malfunction (SUBMITTED, MEDIUM)
2. Burst pipe in unit 12B (EMERGENCY, IN_PROGRESS — assigned to Plumbing Team)
3. Tree felling request — dangerous branch (SUBMITTED, HIGH)
4. Network outage — fiber cut by contractor (IN_PROGRESS, HIGH — assigned to a provider)
5. Electrical problem from mains — flickering lights in block C (ASSIGNED, HIGH — assigned to Electrical Team)
6. Bin removal request — bulky waste pickup (CANCELLED)
7. Garage door stuck — ongoing issue, 3 months old (SUBMITTED, LOW)

## Requirements

1. Full 7-status lifecycle in DB and everywhere it's referenced
2. In-house team management (CRUD + assignment)
3. Service provider management (CRUD + assignment)
4. Admin-configurable categories with inline UI
5. Tenant-configurable ticket number format
6. User-facing activity zone shows maintenance updates
7. Admin activity zone handles all 7 statuses
8. Seed data for realistic testing
9. Fix orphan table issue (RequestNote, RequestHistory → Prisma)
10. Fix resident notes 403 bug
11. Fix duplicate priority param in widget
12. Persist preferredDate/preferredTime
