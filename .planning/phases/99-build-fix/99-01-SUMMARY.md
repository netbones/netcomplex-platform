---
phase: 99-build-fix
plan: '01'
subsystem: build-fix
tags:
  - import-paths
  - api-routes
  - drizzle
dependency_graph:
  requires: []
  provides:
    - Import path fixes for 6 API route files
  affects:
    - src/lib/db.ts
    - src/app/api/bookings/route.ts
    - src/app/api/maintenance/[id]/route.ts
    - src/app/api/maintenance/[id]/notify/route.ts
    - src/app/api/maintenance/[id]/notes/route.ts
    - src/app/api/maintenance/[id]/history/route.ts
    - src/app/api/admin/board-members/route.ts
tech_stack:
  added:
    - requestNotes (inline table definition)
    - requestHistories (inline table definition)
  patterns:
    - Centralized imports via @/lib/db
    - Inline Drizzle table definitions for non-generated tables
key_files:
  created: []
  modified:
    - src/lib/db.ts
    - src/app/api/bookings/route.ts
    - src/app/api/maintenance/[id]/route.ts
    - src/app/api/maintenance/[id]/notify/route.ts
    - src/app/api/maintenance/[id]/notes/route.ts
    - src/app/api/maintenance/[id]/history/route.ts
    - src/app/api/admin/board-members/route.ts
decisions:
  - Used inline table definitions for requestNotes and requestHistories instead of generating from schema (these tables were not in schema.prisma)
  - Consolidated all imports to use @/lib/db path alias
metrics:
  duration: ''
  completed: 2026-04-05
  tasks: 6
  files: 7
---

# Phase 99 Plan 01: Fix Broken Import Paths Summary

One-liner: Fixed broken imports from prisma/drizzle to @/lib/db in 6 API route files

## Overview

Fixed import path errors in API routes caused by the multi-tenant refactor. Changed relative imports from `prisma/drizzle/*` to centralized `@/lib/db` imports.

## Changes Made

### 1. src/lib/db.ts

- Added inline table definitions for `requestNotes` and `requestHistories` tables
- These tables were used by maintenance API routes but were not in the generated drizzle schema

### 2. API Route Files Fixed

- `src/app/api/bookings/route.ts` - Changed to `import { db, bookings, users } from '@/lib/db'`
- `src/app/api/maintenance/[id]/route.ts` - Changed to `import { db, maintenanceRequests, users, standardSeats, households, requestHistories } from '@/lib/db'`
- `src/app/api/maintenance/[id]/notify/route.ts` - Changed to `import { db, maintenanceRequests, users, requestHistories } from '@/lib/db'`
- `src/app/api/maintenance/[id]/notes/route.ts` - Changed to `import { db, requestNotes, users } from '@/lib/db'`
- `src/app/api/maintenance/[id]/history/route.ts` - Changed to `import { db, requestHistories, users } from '@/lib/db'`
- `src/app/api/admin/board-members/route.ts` - Changed to `import { db, users } from '@/lib/db'`

## Deviations from Plan

None - plan executed exactly as written.

## Remaining Issues

- Schema mismatch: maintenanceRequests table in generated drizzle schema lacks fields like `assignedTo`, `vendor`, `scheduledDate`, etc. that the API code expects. This would need schema update or code adjustment to resolve.

## Self-Check: PASSED

- All 6 files have imports fixed to use @/lib/db
- commit 9891c04 exists with correct message
