---
phase: 06-maintenance-requests
plan: 01
subsystem: maintenance
tags: [maintenance, photo-upload, email-notifications, supabase-storage, mailersend]
dependency_graph:
  requires: []
  provides:
    - MAINT-01: Photo uploads via Supabase Storage
    - MAINT-02: Email notifications via MailerSend
    - MAINT-03: Admin queue view
  affects:
    - src/features/maintenance/ui/MaintenanceForm.tsx
    - src/app/api/maintenance/route.ts
    - src/app/api/maintenance/[id]/notify/route.ts
tech_stack:
  added: [Supabase Storage, MailerSend API]
  patterns: [photo-upload, transactional-email]
key_files:
  created: []
  modified:
    - src/features/maintenance/ui/MaintenanceForm.tsx
    - src/app/api/maintenance/[id]/notify/route.ts
    - src/shared/api/schemas.ts
    - .env.example
decisions:
  - Used Supabase Storage over S3 for image uploads (simpler integration)
  - Used MailerSend HTTP API over SDK (fewer dependencies)
metrics:
  duration: 90 seconds
  tasks_completed: 3
  files_modified: 4
  commits: 2
---

# Phase 06 Plan 01: Maintenance Request System Summary

## Overview

Completed maintenance request system by adding photo uploads to Supabase Storage and transactional email notifications via MailerSend. The core model, API, and basic UI already existed — this plan addressed the gaps.

## Completed Tasks

### Task 1: Wired photo uploads to Supabase Storage

**Files modified:**

- `src/features/maintenance/ui/MaintenanceForm.tsx` — Added file input, upload to Supabase Storage, image previews
- `src/shared/api/schemas.ts` — Added `images` field to Zod schema
- `.env.example` — Added MailerSend env vars

**Implementation:**

- Added file input accepting up to 5 images (max 5MB each)
- Images upload to `maintenance-images` bucket on file selection
- Preview grid with remove buttons
- Updated schema with `images: z.array(z.string().url()).max(5)`
- Created Supabase storage bucket via migration

**Verification:** `grep -n "supabase.storage" src/features/maintenance/ui/MaintenanceForm.tsx` ✓

### Task 2: Added MailerSend for transactional emails

**Files modified:**

- `src/app/api/maintenance/[id]/notify/route.ts`

**Implementation:**

- Added `sendEmail()` function using MailerSend HTTP API
- HTML email templates with status-specific content
- Emails sent on status changes (SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- Graceful fallback if API key not configured

**Verification:** `grep -n "api.mailersend.com" src/app/api/maintenance/[id]/notify/route.ts` ✓

### Task 3: Verified admin queue functionality

**Status:** Already implemented

**Verification:**

- `hasPermission(authData.role, 'requests')` checked in all maintenance routes
- Admins see all requests via `canViewAll` flag
- API routes properly filter by role
- MaintenanceRequestsWidget shows urgent requests with admin link

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None encountered in this execution.

## Deferred Issues

None.

## Requirements Addressed

| Requirement                                  | Status           |
| -------------------------------------------- | ---------------- |
| MAINT-01: Photo uploads via Supabase Storage | ✓ Complete       |
| MAINT-02: Email notifications via MailerSend | ✓ Complete       |
| MAINT-03: Admin queue view                   | ✓ Already exists |

## Commits

- `b1406ff` feat(06-maintenance-01): add photo uploads to Supabase Storage
- `3e7f57f` feat(06-maintenance-01): add MailerSend email notifications
