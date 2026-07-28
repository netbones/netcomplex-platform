---
title: 1. I would NOT gate Workspace by `premiumSeat`
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

I think this is an excellent report. It's moved beyond identifying implementation bugs and is now exposing architectural assumptions. Most of the findings are correct, but there are **three recommendations** that I would change because they risk coupling unrelated concerns.

## Overall Assessment

I would classify the report as:

- **Implementation quality:** 9.5/10
- **Architectural reasoning:** 9.7/10
- **Recommended changes I would adopt:** ~90%

The P0/P1 bug list is solid and should be treated as implementation work.

The remaining discussion is where I'd make a few adjustments.

---

# 1. I would NOT gate Workspace by `premiumSeat`

This is the biggest architectural point.

The report recommends making `premiumSeat` the single rollout gate for the Workspace system.

I would separate two different concerns:

- **Feature rollout**
- **Business entitlement**

Those are not the same thing.

Instead:

```
Workspace Available?

↓

Feature Flag

AND

Workspace Exists

↓

Yes
```

Premium may determine whether someone is entitled to **Provider Workspace**, but not whether the Workspace framework itself exists.

Otherwise you end up baking commercial decisions into infrastructure.

Much better:

```
WorkspaceRegistry

↓

availableWorkspaces(user)

↓

Personal

Provider

Owner

...
```

Whether a workspace is returned depends on business rules.

Whether the framework exists depends on feature rollout.

---

# 2. Provider should NOT become a PremiumSeat tier

The report proposes adding:

```
FOUNDATION

PREMIUM

PROVIDER

ADMIN
```

as seat tiers.

I would avoid that.

These are different classifications.

Premium describes:

> commercial entitlement

Provider describes:

> business capability

Admin describes:

> platform permission

Those belong in different dimensions.

Instead think of:

```
Seat

↓

Plan
```

```
Workspace

↓

Capabilities
```

```
Role

↓

Permissions
```

Three separate axes.

That avoids eventually creating combinations like

```
PREMIUM_PROVIDER_ENTERPRISE_ADMIN
```

---

# 3. Provider Resolver

I completely agree.

This is probably the strongest implementation recommendation.

Current

```
Provider

↓

not_implemented
```

Target

```
Provider

↓

AgentAccess

↓

Delegations

↓

Properties
```

Exactly right.

Provider isn't a different data source.

It's a different aggregation.

That should absolutely be implemented.

---

# 4. Provider legal distinction

Excellent recommendation.

I agree with creating a dedicated ADR.

However—

I wouldn't model it as

```
Agent

vs

Service Provider
```

inside `AgentAccess`.

I'd model

```
DelegationPurpose

PROPERTY_MANAGEMENT

MAINTENANCE

SECURITY

LEASING

FINANCIAL

INSPECTION
```

Those purposes naturally determine:

- permissions
- operator agreement requirements
- data categories
- RLS policy

without introducing another identity concept.

---

# 5. `SERVICE` access level

I would _not_ add a new `SERVICE` access level yet.

The report itself questions whether it's needed.

I agree with the cautious approach.

Access level should remain coarse:

```
VIEW

MANAGE

FULL
```

Specific authority should come from permissions.

Example

```
VIEW

+

maintenance.read

maintenance.update

property.documents.read
```

No tenant permissions granted.

That is much more extensible.

---

# 6. EmptyWorkspaceState

The report proposes provider-specific variants.

I like the direction, but I'd generalize it.

Instead of:

```
Agent Empty

Provider Empty

Owner Empty
```

Create:

```
EmptyWorkspaceRenderer

↓

Workspace Definition

↓

Content
```

Then every workspace supplies:

- title
- description
- actions
- illustration
- onboarding

No branching component.

---

# 7. Admin Workspace

I agree with the recommendation.

Don't invent an Admin workspace immediately.

Admin already has

```
/admin/*
```

The Workspace framework should complement that, not replace it.

If later you introduce "View Property As…" or "Inspect Provider Context", those can be built on WorkspaceContext without redesigning the admin application.

---

# 8. Feature Flag

100% agree.

The report identifies this as an architectural concern.

I'd actually make it mandatory.

Every major architectural migration should have:

- Registry enabled
- Selector enabled
- Workspace enabled
- Property pages enabled

independently switchable.

---

# 9. One thing I would add

The report doesn't mention versioning.

I think WorkspaceRegistry should be versioned.

Example

```
WorkspaceRegistry

version

↓

Definitions
```

Then future phases can safely introduce:

- Automation
- Community
- HOA
- Vendor

without breaking existing workspace contracts.

This becomes especially useful if plugins or tenant-specific modules register additional workspaces.

---

# Final Recommendations

I would approve the report with the following architectural amendments:

| Recommendation                                   | Decision       | Reason                                                                                                                                                            |
| ------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PremiumSeat as the global workspace gate         | **Revise**     | Use feature flags for rollout and workspace availability rules for entitlement. Avoid coupling infrastructure to commercial plans.                                |
| Add `PROVIDER` and `ADMIN` as seat tiers         | **Revise**     | Keep plans (commercial), roles (permissions), and workspace capabilities as separate dimensions rather than encoding them into one enum.                          |
| Provider resolver based on `AgentAccess.agentId` | **Approve**    | This is the correct aggregation model. Provider is a perspective over delegations, not a separate identity or data source.                                        |
| Create ADR-027 for provider legal distinctions   | **Approve**    | Capture POPIA responsibilities, operator agreements, delegation purposes, and RLS implications before implementing provider-specific workspace behavior.          |
| Add a `SERVICE` access level                     | **Defer**      | Existing coarse access levels combined with granular permissions appear sufficient. Revisit only if a genuine authorization gap emerges.                          |
| Provider-specific empty state                    | **Generalize** | Replace multiple specialized components with a registry-driven `EmptyWorkspaceRenderer` supplied by each workspace definition.                                    |
| Dedicated Admin workspace                        | **Defer**      | Retain the existing `/admin/*` experience and integrate WorkspaceContext later for inspection and impersonation scenarios rather than replacing admin navigation. |
| Feature flag for workspace rollout               | **Approve**    | Treat this as a release requirement so the migration can proceed incrementally and safely.                                                                        |

## Strategic conclusion

The most important refinement I'd communicate back to the team is this:

> **Do not let commercial entitlements become architectural primitives.**

The report correctly identifies premium owners, providers, and administrators as distinct rollout audiences. However, the long-term architecture will be cleaner if **plans**, **roles**, **workspace availability**, and **feature rollout** remain independent concerns. That separation will make the Workspace framework reusable across future tenant types, AI agents, integrations, and enterprise editions without requiring repeated schema or routing changes.
