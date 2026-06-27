# 111-04-PLAN — Amendment A

**Amends:** `111-04-PLAN.md`
**Reason:** Unblock escalation bug fix using `originalPermissions`; `propertyName` type mismatch.
**Apply before execution of Plan 04.**

---

## Change 1 — Fix unblock escalation bug in block endpoint

In `src/app/api/delegations/[id]/block/route.ts`, replace the unblock path:

```typescript
// BEFORE — insecure: unconditionally re-adds CONTACT_OCCUPANTS
if (!currentPermissions.includes('CONTACT_OCCUPANTS')) {
  newPermissions = [...currentPermissions, 'CONTACT_OCCUPANTS'];
} else {
  newPermissions = currentPermissions;
}

// AFTER — uses originalPermissions as ceiling
// Fetch delegation with originalPermissions
const delegation = await db.agentAccess.findUnique({
  where: { id: params.id },
  select: {
    tenantId: true,
    propertyId: true,
    grantedById: true,
    permissions: true,
    originalPermissions: true, // ceiling
    status: true,
  },
});

// In the unblock branch:
if (!blocked) {
  // Restore communication:contact_occupant only if it was in the original grant
  const wasOriginallyGranted = delegation.originalPermissions.includes(
    'communication:contact_occupant'
  );
  if (wasOriginallyGranted && !currentPermissions.includes('communication:contact_occupant')) {
    newPermissions = [...currentPermissions, 'communication:contact_occupant'];
  } else {
    newPermissions = currentPermissions;
  }
}
```

Note: the scope being blocked/unblocked is now `'communication:contact_occupant'`
(new taxonomy) rather than the old `'CONTACT_OCCUPANTS'` enum value. Update the
block branch accordingly:

```typescript
if (blocked) {
  newPermissions = currentPermissions.filter(p => p !== 'communication:contact_occupant');
}
```

Update the `logDelegationAction` metadata to reflect the new scope name:

```typescript
metadata: {
  scope: 'communication:contact_occupant',
  previousPermissions: currentPermissions,
  newPermissions,
  ceiling: delegation.originalPermissions,
},
```

---

## Change 2 — Remove `propertyName` from `DelegationListItem`

In `src/entities/delegation/types.ts`:

```typescript
// REMOVE this field:
propertyName: string | null;

// The GET /api/delegations response no longer includes propertyName
// (Property has street + unit, not a name field)
// propertyAddress already covers display needs
```

---

## Change 3 — Update widget to use `propertyAddress` only

In `src/widgets/delegation/DelegationWidget.tsx`, in `PendingDelegationCard`:

```tsx
// BEFORE:
<p className="text-xs text-muted-foreground">
  {delegation.propertyName} — Awaiting acceptance
</p>

// AFTER:
<p className="text-xs text-muted-foreground">
  {delegation.propertyAddress ?? 'Unknown property'} — Awaiting acceptance
</p>
```

And in `ActiveDelegationCard` (or equivalent), replace any `delegation.propertyName`
reference with `delegation.propertyAddress`.

---

## Change 4 — Scope label display in widget

The `DelegationWidget` should display human-readable scope labels rather than
raw scope strings. Add a label map to `src/entities/delegation/types.ts`:

```typescript
export const SCOPE_LABELS: Record<string, string> = {
  'maintenance:read': 'View maintenance requests',
  'maintenance:create': 'Raise maintenance requests',
  'maintenance:coordinate': 'Coordinate with occupants on maintenance',
  'maintenance:manage': 'Manage maintenance (assign, close)',
  'maintenance:approve': 'Approve maintenance costs',
  'tenancy:read': 'View occupancy & lease dates',
  'tenancy:manage': 'Manage tenancy & renewals',
  'tenancy:invite': 'Invite new tenants',
  'inspection:schedule': 'Schedule inspections',
  'inspection:record': 'Record inspection findings',
  'inspection:view': 'View inspection history',
  'listing:read': 'View property listing',
  'listing:manage': 'Edit listing details',
  'listing:market': 'Publish & market property',
  'communication:contact_occupant': 'Message occupants directly',
  'communication:notify_occupant': 'Send notifications to occupants',
  'financials:read': 'View financial records',
  'financials:collect': 'Record payments',
  'documents:read': 'View property documents',
  'documents:upload': 'Upload property documents',
};
```

Use in the widget:

```tsx
{
  delegation.permissions.map(scope => (
    <span key={scope} className="text-xs rounded bg-muted px-1.5 py-0.5">
      {SCOPE_LABELS[scope] ?? scope}
    </span>
  ));
}
```

---

## Updated `must_haves.truths` replacements

Replace in Plan 04's `must_haves.truths`:

```yaml
# REMOVE:
- 'Block toggle narrows agent scopes server-side via PATCH /api/delegations/[id]/block'

# REPLACE WITH:
- 'Block removes communication:contact_occupant from permissions (new scope taxonomy)'
- 'Unblock restores communication:contact_occupant only if present in originalPermissions (ceiling)'
- 'DelegationListItem does not include propertyName — propertyAddress is the display field'
- 'Widget displays human-readable scope labels via SCOPE_LABELS map'
```

---

## Updated STRIDE entry

Replace T-111-19:

```
| T-111-19 | Elevation of Privilege | Block scope manipulation | mitigate |
Block removes communication:contact_occupant only. Unblock restores it only if
present in originalPermissions — the grant-time snapshot. Agent scope can never
exceed the original delegation ceiling regardless of block/unblock sequence.
```
