# Maintenance Ticketing System - Admin Features Specification

## 1. Overview

### Purpose

This document specifies the admin functionality for the maintenance ticketing system in Soralia Village, enabling board members and administrators to manage, track, and respond to maintenance requests from residents.

### Reference Projects

- **TickFlo** (GitHub: faheemjabbar/ticket-management-system-frontend): Modern ticket management with Kanban, real-time updates, RBAC
- **Ticketfy** (GitHub: Pymmdrza/ticketfy): Support ticket system with dark theme, admin dashboard

---

## 2. Current State

### Existing Implementation

- **Data Model**: `MaintenanceRequest` (Prisma/Drizzle) - lines 164-189 in SPEC.md
- **API**: `/api/maintenance` (GET, POST), `/api/maintenance/[id]` (GET, PATCH, DELETE)
- **Admin UI**: `/admin/requests/page.tsx` - basic list with status filtering and dropdown update

### Current Limitations

1. No detailed request view (modal/drawer)
2. No assignment workflow (who's handling the request)
3. No status change history/audit trail
4. No internal notes/comments for admin communication
5. No email/notification system for status updates
6. No bulk actions
7. No search functionality
8. No analytics/reporting
9. Missing household address info in API response (broken)

---

## 3. Requirements

### 3.1 Data Model Extensions

```typescript
// Extended MaintenanceRequest model
model MaintenanceRequest {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    String
  priority    Priority      @default(MEDIUM)
  description String
  status      RequestStatus @default(SUBMITTED)
  images      String[]

  // New fields for admin features
  assignedTo    String?     // Admin/board user who owns this request
  assignee      User?       @relation("AssignedRequests", fields: [assignedTo], references: [id])
  resolution    String?     // Resolution notes when completed
  estimatedCost Decimal?    // Estimated repair cost
  actualCost    Decimal?    // Actual repair cost
  vendor        String?     // External vendor name
  scheduledDate DateTime?   // Scheduled repair date

  // History tracking
  history       RequestHistory[]

  // Internal notes (admin only)
  notes         RequestNote[]

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  completedAt   DateTime?   // When status changed to COMPLETED
}

model RequestHistory {
  id          String           @id @default(cuid())
  requestId   String
  request     MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  userId      String           // Who made the change
  user        User             @relation(fields: [userId], references: [id])
  field       String           // What field changed
  oldValue    String?
  newValue    String?
  comment     String?          // Optional comment
  createdAt   DateTime         @default(now())
}

model RequestNote {
  id          String           @id @default(cuid())
  requestId   String
  request     MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  userId      String           // Who wrote the note
  user        User             @relation(fields: [userId], references: [id])
  content     String
  isInternal  Boolean          @default(true) // Internal notes hidden from residents
  createdAt   DateTime         @default(now())
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  EMERGENCY
}

enum RequestStatus {
  SUBMITTED       // Initial state - submitted by resident
  ASSIGNED       // Assigned to board/vendor
  IN_PROGRESS    // Work started
  PENDING_PARTS  // Waiting for materials
  SCHEDULED      // Date scheduled
  COMPLETED      // Resolved
  CANCELLED      // Cancelled
}
```

### 3.2 API Endpoints

#### Existing (to be extended)

| Method | Endpoint                | Description                    |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/maintenance`      | List requests (admin sees all) |
| POST   | `/api/maintenance`      | Create new request             |
| GET    | `/api/maintenance/[id]` | Get single request details     |
| PATCH  | `/api/maintenance/[id]` | Update request (admin)         |
| DELETE | `/api/maintenance/[id]` | Delete request (admin)         |

#### New API Endpoints

| Method | Endpoint                         | Description                          |
| ------ | -------------------------------- | ------------------------------------ |
| GET    | `/api/maintenance/[id]/history`  | Get status change history            |
| POST   | `/api/maintenance/[id]/notes`    | Add internal note                    |
| GET    | `/api/maintenance/[id]/notes`    | Get notes (admin only sees internal) |
| PATCH  | `/api/maintenance/[id]/assign`   | Assign request to user               |
| POST   | `/api/maintenance/[id]/schedule` | Schedule repair date                 |
| GET    | `/api/maintenance/stats`         | Get analytics (admin)                |
| POST   | `/api/maintenance/[id]/notify`   | Send status notification email       |

### 3.3 User Interface Components

#### A. Admin Requests List (`/admin/requests`)

**Features:**

1. **Search Bar** - Search by category, description, address, resident name
2. **Filters**:
   - Status (all, SUBMITTED, ASSIGNED, IN_PROGRESS, PENDING_PARTS, SCHEDULED, COMPLETED, CANCELLED)
   - Priority (all, LOW, MEDIUM, HIGH, EMERGENCY)
   - Date range (created, scheduled, completed)
   - Assigned to (all, unassigned, specific board member)
   - Category (PLUMBING, ELECTRICAL, HVAC, APPLIANCE, STRUCTURAL, LANDSCAPING, OTHER)
3. **Sorting**: Date (newest/oldest), Priority (high/low), Status
4. **Bulk Actions**: Mark as in progress, assign, export selected
5. **Pagination**: 25 items per page with infinite scroll option
6. **Quick Actions**: Click row to open detail drawer

**List Item Display:**

- Priority badge (color-coded)
- Category icon
- Status badge
- Resident name + address (street/unit)
- Created date
- Assigned to (if any)
- Days since submission (highlight old requests)

#### B. Request Detail Drawer/Modal

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Request #MR-12345          [Edit] [Delete] [Close] │
├─────────────────────────────────────────────────────┤
│  STATUS: [Dropdown - change status]                 │
│  Priority: ● HIGH  • Change                        │
├─────────────────────────────────────────────────────┤
│  RESIDENT INFO                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Name: John Smith                             │   │
│  │ Email: john@example.com                     │   │
│  │ Phone: (555) 123-4567                       │   │
│  │ Address: 123 Palm Street, Unit 45            │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  REQUEST DETAILS                                    │
│  Category: PLUMBING                                 │
│  Description:                                       │
│  [Full description text with line breaks]           │
│                                                     │
│  Images: [thumbnails] [View All]                    │
│  Created: Jan 15, 2026 at 10:30 AM                │
│  Updated: Jan 16, 2026 at 2:15 PM                  │
├─────────────────────────────────────────────────────┤
│  ASSIGNEE & SCHEDULING                              │
│  Assigned To: [Dropdown - select board member]     │
│  Vendor: [Text input]                               │
│  Scheduled: [Date picker]                           │
│  Est. Cost: $[Input]  Actual: $[Input]             │
├─────────────────────────────────────────────────────┤
│  INTERNAL NOTES                                     │
│  + Add Note                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ Note content here...                    [User]│   │
│  │ 2 hours ago                           [Delete]│   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  HISTORY                                            │
│  ┌─────────────────────────────────────────────┐   │
│  │ Status: SUBMITTED → IN_PROGRESS        [User]│   │
│  │ Jan 16, 2026 at 2:15 PM              [Comment]│   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Priority: LOW → HIGH                  [User]│   │
│  │ Jan 16, 2026 at 9:00 AM                     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

#### C. Analytics Dashboard (`/admin/requests/analytics`)

**Metrics:**

1. **Overview Cards**
   - Total Open Requests
   - Avg. Resolution Time (days)
   - Requests This Month
   - Overdue Requests (past scheduled date)

2. **Charts**
   - Requests by Status (pie/donut chart)
   - Requests by Priority (bar chart)
   - Requests by Category (horizontal bar)
   - Trend over time (line chart - last 12 months)
   - Resolution time by category (bar chart)

3. **Lists**
   - Overdue Requests table
   - Most Active Requesters

### 3.4 Notification System

| Event                         | Recipient             | Channel        |
| ----------------------------- | --------------------- | -------------- |
| Request submitted             | Admin/Board           | In-app + Email |
| Request assigned              | Assigned board member | In-app + Email |
| Status changed to IN_PROGRESS | Resident              | In-app + Email |
| Status changed to COMPLETED   | Resident              | In-app + Email |
| Request scheduled             | Resident              | In-app + Email |

---

## 4. Acceptance Criteria

### 4.1 Request Management

- [ ] ⏳ Admin can view all requests in paginated list
- [ ] ⏳ Admin can filter by status, priority, category, date range
- [ ] ⏳ Admin can search by resident name, address, description
- [ ] ⏳ Admin can sort by date, priority, status
- [ ] ⏳ Admin can click request to open detail view
- [ ] ⏳ Admin can change status via dropdown with history recording
- [ ] ⏳ Admin can assign request to board member
- [ ] ⏳ Admin can add internal notes (not visible to resident)
- [ ] ⏳ Admin can view full history of changes
- [ ] ⏳ Admin can schedule repair date
- [ ] ⏳ Admin can track estimated/actual costs
- [ ] ⏳ Admin can export requests to CSV

### 4.2 Analytics

- [ ] ⏳ Dashboard shows total open requests count
- [ ] ⏳ Dashboard shows average resolution time
- [ ] ⏳ Dashboard shows requests by status chart
- [ ] ⏳ Dashboard shows requests by priority chart
- [ ] ⏳ Dashboard shows trend over time
- [ ] ⏳ Admin can view overdue requests list

### 4.3 Notifications

- [ ] ⏳ Resident receives email when status changes
- [ ] ⏳ Admin receives notification on new request
- [ ] ⏳ Status change history is preserved

### 4.4 API

- [ ] ⏳ All existing endpoints maintain backward compatibility
- [ ] ⏳ New endpoints follow REST conventions
- [ ] ⏳ Zod schemas validate all inputs
- [ ] ⏳ Proper error messages returned
- [ ] ⏳ ISR caching implemented appropriately

---

## 5. Implementation Priority

### Phase 1: Core Admin Features

1. Fix address data in API response
2. Enhance admin list with search + filters
3. Add detail drawer/modal
4. Implement status change with history

### Phase 2: Assignment & Scheduling

5. Add assignee field
6. Add scheduling fields
7. Add cost tracking

### Phase 3: Notes & Communication

8. Add internal notes
9. Implement notification system

### Phase 4: Analytics

10. Create analytics dashboard
11. Add export functionality

---

## 6. Technical Notes

### ISR Strategy

- Request list: `revalidate: 60` (cache for 1 minute)
- Analytics: `revalidate: 300` (cache for 5 minutes)
- On status change: `revalidatePath('/admin/requests')`

### Performance

- Use TanStack Query for client-side caching
- Implement virtual scrolling for large lists
- Lazy load detail drawer content

### Security

- All admin routes require `role: BOARD` or `role: ADMIN`
- Internal notes filtered at API level (non-admin can't see `isInternal: true`)
- Cost fields only visible to ADMIN role

---

## 7. File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── requests/
│   │   │   ├── page.tsx          # Request list (existing, enhance)
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx      # Analytics dashboard (new)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Single request view (new)
│   │   │   └── layout.tsx
│   ├── api/
│   │   └── maintenance/
│   │       ├── route.ts          # Extend with stats endpoint
│   │       └── [id]/
│   │           ├── route.ts
│   │           ├── history/
│   │           │   └── route.ts  # GET history
│   │           ├── notes/
│   │           │   └── route.ts  # CRUD notes
│   │           ├── assign/
│   │           │   └── route.ts  # PATCH assignee
│   │           └── schedule/
│   │               └── route.ts  # PATCH schedule
├── components/
│   ├── admin/
│   │   ├── requests/
│   │   │   ├── RequestList.tsx
│   │   │   ├── RequestFilter.tsx
│   │   │   ├── RequestCard.tsx
│   │   │   ├── RequestDetail.tsx
│   │   │   ├── RequestDetailDrawer.tsx
│   │   │   ├── RequestForm.tsx   # For residents
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── PriorityBadge.tsx
│   │   │   └── RequestHistory.tsx
│   │   └── analytics/
│   │       ├── StatsCards.tsx
│   │       ├── StatusChart.tsx
│   │       ├── PriorityChart.tsx
│   │       └── TrendChart.tsx
├── lib/
│   ├── schemas/
│   │   └── maintenance.ts         # Extend schemas
│   ├── actions/
│   │   └── maintenance.ts        # Server actions
│   └── notifications/
│       └── email.ts              # Email templates
```

---

## 8. Dependencies

No new runtime dependencies required. Uses existing:

- TanStack Query for data fetching
- React Hook Form + Zod for validation
- Recharts for analytics charts (already in project)
- Leaflet for any map features

---

_Document Version: 1.0_
_Created: April 2026_
_Reference: SPEC.md, PRD.md, /admin/requests implementation_
