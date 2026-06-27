# 111-01-PLAN — Amendment A

**Amends:** `111-01-PLAN.md`
**Reason:** Three structural changes arising from scope model redesign (Decision B), unblock
escalation fix, ResidentDelegation model (Decision C), and DelegationAction index gap.
**Apply before execution of Plan 01.**

---

## Change 1 — Replace `AgentPermission` enum with `String[]` + Scope Registry

### Schema change (prisma/schema.prisma)

**Remove** the existing `AgentPermission` enum entirely:

```prisma
// DELETE THIS BLOCK
enum AgentPermission {
  VIEW_LISTING
  EDIT_LISTING
  MANAGE_OCCUPANCY
  VIEW_FINANCIALS
  CONTACT_OCCUPANTS
  MARKET_PROPERTY
}
```

**Change** `AgentAccess.permissions` field type:

```prisma
// BEFORE
permissions  AgentPermission[]

// AFTER
permissions         String[]   // validated against AgentScopeRegistry at API layer
originalPermissions String[]   // snapshot of permissions at grant time; used as ceiling for unblock
```

`AgentToken.scope` is already `Json` — no change needed there.

### New constant: `src/entities/agent/scopes.ts`

Create this file as part of Task 2 (types):

```typescript
/**
 * Agent Scope Registry — Canonical Platform Delegation Scopes
 *
 * Two-axis model: domain:action
 * Validated at API layer on delegation create and accept.
 * Stored as String[] on AgentAccess.permissions and AgentToken.scope.
 *
 * Phase 111. Governance scope (proxy_vote) deferred to Phase 112+.
 */

export const AGENT_SCOPES = [
  // Maintenance
  'maintenance:read', // view requests on delegated property
  'maintenance:create', // raise a request (renter-initiated, requires ResidentDelegation)
  'maintenance:coordinate', // contact occupant re: a specific request
  'maintenance:manage', // assign, update status, close requests
  'maintenance:approve', // approve cost estimates (landlord approval gate)

  // Tenancy
  'tenancy:read', // view current occupancy, lease dates
  'tenancy:manage', // process applications, renewals, move-in/out
  'tenancy:invite', // create Invitation records for new tenants

  // Inspection
  'inspection:schedule', // create inspection event linked to property
  'inspection:record', // write InspectionReport findings
  'inspection:view', // read inspection history

  // Listing
  'listing:read', // view property listing details
  'listing:manage', // edit listing, update status
  'listing:market', // publish/unpublish, manage marketing materials

  // Communication
  'communication:contact_occupant', // send platform messages to occupants
  'communication:notify_occupant', // send system notifications (no reply channel)

  // Financials
  'financials:read', // view rent records, levy history
  'financials:collect', // record payments (letting agent use)

  // Documents
  'documents:read', // view compliance certs, lease docs
  'documents:upload', // add documents to property record
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

/**
 * Validate that all requested scopes are known platform scopes.
 * Returns unknown scopes (empty array = all valid).
 */
export function validateScopes(requested: string[]): string[] {
  return requested.filter(s => !AGENT_SCOPES.includes(s as AgentScope));
}

/**
 * Preset scope bundles for common delegation patterns.
 * Agents can request a named bundle; owners can review what it includes.
 */
export const SCOPE_BUNDLES = {
  'letting-agent': [
    'tenancy:read',
    'tenancy:manage',
    'tenancy:invite',
    'maintenance:read',
    'maintenance:coordinate',
    'listing:read',
    'listing:manage',
    'listing:market',
    'communication:contact_occupant',
    'financials:read',
  ],
  'maintenance-contractor': [
    'maintenance:read',
    'maintenance:coordinate',
    'inspection:view',
    'communication:notify_occupant',
  ],
  inspector: [
    'inspection:schedule',
    'inspection:record',
    'inspection:view',
    'documents:read',
    'maintenance:read',
  ],
  'property-manager': [
    'tenancy:read',
    'tenancy:manage',
    'maintenance:read',
    'maintenance:manage',
    'maintenance:approve',
    'inspection:view',
    'documents:read',
    'documents:upload',
    'financials:read',
  ],
} as const satisfies Record<string, AgentScope[]>;

export type ScopeBundle = keyof typeof SCOPE_BUNDLES;
```

### Update `src/entities/agent/types.ts`

