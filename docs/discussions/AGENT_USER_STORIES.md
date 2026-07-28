---
title: Agent USER STORIES
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

## The Actor Landscape

The current model has one `AgentPermission` enum with five values treating all delegation as equivalent. But your platform has at least four structurally different delegation relationships:

**Owner → Professional Agent** (letting, sales, portfolio management)
The classic real estate scenario. Agent acts on behalf of owner for commercial purposes. High trust, time-bounded, formal contract exists.

**Landlord → Tenant** (maintenance requests, access to property data)
A resident renter needs to initiate maintenance but the obligation flows through the landlord. Currently your maintenance forms route to HOA only — this is the gap you're identifying.

**Owner → HOA** (levy collection, common area maintenance, governance)
Already partially modelled. HOA acts on behalf of all owners collectively. Different from bilateral delegation.

**Property → Inspector/Service Provider** (annual inspections, compliance audits, contractor access)
Time-boxed, purpose-specific, often legally mandated. The inspector doesn't need ongoing platform access, just a scoped window.

These four relationships have fundamentally different answers to: who initiates, who accepts, what data is visible, how long it lasts, and what actions are permitted.

---

## User Story Workshop

Let me work through the key scenarios and surface what scope/task primitives each one actually requires.

---

### Cluster 1: Property Inspection

**Story 1.1 — Annual Rental Inspection**

> As a **landlord**, I want to schedule an annual inspection of my leased property and grant the inspector time-bounded access so they can record findings against the property record, without giving them ongoing platform access or visibility into my tenant's personal data.

What this requires:

- Initiator: landlord (StandardSeat holder, property owner)
- Actor: inspector (could be a registered ServiceProvider or an external person invited via email)
- Scope: `VIEW_PROPERTY_DETAILS`, `RECORD_INSPECTION_FINDINGS`, `VIEW_MAINTENANCE_HISTORY`
- Notably excludes: resident contact details, financial records, any other property
- Duration: single event or 24-hour window
- Trigger: scheduled date, not ongoing
- Output: `InspectionReport` linked to property record

**Story 1.2 — Municipality Compliance Inspection**

> As a **property manager**, I want to grant a municipal inspector access to view the property's compliance certificates and maintenance history so they can complete their audit without me being present.

What this requires:

- Scope: `VIEW_COMPLIANCE_DOCUMENTS`, `VIEW_MAINTENANCE_HISTORY`
- Actor: external (not a platform user — needs guest credential or email-delivered access link)
- Duration: fixed window (e.g. 48 hours)
- No write access

**Story 1.3 — Tenant-Requested Move-Out Inspection**

> As a **tenant (renter)**, I want to request a move-out inspection be scheduled so the condition of the property is recorded before I vacate, protecting my deposit.

What this requires:

- Initiator: tenant/profile (not the owner)
- The tenant can _request_ but cannot _grant_ — only the owner/landlord can accept and grant the inspector access
- This exposes a **gap in the current model**: there is no mechanism for a non-owner occupant to initiate a delegation workflow. The current delegation flow is owner-initiated only.

---

### Cluster 2: Maintenance — The Critical Gap

**Story 2.1 — Tenant Raises Maintenance Request (Current State)**

> As a **tenant**, I submit a maintenance request via the platform. Currently it routes to the HOA. But for a privately leased property, the obligation is on the landlord, not the HOA.

This is the core routing problem. The maintenance form needs a routing decision:

- Is this a **common area** issue? → HOA
- Is this an **in-unit** issue in an owner-occupied property? → HOA (per existing model)
- Is this an **in-unit** issue in a rented property? → **Landlord**, not HOA

The platform currently has no concept of this routing distinction.

**Story 2.2 — Landlord Acknowledges and Delegates Maintenance**

> As a **landlord**, I receive a maintenance request from my tenant. I want to assign it to a contractor (ServiceProvider) and grant them scoped access to coordinate with the tenant directly, without exposing the tenant's full profile.

What this requires:

- Maintenance request now has a `routingType`: `HOA | LANDLORD | OWNER_SELF`
- Landlord receives notification of tenant-raised request
- Landlord can delegate to a `ServiceProvider` with scope: `VIEW_MAINTENANCE_REQUEST`, `COORDINATE_WITH_OCCUPANT`, `UPDATE_REQUEST_STATUS`
- The `COORDINATE_WITH_OCCUPANT` scope is the gated version of `CONTACT_OCCUPANTS` — but specifically for a single maintenance request, not blanket contact permission
- Duration: until request is `COMPLETED`

**Story 2.3 — HOA Contractor Access to Private Unit**

> As an **HOA admin**, I need to send a contractor to inspect a unit as part of building-wide maintenance (e.g. pipe inspection that requires access to each unit). I need to notify the resident and grant the contractor a time-bounded entry permission.

What this requires:

- Initiator: HOA (not the property owner)
- Actor: ServiceProvider/contractor
- Scope: `REQUEST_UNIT_ACCESS`, `VIEW_UNIT_ADDRESS`, `NOTIFY_OCCUPANT`
- Resident receives notification and can confirm/decline within a window
- This is a different trust model — HOA has authority over common areas and by-law inspections, but not unconditional access to private units

---

### Cluster 3: Letting Agent / Portfolio Management

**Story 3.1 — Landlord Appoints Letting Agent**

> As a **property investor with multiple rentals**, I want to appoint a letting agent to manage tenant placement, lease renewals, and rent collection for specific properties in my portfolio, without giving them access to my other properties or my personal financial records.

What this requires:

- Per-property delegation (already modelled correctly)
- Scopes: `MANAGE_TENANCY`, `VIEW_LEASE_DOCUMENTS`, `COLLECT_RENT_RECORDS`, `MARKET_PROPERTY`, `CONTACT_OCCUPANTS`
- The agent needs to be able to invite new tenants (create Invitation records)
- The agent should see the maintenance history but not be able to raise HOA requests on behalf of the owner
- Duration: lease period or fixed term

**Story 3.2 — Letting Agent Manages Tenant Turnover**

> As a **letting agent**, when a lease expires I need to coordinate move-out, arrange inspection, market the property, and process a new tenant application — all within the platform.

This is a multi-step workflow that crosses several existing features: Invitation (for new tenant onboarding), Maintenance (for move-out inspection), Property Listing (for marketing). The agent needs coordinated access across these without needing full owner-level access.

**Story 3.3 — Portfolio View for Multi-Property Investor**

> As a **premium seat holder** managing 8 properties, I want my appointed agent to have a consolidated view of all my properties' occupancy status, upcoming lease expirations, and maintenance backlogs without me having to grant per-property delegations eight times.

What this requires:

- Bundle delegation: one grant covering all properties in a PremiumSeat portfolio
- Currently not modelled — the `AgentAccess` table is per-property
- This is the "multi-property delegation bundle" that was deferred in the context doc

---

### Cluster 4: Governance & HOA

**Story 4.1 — Board Member Delegates Voting Proxy**

> As a **board member** who will be absent for a community vote, I want to delegate my voting proxy to another board member for a specific resolution.

Scope: `CAST_PROXY_VOTE` — doesn't exist in the current model at all, and isn't really an "agent" scenario. This is governance delegation, a different domain.

**Story 5.1 — AI Agent for Maintenance Triage**

> As an **HOA admin**, I want an AI agent to automatically triage incoming maintenance requests — categorising priority, suggesting assignment to the right team, and drafting the acknowledgement message — without being able to approve requests or contact residents directly.

What this requires:

- `callerType: 'ai'` (already in model)
- Scope: `READ_MAINTENANCE_QUEUE`, `CLASSIFY_REQUEST`, `DRAFT_RESPONSE` — none of these exist yet
- Explicitly excludes: `UPDATE_REQUEST_STATUS`, `CONTACT_OCCUPANTS`, `VIEW_FINANCIALS`
- This is the first story that justifies the `credentialType`/verifier abstraction from Plan 01

---

## What This Tells Us About the Scope Model

The current five-value `AgentPermission` enum is too coarse and wrong in places:

```
VIEW_LISTING        — only relevant to real estate agents
MANAGE_OCCUPANCY    — conflates tenant management + HOA management
VIEW_FINANCIALS     — too broad (levy records? rent? both?)
CONTACT_OCCUPANTS   — needs to be request-scoped, not blanket
MARKET_PROPERTY     — correct, but missing the listing workflow actions
```

What the stories actually need is a **two-axis model**:

**Axis 1: Domain** — which feature area does this touch?
`maintenance | tenancy | listing | inspection | communication | financials | governance`

**Axis 2: Action level** — what can they do within that domain?
`read | draft | coordinate | manage | approve`

This gives you a composable scope like `maintenance:read`, `maintenance:coordinate`, `tenancy:manage` — which maps cleanly to platform features, is self-documenting, and is extensible without enum changes.

---

## Concrete Recommendation

Before updating the plans, three decisions need to be made:

**Decision A — Maintenance routing:** Does maintenance request routing (HOA vs landlord) land in Phase 111 or is it a separate phase? It touches existing maintenance forms and the `MaintenanceRequest` model — significant scope.

**Decision B — Scope model:** Do you adopt the two-axis `domain:action` string model now (breaking change to `AgentPermission` enum), or keep the coarse enum for Phase 111 and migrate in Phase 112?

**Decision C — Tenant-initiated delegation:** Can a renter/Profile initiate a workflow that results in a delegation (e.g. requesting an inspection, triggering a maintenance request that routes to landlord)? This changes who can be an initiator in the delegation model.
