---
created: 2026-04-04T09:51:19.580Z
title: Enhance maintenance ticketing admin features
area: docs
files:
  - src/app/admin/requests/page.tsx:1-175
  - src/app/api/maintenance/route.ts:1-164
  - src/app/api/maintenance/[id]/route.ts
  - docs/SPEC.md:164-189
  - docs/MAINTENANCE_TICKETING_SPEC.md
---

## Problem

The current `/admin/requests` page has basic functionality but lacks key admin features needed for proper maintenance ticketing management. Specifically:

1. No search functionality - can't search by resident name, address, or description
2. Limited filtering - only status filter, missing priority, date range, category
3. No detail view - can't see full request details, images, resident info
4. No assignment workflow - can't assign requests to board members
5. No history/audit trail - can't see who changed what and when
6. No internal notes - can't add private notes for admin communication
7. No analytics - no dashboard with metrics and charts
8. No scheduling - can't schedule repair dates
9. No cost tracking - can't track estimated/actual costs

The API response also appears to have broken household address data for residents.

## Solution

Implement Phase 1-4 from docs/MAINTENANCE_TICKETING_SPEC.md:

**Phase 1 (Core):** Fix address data in API, enhance list with search/filters, add detail drawer, implement status history

**Phase 2 (Assignment):** Add assignee field, scheduling fields, cost tracking

**Phase 3 (Notes):** Add internal notes, implement notification system

**Phase 4 (Analytics):** Create analytics dashboard, export functionality

Requires extending the MaintenanceRequest model with new fields, adding new API endpoints, and creating new UI components.