Replace `AgentPermission` references with `AgentScope`:

```typescript
// BEFORE
import type { AgentPermission } from '@prisma/client';
permissions: AgentPermission[];

// AFTER
import type { AgentScope } from './scopes';
permissions: AgentScope[];  // or string[] where Prisma type is used directly
```

Update `AgentToken.scope` shape in `AgentTokenPayload`:

```typescript
export interface AgentTokenPayload {
  agentId: string;
  tokenId: string; // jti
  tenantId: string;
  callerType: 'human' | 'ai' | 'cron' | 'delegated';
  delegationId?: string;
  scope: AgentScope[]; // was AgentScope object — flatten to string array for JWT claim
  exp: number;
}
```

### Update `src/entities/agent/index.ts` barrel

Add export for scopes:

```typescript
export { AGENT_SCOPES, SCOPE_BUNDLES, validateScopes } from './scopes';
export type { AgentScope, ScopeBundle } from './scopes';
```

---

## Change 2 — Add `ResidentDelegation` model

Owner-to-renter lightweight permission grant. No token issuance — checked at routing layer.
Add to `prisma/schema.prisma` after `AgentAccess`:

```prisma
model ResidentDelegation {
  id         String   @id @default(cuid())
  tenantId   String
  propertyId String
  ownerId    String
  profileId  String   // Profile (renter) receiving the permission
  scopes     String[] // subset of AGENT_SCOPES renter may exercise
  grantedAt  DateTime @default(now())
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  owner    user     @relation("ResidentDelegation_owner", fields: [ownerId], references: [id])
  profile  Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([propertyId])
  @@index([profileId])
  @@index([ownerId])
}
```

Add back-relations to `user` and `Profile` models:

```prisma
// On model user — add:
residentDelegationsGranted ResidentDelegation[] @relation("ResidentDelegation_owner")

// On model Profile — add:
residentDelegations ResidentDelegation[]
```

Add back-relation to `Property`:

```prisma
// On model Property — add:
residentDelegations ResidentDelegation[]
```

---

## Change 3 — Add `DelegationAction` indexes

In the `DelegationAction` model (added in Task 1), include:

```prisma
model DelegationAction {
  id           String    @id @default(cuid())
  tenantId     String
  delegationId String
  action       String
  actorId      String
  metadata     Json?
  createdAt    DateTime  @default(now())

  @@index([delegationId])   // ADD — audit log queries filter by this
  @@index([tenantId])       // ADD — tenant isolation queries
}
```

---

## Change 4 — Add `AgentToken` back-relations to `user` model

Prisma requires both sides of every relation to be declared. Add to `model user`:

```prisma
// ADD these two lines to model user:
agentTokensAsAgent    AgentToken[] @relation("agentToken_agentIdTouser")
agentTokensIssued     AgentToken[] @relation("agentToken_issuedByIdTouser")
```

Without these, `prisma generate` will fail with an ambiguous relation error.

---

## Change 5 — Add `AgentToken` back-relation to `AgentAccess`

```prisma
// On model AgentAccess — add:
agentTokens AgentToken[]
```

---

## Updated `must_haves.truths` additions

Add to Plan 01's `must_haves.truths`:

```yaml
- 'AgentPermission enum is removed; permissions stored as String[] validated against AgentScopeRegistry'
- 'AgentAccess.originalPermissions captures grant-time permissions; never mutated after creation'
- 'ResidentDelegation model allows owners to grant renters scoped initiation rights'
- 'DelegationAction has @@index([delegationId]) and @@index([tenantId])'
- 'user model has back-relations agentTokensAsAgent and agentTokensIssued for AgentToken'
- 'AGENT_SCOPES and SCOPE_BUNDLES exported from src/entities/agent/scopes.ts'
```

---

## Updated verification steps

Add to Plan 01's `<verification>` block:

```
8. grep -n "AgentPermission" prisma/schema.prisma — returns 0 matches (enum removed)
9. grep -n "originalPermissions" prisma/schema.prisma — returns 1 match on AgentAccess
10. grep -n "ResidentDelegation" prisma/schema.prisma — returns model definition + 3 relations
11. grep -n "agentTokensAsAgent" prisma/schema.prisma — returns 1 match on user model
12. npx prisma validate — schema passes with no relation errors
```
