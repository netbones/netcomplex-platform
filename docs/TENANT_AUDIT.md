# Database Schema Audit - Multi-Tenant Readiness

**Date**: April 2026
**Purpose**: Assess current tables for multi-tenant (tenantId) requirements

---

## Current Schema Overview

### Authentication & Organization Tables

| Table           | Has tenantId? | Has organizationId? | Notes                                            |
| --------------- | ------------- | ------------------- | ------------------------------------------------ |
| `users`         | ❌ No         | ❌ No               | Links to organization via Better-Auth membership |
| `organizations` | N/A           | N/A                 | Better-Auth org table                            |
| `accounts`      | ❌ No         | ❌ No               | Better-Auth social accounts                      |
| `sessions`      | ❌ No         | ❌ No               | Better-Auth sessions                             |
| `verifications` | ❌ No         | ❌ No               | Better-Auth email verification                   |
| `passkeys`      | ❌ No         | ❌ No               | Better-Auth passkey auth                         |
| `twoFactors`    | ❌ No         | ❌ No               | Better-Auth 2FA                                  |

### Core Data Tables

| Table                 | Has tenantId? | Has organizationId? | Priority    | Notes                                                     |
| --------------------- | ------------- | ------------------- | ----------- | --------------------------------------------------------- |
| `households`          | ❌ No         | ✅ Yes              | 🔴 Critical | Already has `organizationId` (Better-Auth) - needs review |
| `users`               | ❌ No         | ❌ No               | 🔴 Critical | Members belong to orgs via Better-Auth                    |
| `maintenanceRequests` | ❌ No         | ❌ No               | 🔴 Critical | Links to users.userId                                     |
| `bookings`            | ❌ No         | ❌ No               | 🟠 High     | Links to users.userId                                     |
| `notifications`       | ❌ No         | ❌ No               | 🟠 High     | Links to users.userId                                     |
| `events`              | ❌ No         | ❌ No               | 🟠 High     | Has organizer field                                       |
| `conversations`       | ❌ No         | ❌ No               | 🟡 Medium   | Chat messages                                             |
| `messages`            | ❌ No         | ❌ No               | 🟡 Medium   | Links to conversations                                    |
| `surveys`             | ❌ No         | ❌ No               | 🟡 Medium   | Survey definitions                                        |
| `questions`           | ❌ No         | ❌ No               | 🟡 Medium   | Survey questions                                          |
| `responses`           | ❌ No         | ❌ No               | 🟡 Medium   | Survey responses                                          |
| `announcements`       | ❌ No         | ❌ No               | 🟡 Medium   | Community announcements                                   |
| `groups`              | ❌ No         | ❌ No               | 🟢 Low      | Community groups                                          |
| `userGroups`          | ❌ No         | ❌ No               | 🟢 Low      | Group memberships                                         |
| `albums`              | ❌ No         | ❌ No               | 🟢 Low      | User photo albums                                         |

### Seat/Tenant Tracking Tables

| Table           | Has tenantId? | Notes                     |
| --------------- | ------------- | ------------------------- |
| `standardSeats` | ❌ No         | Links users to households |
| `premiumSeats`  | ❌ No         | Links users to households |
| `soloSeats`     | ❌ No         | Standalone seats          |
| `members`       | ❌ No         | Member records            |

### Other Tables

| Table                       | Has tenantId? | Notes                |
| --------------------------- | ------------- | -------------------- |
| `contents`                  | ❌ No         | CMS content          |
| `invitations`               | ❌ No         | User invitations     |
| `communityServiceListings`  | ❌ No         | Service marketplace  |
| `communityServiceInquiries` | ❌ No         | Service inquiries    |
| `communityServiceReviews`   | ❌ No         | Service reviews      |
| `propertyListings`          | ❌ No         | Property listings    |
| `agentProfiles`             | ❌ No         | Agent profiles       |
| `agentAccesses`             | ❌ No         | Agent permissions    |
| `profiles`                  | ❌ No         | User profiles        |
| `settings`                  | ❌ No         | App settings         |
| `platformSuspensions`       | ❌ No         | User suspensions     |
| `externalSurveys`           | ❌ No         | External survey data |
| `requestNotes`              | ❌ No         | Maintenance notes    |

