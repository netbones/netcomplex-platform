# Decision B — Scope Model Redesign

(follows /docs/discussions/AGENT_USER_STORIES.md)

Since AgentPermission is schema-only with no callsites, we replace it cleanly. The two-axis domain:action string model is the right direction but needs a concrete taxonomy before Plan 01 can be updated.

Proposed canonical scopes, derived from the user stories:
maintenance:read — view maintenance requests on delegated property
maintenance:create — raise a maintenance request (tenant-initiated)
maintenance:coordinate — contact occupant re: a specific request
maintenance:manage — assign, update status, close requests
maintenance:approve — approve cost estimates (landlord approval gate)

tenancy:read — view current occupancy, lease dates
tenancy:manage — process applications, renewals, move-in/out
tenancy:invite — create Invitation records for new tenants

inspection:schedule — create inspection event linked to property
inspection:record — write InspectionReport findings
inspection:view — read inspection history

listing:read — view property listing details
listing:manage — edit listing, update status
listing:market — publish/unpublish, manage marketing materials

communication:contact_occupant — send platform messages to occupants
communication:notify_occupant — send system notifications (no reply channel)

financials:read — view rent records, levy history
financials:collect — record payments (letting agent use)

documents:read — view compliance certs, lease docs
documents:upload — add documents to property record

governance:proxy_vote — cast proxy vote (future, Phase 112+)

This replaces AgentPermission enum entirely. Stored as String[] on AgentAccess.permissions and AgentToken.scope. Validated at the API layer via a canonical registry — same pattern as your FeatureRegistry.

The Drizzle/Prisma side: AgentPermission enum is dropped, permissions becomes String[] (already valid in Postgres as text[]). Migration is straightforward since no application code reads these values yet.

# Decision C — Tenant-Initiated Workflows

Your resolution is the right one: renter can initiate only if the owner has explicitly granted that capability. This maps to a specific scope:
tenancy:allow_renter_initiation — owner grants this to their property's active renter

When a renter holds this grant (via a ResidentDelegation — a lighter model than AgentAccess), they can:

Raise maintenance requests that route to the landlord

Request an inspection

They cannot escalate themselves further

This introduces a second delegation model alongside AgentAccess. AgentAccess is owner→professional. ResidentDelegation is owner→occupant — simpler, no token issuance, just a permission flag checked at the maintenance/inspection routing layer.

## Plan Structure Implications

Before drafting, here's what changes across which plans:

### Plan 01 amendments:

Drop AgentPermission enum, replace permissions AgentPermission[] with permissions String[] on AgentAccess
Add AgentScopeRegistry constant (the canonical scope list above) to src/entities/agent/types.ts
Add originalPermissions String[] to AgentAccess (fixes the unblock escalation bug)
Add ResidentDelegation model (lightweight owner→renter permission grant)
Add @@index([delegationId]) and @@index([tenantId]) to DelegationAction
credentialMeta on AgentToken — confirm this is present (it is)

### Plan 02 amendments:

Delegation create endpoint validates scopes against AgentScopeRegistry (not a Zod enum — a registry check)
Store originalPermissions at creation time, same value as permissions

### Plan 04 amendments:

Block endpoint unblock path uses originalPermissions as ceiling, not unconditional restore
DelegationListItem drops propertyName

### Plan 05 (new):

Maintenance request routing: routingType field, landlord notification, renter-initiated path
ResidentDelegation API: owner grants renter initiation rights
Maintenance form wiring changes
