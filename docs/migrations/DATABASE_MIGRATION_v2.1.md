# Database Schema Changes Documentation

## Overview

This document captures all database schema changes made during the renter relationship redesign, making landlord-tenant relationships explicit in the database structure.

## Date: 2026-04-02

## Version: Schema v2.1 - Explicit Renter Relationships

---

## 🔄 Schema Changes Summary

### 1. **Profile Model Enhancements**

**Added Fields:**

```prisma
// EXPLICIT RENTER RELATIONSHIP - Direct link to property owner
landlordId      String?   // Direct link to property owner (StandardSeat user)
landlord        User?     @relation("LandlordTenant", fields: [landlordId], references: [id])

// Renter classification (separate from occupantType)
residencyType   ResidencyType @default(FAMILY) // FAMILY, RENTER, OWNER_RESIDENT

// Image fields for occupant profiles
rentalImage     String?   // Property photo for rental display
occupantImage   String?   // Personal photo for occupant display
```

**Updated Indexes:**

```prisma
@@index([landlordId])  // For efficient landlord-tenant queries
```

### 2. **New Enum: ResidencyType**

```prisma
enum ResidencyType {
  FAMILY         // Family member living with owner
  RENTER         // Tenant renting the property
  OWNER_RESIDENT // Owner who lives in the property
}
```

### 3. **User Model Enhancement**

**Added Relationship:**

```prisma
// Landlord relationship (users who rent to tenants)
tenantProfiles   Profile[] @relation("LandlordTenant")
```

---

## 📊 Data Model Changes

### Before: Implicit Relationships

```
Household → StandardSeat (Owner) → Profiles (Occupants)
                                        ↓
Renters determined by: hasProfile && !hasOwnership && occupantType === 'OCCUPANT'
```

### After: Explicit Relationships

```
User (Landlord)
├── StandardSeat → Household (Owned Property)
├── tenantProfiles[] → Profile[] (RENTAL relationships)
│   ├── Anna Patel (residencyType: RENTER)
│   └── Marcus Johnson (residencyType: RENTER)
└── profiles[] → Profile[] (FAMILY relationships)
    ├── Emma Williams (residencyType: FAMILY)
    └── Alex Mitchell (residencyType: FAMILY)
```

---

## 🔍 Query Changes

### Renter Filtering

**Before (Complex Logic):**

```typescript
// Renters = Adult occupants with profiles but NO property ownership
where.AND = [
  { profiles: { some: { status: 'ACTIVE', occupantType: 'OCCUPANT' } } },
  { standardSeats: { none: {} } },
];
```

**After (Explicit):**

```typescript
// Renters = profiles with residencyType RENTER
where.profiles = { some: { status: 'ACTIVE', residencyType: 'RENTER' } };
```

### Landlord-Tenant Queries

**Find all tenants for a landlord:**

```typescript
const tenants = await prisma.profile.findMany({
  where: {
    landlordId: landlordId,
    residencyType: 'RENTER',
    status: 'ACTIVE',
  },
});
```

**Find landlord for a tenant:**

```typescript
const profile = await prisma.profile.findUnique({
  where: { id: profileId },
  include: { landlord: true },
});
```

---

## 📋 Migration Steps

### 1. **Backup Current Data**

- Export all Profile and User data
- Verify referential integrity

### 2. **Schema Migration**

```bash
npx prisma migrate dev --name explicit-renter-relationships
```

### 3. **Data Migration Script**

```typescript
// Update existing profiles with correct residencyType and landlordId
const profiles = await prisma.profile.findMany({
  include: { household: { include: { standardSeats: true } } },
});

for (const profile of profiles) {
  const landlord = profile.household.standardSeats.find(s => s.isPrimaryOwner)?.user;

  if (landlord) {
    // Determine residency type based on existing logic
    const residencyType =
      profile.occupantType === 'MINOR' ? 'FAMILY' : profile.userId ? 'RENTER' : 'FAMILY';

    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        landlordId: landlord.id,
        residencyType: residencyType,
      },
    });
  }
}
```

### 4. **Update API Responses**

- Include `landlord` and `residencyType` in profile responses
- Update frontend interfaces

### 5. **Testing**

- Verify renter filtering works correctly
- Test landlord-tenant relationship queries
- Ensure existing functionality still works

---

## 🎯 Business Logic Impact

### Agent UI Considerations

**For Property Agents:**

- Direct access to landlord contact info via `profile.landlord`
- Clear distinction between family members and actual tenants
- Easy identification of rental relationships

**For Property Owners:**

- Clear view of all tenants via `user.tenantProfiles`
- Separate family members from paying tenants
- Better property management insights

**For Renters:**

- Clear landlord relationship for communications
- Proper categorization in directory listings

---

## 🔐 Security & Access Control

### Row Level Security (Future)

```sql
-- Agents can only see profiles of properties they have access to
CREATE POLICY agent_profile_access ON Profile
FOR SELECT USING (
  household_id IN (
    SELECT household_id FROM AgentAccess
    WHERE agent_id = current_user_id()
  )
);
```

### Data Privacy

- Landlord contact info only visible to authorized agents
- Tenant personal info protected
- Residency type helps determine information sharing

---

## 📈 Performance Considerations

### New Indexes Added

- `Profile.landlordId` - Fast landlord-tenant queries
- Existing indexes maintained

### Query Optimization

- Direct foreign key relationship eliminates complex joins
- Residency type enum allows for efficient filtering
- Landlord relationship enables fast tenant lookups

---

## 🔄 Rollback Plan

If issues arise:

1. **Immediate Rollback:**

   ```bash
   npx prisma migrate reset --force
   ```

2. **Partial Rollback:**
   - Remove `landlordId` and `residencyType` fields
   - Revert to complex filtering logic

3. **Data Recovery:**
   - Restore from backup if migration fails
   - Re-run data migration with corrected logic

---

## 📋 Future Enhancements

### Potential Additions

1. **Lease Agreements Model** - Formal rental contracts
2. **Rent Payment Tracking** - Financial relationships
3. **Tenant Screening** - Background check integration
4. **Property Management Features** - Maintenance requests, communications

### Agent UI Features

1. **Tenant-Landlord Communication Hub**
2. **Property Portfolio Management**
3. **Lease Agreement Management**
4. **Tenant Screening Integration**

---

## ✅ Validation Checklist

- [ ] ⏳ Schema migration successful
- [ ] ⏳ Data migration completes without errors
- [ ] ⏳ Renter filtering works in directory
- [ ] ⏳ Landlord-tenant relationships accessible
- [ ] ⏳ API responses include new fields
- [ ] ⏳ Frontend interfaces updated
- [ ] ⏳ No breaking changes to existing functionality

---

_Document Version: 1.0_
_Schema Version: v2.1_
_Migration Date: 2026-04-02_</content>
<parameter name="filePath">DATABASE_MIGRATION_v2.1.md