---

## Key Findings

### 1. Existing Organization Link

- `households` table **already has** `organizationId` column
- This is linked to Better-Auth's organization, not a tenant-specific field
- Need to verify if this is what we want or if we need separate tenantId

### 2. User → Organization Relationship

- Users are linked to organizations via Better-Auth's `organizationMember` table (implicit)
- Not through direct column - uses Better-Auth's membership system

### 3. Data Access Pattern

Currently, data is accessed via:

- `userId` → `users` → (indirectly) organization
- This means: to scope data by tenant, we need to either:
  a) Add explicit `tenantId` to each table
  b) Join through user → organization membership

---

## Recommended Approach

### Option A: Add tenantId to All Tables (Explicit)

```typescript
export const maintenanceRequests = pgTable('MaintenanceRequest', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(), // NEW
  userId: text('userId').notNull(),
  // ...
});
```

**Pros**: Clear isolation, fast queries, RLS possible
**Cons**: Must add column to ~25 tables, migration required

### Option B: Use Organization Membership (Implicit)

```typescript
// Get tenant from user's org membership
const userOrg = await getUserOrganization(userId);
// All queries filtered by org
const requests = await db
  .select()
  .from(maintenanceRequests)
  .where(eq(maintenanceRequests.userId, userId));
```

**Pros**: No schema changes needed, leverages Better-Auth
**Cons**: Requires careful query patterns, no RLS

### Option C: Hybrid

- Use Better-Auth organization as the tenant identifier
- Add optional `tenantId` for tables that need explicit isolation
- Use RLS for security

---

## Tables Requiring tenantId (Prioritized)

### Phase 1 - Critical (User Data)

| Table                 | Reason            | User Count |
| --------------------- | ----------------- | ---------- |
| `users`               | Core identity     | N/A        |
| `households`          | Property data     | ~180 homes |
| `maintenanceRequests` | Request isolation | Varies     |
| `notifications`       | User-specific     | Per user   |
| `bookings`            | User bookings     | Per user   |

### Phase 2 - High (Community Data)

| Table           | Reason           |
| --------------- | ---------------- |
| `events`        | Community events |
| `announcements` | Community posts  |
| `conversations` | Private messages |
| `messages`      | Chat history     |
| `surveys`       | Survey data      |

### Phase 3 - Medium (Content & Groups)

| Table        | Reason            |
| ------------ | ----------------- |
| `groups`     | Community groups  |
| `userGroups` | Group memberships |
| `albums`     | User content      |
| `contents`   | CMS content       |

### Phase 4 - Low (Marketplace)

| Table                       | Reason            |
| --------------------------- | ----------------- |
| `communityServiceListings`  | Service listings  |
| `communityServiceInquiries` | Service inquiries |
| `communityServiceReviews`   | Service reviews   |
| `propertyListings`          | Property listings |

---

## Existing Columns Analysis

### households.organizationId

```typescript
export const households = pgTable('household', {
  // ...
  organizationId: text('organizationId'), // Already exists!
  // ...
});
```

**Question**: Should we use this for tenant isolation, or create separate `tenantId`?

**Recommendation**: Use this existing `organizationId` as the tenant identifier. The Better-Auth organization IS the tenant.

---

## Action Items

1. ✅ Audit complete
2. ⬜ Decide: Use existing `organizationId` or add `tenantId`
3. ⬜ Add `organizationId` to remaining tables (if using Option A)
4. ⬜ Create query helpers for tenant-scoped queries
5. ⬜ Implement RLS policies

---

## Questions for Next Step

1. **Should we use the existing `households.organizationId` or create new `tenantId`?**
2. **Do we need RLS (Row Level Security) for additional isolation?**
3. **Should tenant = Better-Auth organization, or separate concept?**

_Audit completed: April 2026_
