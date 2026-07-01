# ADVISORY-023.md

# Workspace Context Architecture

**Status:** Architectural Guidance
**Supersedes:** None
**Depends On:** ADVISORY-022 (Principal Architecture)
**Audience:** Engineering Agents, UI Architects, GSD Authors

---

# Purpose

This advisory refines the Agent Workspace architecture following the design review documented in COMMUNIQUE-06.

ADVISORY-022 established the long-term direction for identity, delegation and authorization.

This document defines how those concepts should be represented within the user interface.

It introduces the concept of a **Workspace Context**.

---

# Executive Summary

The previous advisory recommended evolving the Agent Gateway into a Workspace model.

Following review, one important refinement emerged:

> Users do not switch identity.

They switch **operational context**.

This distinction is fundamental.

The UI should never imply that a delegated property, provider business or owner relationship represents a different authenticated identity.

Instead, the authenticated identity remains constant while the active workspace changes.

---

# Core Principle

Authentication identifies **who** the user is.

Workspace Context identifies **where they are working.**

Authorization determines **what they may do.**

These are independent concerns.

```
Authenticated User

↓

Workspace Context

↓

Permissions

↓

Application Features
```

No feature should derive behaviour directly from the Role enum.

---

# Workspace Context

Future frontend work should introduce a shared WorkspaceContext abstraction.

Conceptually:

```ts
WorkspaceContext;

principal;

workspace;

delegation;

property;

permissions;
```

Every page within the application should consume WorkspaceContext rather than attempting to derive behaviour from roles or URLs.

This becomes the frontend equivalent of the backend Principal abstraction.

---

# Workspace Types

The application should evolve toward a finite set of workspace types.

Examples:

- Personal
- Provider
- Property
- Owner
- Administration
- Automation (future)

Each workspace exposes different navigation, widgets and actions while sharing the same authenticated session.

---

# Identity Never Changes

Users should never appear to become another person.

Avoid language such as:

> Working As

Preferred wording:

- Current Workspace
- Active Workspace
- Current Context

This reinforces that identity remains stable while operational focus changes.

---

# Hierarchical Navigation

Workspace selection should reflect the natural hierarchy of the platform.

Conceptually:

```
My Account

├── Personal

├── Provider
│      ├── Dashboard
│      ├── Marketplace
│      └── Delegated Properties
│              ├── Property A
│              ├── Property B
│              └── ...

└── Owner
       ├── My Properties
       ├── Delegations
       └── Audit
```

Delegated properties belong beneath the Provider workspace rather than existing beside it.

This scales naturally to hundreds of managed properties.

---

# Property Pages

Avoid creating duplicate property routes.

Preferred architecture:

```
/properties/[propertyId]
```

The page should adapt according to WorkspaceContext.

Examples:

Owner workspace:

- Financials
- Compliance
- Delegations
- Residents

Agent workspace:

- Maintenance
- Tasks
- Bookings
- Messaging

One property.

One route.

Multiple operational perspectives.

---

# Workspace Summary

Every workspace should clearly communicate its operational scope.

Examples include:

- current property
- delegating owner
- managed portfolio
- granted permissions
- delegation expiry

Users should never need to infer the scope of their authority.

---

# Owner and Agent Separation

Although owner and agent functionality may share layout components, they represent different workflows.

Owner work focuses on:

- granting authority
- reviewing activity
- auditing
- oversight

Agent work focuses on:

- executing delegated responsibilities
- completing tasks
- communicating
- maintaining properties

Landing pages should remain distinct.

---

# Workspace-Specific Actions

Actions should be contextual.

Avoid global action panels containing unrelated commands.

Examples:

Property Workspace

- Create Maintenance
- Message Owner
- Upload Document

Provider Workspace

- Marketplace
- Bookings
- Staff

Owner Workspace

- Create Delegation
- Review Audit
- Suspend Access

Every workspace should expose only actions relevant to that operational context.

---

# Search Before Navigation

Large portfolios require search-driven navigation.

Workspace selection should support:

- search
- favourites
- recent workspaces
- pinned workspaces

Dropdown-only navigation will not scale.

---

# Empty States

Zero-delegation users require onboarding.

Instead of an empty dashboard:

Display:

- explanation of delegated property management
- invitation acceptance
- marketplace discovery
- documentation

The dashboard should naturally evolve once delegations exist.

---

# Progressive Delivery

The workspace architecture should be introduced incrementally.

## Phase One

- WorkspaceContext abstraction
- Context-aware navigation
- Work-first dashboard
- Empty states

## Phase Two

- Property workspace
- Provider workspace
- Owner workspace

## Phase Three

- Automation workspace
- AI Assistant
- Workspace search
- Workspace favourites

---

# Mechanical Agents

Automation workspaces should remain hidden until the MechanicalAgent domain exists.

Avoid exposing placeholder dashboards with fabricated metrics.

Instead:

Register workspace types.

Enable them only when supporting infrastructure becomes available.

---

# Relationship to Principal

Principal defines the backend execution model.

WorkspaceContext defines the frontend execution model.

These concepts intentionally mirror one another.

```
Backend

Principal
↓

AgentAccess
↓

Permissions


Frontend

WorkspaceContext
↓

Navigation
↓

Capabilities
```

Together they form a consistent architecture across the entire platform.

---

# Design Principles

Future work should favour:

✓ Stable authenticated identity

✓ Explicit workspace context

✓ Context-aware navigation

✓ Shared property routes

✓ Search-driven workspace selection

✓ Progressive disclosure

✓ Workspace-specific actions

✓ Progressive feature rollout

Future work should avoid:

✗ Identity switching

✗ Role-driven UI

✗ Duplicate property pages

✗ Global action panels

✗ Placeholder automation dashboards

✗ Flat workspace lists that do not scale

---

# Long-Term Vision

The Agent Gateway should evolve into a universal Workspace Framework.

Whether a user is:

- managing their own home,
- operating a service business,
- acting under delegation,
- administering a community,
- or supervising future AI and robotic systems,

they should remain within a single, consistent workspace architecture.

Authentication remains constant.

Workspace changes.

Permissions adapt.

The user experience remains coherent regardless of how the NetComplex platform evolves.
