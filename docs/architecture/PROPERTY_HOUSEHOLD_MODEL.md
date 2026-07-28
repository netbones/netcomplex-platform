---
title: Property vs. Household Architectural Model
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Property vs. Household Architectural Model

## 🎯 Objective

To separate the **Physical Asset** (Property) from the **Social Occupancy** (Household) to accurately reflect the legal and social structure of a multi-tenant community.

---

## 🏗️ Core Entities

### 1. Property (The Permanent Asset)

The `Property` is the constant anchor of the community. It represents the physical unit and its associated legal/financial rights.

- **Primary Identifier**: `id` (UUID)
- **Identity**: `platformAddress` (e.g., `unit101@soralia.org`)
- **Key Fields**:
  - `tenantId`: The community it belongs to.
  - `street`, `unit`: Physical location.
  - `ownerId`: Reference to the `User` who is the HOA Member (Legal Owner).
- **Relationships**:
  - One `Property` has many `Households` (Historical record of occupancy).
  - One `Property` has one **Active** `Household` (Current occupancy).

### 2. Household (The Occupancy)

The `Household` represents a group of people living in a property during a specific time period.

- **Primary Identifier**: `id` (UUID)
- **Key Fields**:
  - `propertyId`: The asset being occupied.
  - `occupancyType`: `OWNER_OCCUPIED`, `RENTAL`, `VACANT`.
  - `moveInDate`, `moveOutDate`: Temporal boundaries of occupancy.
- **Relationships**:
  - Linked to multiple `Profiles` or `Users` who are the residents.

---

## 🏛️ Governance & Rights

### Track A: Legal (HOA Membership)

Rights tied to the **Property**.

- **Voting**: One `Property` = One Vote (via `Property.ownerId`).
- **Resolutions**: Only `Property` owners can participate in HOA legal decisions.
- **Financials**: Levies and taxes are billed to the `Property` owner.

### Track B: Social (Organization Participation)

Rights tied to the **Household**.

- **Community Chat**: All active `Household` occupants.
- **Facility Bookings**: Managed by the active `Household`.
- **Maintenance**: Requests are raised by the `Household` for the `Property` they occupy.

---

## 🔄 Lifecycle Example

1. **New Unit Created**: `Property` (Unit 101) is added. `platformAddress` is `unit101@soralia.org`.
2. **Owner Moves In**: `Household` (Record A) is created with `occupancyType: OWNER_OCCUPIED`.
3. **Owner Leases Unit**: `Household` (Record A) is closed with a `moveOutDate`. `Household` (Record B) is created with `occupancyType: RENTAL`.
4. **Tenant Moves Out**: `Household` (Record B) is closed. Unit remains `VACANT`.
5. **Static Identity**: Throughout all these changes, the `Property` remains Unit 101, and its unique identity (unit101@soralia.org) never changes.

---

## 🚀 Impact on Agents

Agents now have a dual role:

- **Asset Management**: Working with `Property` owners to list units for sale or lease.
- **Community Onboarding**: Facilitating the transition between `Households` when tenants move in/out.
