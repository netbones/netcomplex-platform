---
title: Implementation Plan: Property & Household Migration
status: current
reviewed: 2026-07-28
tags: [plan, roadmap]
audience: developer
---

# Implementation Plan: Property & Household Migration

## 🏁 Objective

Migrate the existing `household` table (which conflates asset and occupancy) into a dual-table model: `Property` (Asset) and `Household` (Occupancy).

---

## 🛠️ Phase 1: Schema Updates (`prisma/schema.prisma`)

1.  **Introduce `Property` Model**:
    ```prisma
    model Property {
      id              String      @id @default(cuid())
      tenantId        String
      platformAddress String      @unique
      street          String
      unit            String
      ownerId         String?     // Optional initially for migration
      // Relationships
      households      Household[]
      // ... metadata fields moved from existing household
    }
    ```
2.  **Refactor `Household` Model**:
    - Rename existing `household` to `Household` (if not already).
    - Remove `street`, `unit`, `platformAddress`.
    - Add `propertyId` as a mandatory foreign key.
    - Add `occupancyType` (Enum: `OWNER_OCCUPIED`, `RENTAL`, `VACANT`).
3.  **Update Related Models**:
    - Update `Booking`, `MaintenanceRequest`, `PropertyListing` to link to `Property` (the asset) instead of the occupancy record.
    - Update `Profile` to link to `Household` (the residents).

---

## 🔄 Phase 2: Data Migration Script

Create a script to:

1.  **Extract Assets**: For every unique `street` + `unit` in the old `household` table, create a new `Property` record.
2.  **Link Occupancy**: Create a `Household` record for each old `household` entry, linking it to the newly created `Property`.
3.  **Backfill IDs**: Update all existing relations (Maintenance, Bookings) to point to the new `Property.id`.

---

## 🛡️ Phase 3: Logic & UI Updates

1.  **Tenant Resolution**: Ensure `platformAddress` lookups hit the `Property` table.
2.  **HOA Permissions**: Update permission checks to verify `User -> Property.ownerId` for voting/resolutions.
3.  **Resident Participation**: Update checks to verify `User -> Household -> Property` for community features.
4.  **Admin UI**: Split the "Household Management" screen into "Property Management" (Assets) and "Occupancy/Tenant Management".

---

## ⚠️ Risks & Mitigation

| Risk                           | Mitigation                                                                                                         |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Data Loss during Migration** | Perform a dry-run migration and backup the database before execution.                                              |
| **Broken Relationships**       | Use temporary nullable fields during migration to prevent foreign key violations.                                  |
| **URL Breakage**               | The `platformAddress` is unique and preserved in the `Property` table; rewrite middleware to use this new mapping. |

---

## 📝 Relation to Earlier Plan

This migration replaces the "Basic Tenant Cleanup" tasks in the `bd` issue and provides a more robust foundation for the multi-tenant architecture. It resolves the "Single-Tenant User" gotcha by allowing a User to be an `Owner` of multiple `Properties` across different `Tenants`.
