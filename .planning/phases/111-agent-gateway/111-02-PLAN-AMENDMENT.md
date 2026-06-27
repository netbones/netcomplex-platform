# 111-02-PLAN — Amendment A

**Amends:** `111-02-PLAN.md`
**Reason:** Scope validation now uses `AgentScopeRegistry` instead of Zod enum;
`originalPermissions` must be stored at creation time; `AgentPermission` Zod enum removed.
**Apply before execution of Plan 02.**

---

## Change 1 — Delegation create: scope validation via registry

In `src/app/api/properties/[id]/delegate/route.ts`, replace the Zod enum validation:

```typescript
// REMOVE this Zod enum:
scopes: z
  .array(
    z.enum([
      'VIEW_LISTING',
      'MANAGE_OCCUPANCY',
      'VIEW_FINANCIALS',
      'CONTACT_OCCUPANTS',
      'MARKET_PROPERTY',
    ])
  )
  .min(1)
  .max(5),

// REPLACE with registry validation:
scopes: z.array(z.string().min(1)).min(1).max(25),
// (validated against AGENT_SCOPES after parse — see below)
```

After `parsed.success`, add registry check before DB write:

```typescript
import { validateScopes } from '@entities/agent';

const { scopes, providerId, expiresAt, contractTerms } = parsed.data;

const unknownScopes = validateScopes(scopes);
if (unknownScopes.length > 0) {
  return apiError(
    'VALIDATION_ERROR',
    400,
    `Unknown scopes: ${unknownScopes.join(', ')}. See AGENT_SCOPES for valid values.`
  );
}
```

---

## Change 2 — Store `originalPermissions` at delegation creation

In the `db.agentAccess.create()` call, add `originalPermissions`:

```typescript
await db.agentAccess.create({
  data: {
    id: delegationId,
    tenantId,
    agentId: providerId,
    propertyId,
    grantedById: session.user.id,
    permissions: scopes,
    originalPermissions: scopes, // ADD — snapshot; never mutated
    status: 'PENDING',
    startedAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : defaultExpiry,
    contractTerms: contractTerms ?? null,
  },
});
```

---

## Change 3 — Remove `AgentPermission` import from accept route

In `src/app/api/delegations/[id]/accept/route.ts`, the `signAgentToken` call
passes delegation permissions as the token scope. Update to use the string array directly:

```typescript
// BEFORE (if using AgentPermission enum):
scope: delegation.permissions as AgentPermission[],

// AFTER:
scope: delegation.permissions,  // already String[] — no cast needed
```

---

## Change 4 — Scope bundle support (optional, agent's discretion)

If the delegation create body includes a `bundle` field, expand it server-side:

```typescript
import { SCOPE_BUNDLES, validateScopes } from '@entities/agent';

const delegateSchema = z
  .object({
    providerId: z.string().min(1),
    scopes: z.array(z.string().min(1)).min(1).max(25).optional(),
    bundle: z
      .enum(['letting-agent', 'maintenance-contractor', 'inspector', 'property-manager'])
      .optional(),
    expiresAt: z.string().datetime().optional(),
    contractTerms: z.string().max(2000).optional(),
  })
  .refine(d => d.scopes || d.bundle, {
    message: 'Either scopes or bundle must be provided',
  });

// After parse:
const effectiveScopes = parsed.data.bundle
  ? [...SCOPE_BUNDLES[parsed.data.bundle]]
  : parsed.data.scopes!;
```

---

## Updated `must_haves.truths` additions

Add to Plan 02's `must_haves.truths`:

```yaml
- 'Delegation create validates scopes against AGENT_SCOPES registry (not a Zod enum)'
- 'AgentAccess.originalPermissions is set at creation time with the same value as permissions'
- 'Unknown scopes return 400 VALIDATION_ERROR with the list of invalid scope strings'
- 'Bundle presets expand server-side to canonical scope arrays'
```

---

## Updated verification steps

Add to Plan 02's `<verification>` block:

```
9. POST /api/properties/<pid>/delegate with scopes: ["maintenance:read", "tenancy:manage"] → 201
10. POST /api/properties/<pid>/delegate with scopes: ["VIEW_LISTING"] → 400 (old enum value, now invalid)
11. POST /api/properties/<pid>/delegate with bundle: "letting-agent" → 201 with expanded scopes
12. DB check: agentAccess.originalPermissions === agentAccess.permissions at creation time
```
