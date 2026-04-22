# Phase 06 Context

## Decisions Made

### Categories

- **PLUMBING** — Water leaks, pipe issues, drainage
- **ELECTRICAL** — Power outages, wiring problems, lighting
- **APPLIANCE** — HVAC, washer, dryer, refrigerator
- **STRUCTURAL** — Roof, walls, foundation, paint
- **OTHER** — Anything else

### Priority Levels

- **LOW** — Minor issues, no urgency
- **MEDIUM** — Needs attention within a week
- **HIGH** — Urgent, affects daily living
- **EMERGENCY** — Safety hazard, immediate response needed

### Status Workflow

- **SUBMITTED** → **IN_PROGRESS** → **COMPLETED**
- Can also be **CANCELLED** from any state

### Image Storage

- Use **Supabase Storage** for photo uploads
- Need to wire upload component to storage bucket

### Notifications

- **In-app**: Notifications for status changes (already wired)
- **Email**: MailerSend for transactional emails

### Implementation State

- API routes already exist (`/api/maintenance`)
- Database schema in Drizzle
- UI components exist (form, list, analytics)
- **Gaps**: Storage upload, email notifications

## Requirements

1. Wire image uploads to Supabase Storage
2. Add MailerSend for transaction emails
3. Verify admin queue functionality
