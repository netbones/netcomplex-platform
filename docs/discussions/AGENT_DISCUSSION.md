---
title: RESPONSE TO [COMMUNIQUE](../communiques/COMMUNIQUE-05.md)
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

# RESPONSE TO [COMMUNIQUE](../communiques/COMMUNIQUE-05.md)

Overall, I think your draft is asking the right questions, but it is treating three different concepts as if they are one architectural problem:

1. **Identity** (who is acting?)
2. **Capability** (what can they do?)
3. **Execution** (human vs software vs robot)

Those should be separated. If you separate them, almost every difficult design decision disappears.

---

# 1. I would reject Option A, B and C as written

The document frames the decision as:

- A — everything is a ServiceProvider
- B — ServiceProvider + providerKind
- C — separate MechanicalAgent model

I wouldn't choose any of them.

Instead I'd introduce a fourth architecture.

---

# Option D — Principals + Capabilities (recommended)

Your platform already has several "actors":

- residents
- providers
- owners
- delegates
- AI agents
- future robots

These are all **principals**.

A principal is simply:

> "something that can authenticate and perform work."

That could be:

```
User
Service Provider
Mechanical Agent
Future Robot
External Integration
```

Those are different identities.

Delegation shouldn't care.

It should simply say

```
Grantor
↓

Principal
↓

Permissions
↓

AgentToken
```

The authorization pipeline never needs to know whether that principal is human.

It only needs

```
Principal ID
Scopes
Status
```

That is exactly what your AgentToken already represents.

So don't split the authorization system.

Generalize it.

---

# 2. ServiceProvider and MechanicalAgent are NOT siblings

This is the biggest conceptual issue in the document.

It assumes:

```
Human Provider
Mechanical Agent
```

are equivalent.

I don't think they are.

A ServiceProvider exists because of commerce.

A MechanicalAgent exists because of automation.

Those are different business concepts.

Example

```
Plumber
```

offers services.

```
OpenAI Listing Assistant
```

doesn't.

It performs work.

Likewise

```
Cleaning Company
```

≠

```
Cleaning Robot
```

One sells services.

One executes tasks.

Those shouldn't live in the same model.

---

# 3. AgentAccess shouldn't reference providers at all

Today you have

```
Owner

↓

AgentAccess

↓

ServiceProvider
```

I would remove that coupling.

Instead

```
Owner

↓

AgentAccess

↓

Principal
```

Now Principal could resolve to

```
User

Provider

MechanicalAgent

Integration

Robot
```

AgentAccess becomes future-proof.

---

# 4. Prisma polymorphism isn't actually your biggest problem

The communique spends a lot of time discussing polymorphic FKs.

I'd avoid them completely.

Introduce a tiny abstraction.

Example

```
Principal

id

kind

displayName

status
```

Then

```
User
```

references

```
Principal
```

```
ServiceProvider
```

references

```
Principal
```

```
MechanicalAgent
```

references

```
Principal
```

Now

```
AgentAccess

principalId
```

is a normal FK.

No polymorphism.

No nullable FK.

No application enforcement hacks.

Everything joins through Principal.

---

# 5. Verification should become pluggable

The document asks

> What does verification mean for AI?

Answer:

Don't overload one boolean.

Instead

```
Verification

Principal

Verification Type

Status

Evidence
```

Human provider

```
Business registration

VAT

Insurance

Trade licence
```

Mechanical

```
API ownership

Model provider

Capability declaration

Security review

Rate limit certification
```

Robot

```
Maintenance certificate

Calibration

Insurance

Operator
```

All use the same verification engine.

Different policies.

---

# 6. Billing shouldn't know about humans either

Same principle.

Don't ask

```
Human billing

AI billing
```

Instead ask

```
What is billable?
```

Examples

Human provider

```
Monthly subscription
```

Mechanical

```
API calls

Tokens

Usage

Execution minutes
```

Robot

```
Inspection hours

Distance

Maintenance jobs
```

That's a billing strategy.

Not an identity.

---

# 7. AGENT should not be a user role

This is probably the strongest recommendation I have.

I would actually remove

```
AGENT
```

from the Role enum entirely.

Why?

Because

Agent

isn't a permission.

It's a context.

Example

Today

```
Provider

↓

accept delegation

↓

Agent
```

Tomorrow

```
Resident

↓

delegated HOA authority

↓

Agent
```

Or

```
Administrator

↓

delegated

↓

Agent
```

Or

```
AI
```

Or

```
Robot
```

Agent is what you're currently doing.

Not who you are.

So

```
Role

USER

ADMIN

PROVIDER

BOARD

...
```

Then

```
Active Delegation

↓

Agent Context
```

When a delegation exists

UI changes

Permissions change

Navigation changes

No role mutation required.

---

# 8. Provider vs Agent Mode

The document asks

Separate login?

or

Toggle?

Definitely a context switch.

Think like GitHub.

```
Personal Account

↓

Switch

↓

Organisation
```

Same login.

Different context.

For NetComplex

```
Personal

↓

Provider

↓

Delegated Properties

↓

Mechanical Agent
```

Those become workspaces.

Not accounts.

---

# 9. Gateway becomes a Workspace

Instead of

```
Agent Gateway
```

I'd gradually evolve it into

```
Workspaces
```

Examples

```
My Home

Provider Workspace

Delegated Properties

Automation

Administration
```

When entering

```
Delegated Properties
```

the user sees

```
Current delegations

Managed properties

Permissions

Audit

Messages
```

If entering

```
Automation
```

they see

```
API Keys

Capabilities

Usage

Logs

Models
```

Same shell.

Different workspace.

---

# 10. Robot support

The communique asks whether robots should influence the schema now.

I would say:

Don't build robot tables.

Build robot interfaces.

Meaning

Define today

```
Principal

Capability

Verification

Execution Log
```

Those concepts naturally accommodate future physical devices without requiring you to prematurely design robotics-specific persistence.

---

# 11. Immediate recommendations

For Phase 111, I would recommend the following order of work:

| Priority | Recommendation                                                                                                  | Rationale                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Complete the ES256, unblock, index, and permission-ceiling fixes                                                | These are isolated correctness issues and should ship immediately.                                                                     |
| **P1**   | Decouple `AgentAccess` from `ServiceProvider` by introducing a `Principal` abstraction                          | This removes the future polymorphic-FK problem before it becomes technical debt.                                                       |
| **P2**   | Treat **Agent** as an execution context rather than a persistent role                                           | Eliminates role inflation and avoids users switching accounts simply to act under a delegation.                                        |
| **P3**   | Create a dedicated `MechanicalAgent` entity linked through `Principal`, not through `ServiceProvider`           | Keeps automation infrastructure separate from marketplace commerce while sharing the delegation pipeline.                              |
| **P4**   | Replace the single `isVerified` concept with a verification framework based on verification policies            | Human businesses, AI services and future robotic systems can all satisfy different verification requirements without schema inflation. |
| **P5**   | Design the Agent Gateway as a reusable **workspace** that adapts to the active principal and delegation context | This scales naturally from human delegates today to automation operators and future execution environments.                            |

---

## Strategic Assessment

I believe the draft correctly identifies that **authorization is already unified** through `AgentToken` and `AgentAccess`; that is a strength and should remain untouched.

The architectural friction comes from trying to make **identity**, **commerce**, **delegation**, **verification**, and **automation** all live inside `ServiceProvider`. Those are separate bounded contexts. Introducing a lightweight `Principal` abstraction above them allows the existing delegation infrastructure to remain stable while each domain evolves independently.

In practical terms, this gives NetComplex a much cleaner long-term model:

```
Principal
    ├── User
    ├── ServiceProvider
    ├── MechanicalAgent
    ├── Integration
    └── Future Robot

Principal
    ↓
AgentAccess
    ↓
AgentToken
    ↓
Scoped Execution
```

That hierarchy aligns well with the platform's roadmap toward AI automation, cross-tenant services, external integrations, and eventual robotic execution, while avoiding the schema and authorization complexity that Options A–C would gradually introduce.

I think the current `/agent-gateway` is too infrastructure-focused. It exposes **delegations** and **tokens**, but users don't come to the gateway to manage tokens—they come to **do work**.

The page should answer one question immediately:

> **"What am I responsible for today?"**

Everything else should support that.

---

# DISCUSSION PART TWO

## Proposed Agent Gateway

```
+----------------------------------------------------------------------------------+
| Agent Workspace                                              🔔   Profile        |
+----------------------------------------------------------------------------------+

[ Context Switch ]
┌──────────────────────────────────────────────────────────────────────────────┐
│ Working As:                                           ▼                      │
│ • Personal Account                                                    │
│ • Soralia Property Management Ltd                                    │
│ • Delegated: 14 Palm Avenue                                           │
│ • Delegated: 22 Sunset Close                                          │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────┬───────────────────────────────────────────────┐
│ MY WORK                      │ TODAY                                         │
│                              │                                               │
│ Active Delegations      12    │ Maintenance Requests                  4      │
│ Managed Properties       8    │ New Messages                          6      │
│ Pending Invitations      2    │ Upcoming Bookings                     3      │
│ Expiring Tokens          1    │ Tasks Awaiting Action                 5      │
└──────────────────────────────┴───────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ Active Delegations                                                     View All│
├──────────────────────────────────────────────────────────────────────────────┤
│ 14 Palm Avenue                                              ACTIVE            │
│ Property Owner: John Smith                                                 │
│ Permissions: Maintenance, Messaging, Occupancy                             │
│ [Open Workspace] [Permissions]                                             │
│                                                                            │
│ 22 Sunset Close                                              ACTIVE         │
│ ...                                                                       │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────┬───────────────────────────────────────────────┐
│ Quick Actions                │ Recent Activity                              │
│                              │                                              │
│ + Accept Invitation          │ Owner updated delegation                     │
│ + Create Maintenance         │ Maintenance completed                        │
│ + Contact Owner              │ New inspection assigned                      │
│ + View Marketplace           │ Token regenerated                            │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

---

# The first thing on the page

Instead of showing delegations immediately, I would introduce a **Workspace Selector**.

Think GitHub organisation switching.

```
Working As

○ Personal

○ ABC Letting Agency

○ Delegated Property A

○ Delegated Property B
```

Everything beneath changes.

This scales forever.

Later it can include

```
Automation

AI Listing Assistant

Inspection Robot

Community Automation
```

without redesigning the page.

---

# Primary Dashboard Cards

Instead of

```
Delegations

Tokens
```

I'd surface operational information.

For example

| Card                | Purpose       |
| ------------------- | ------------- |
| Active Delegations  | Current work  |
| Managed Properties  | Portfolio     |
| Pending Invitations | New work      |
| Tasks Today         | Actionable    |
| Messages            | Communication |
| Maintenance         | Operations    |

This tells the user immediately whether they have work to do.

---

# Delegation Cards

Instead of the current technical card.

```
14 Palm Avenue

ACTIVE

Owner

Permissions

Block toggle
```

I'd make each card its own mini dashboard.

```
──────────────────────────

14 Palm Avenue

Owner
John Smith

Maintenance
2 Open

Bookings
1

Unread Messages
4

Occupancy
Fully Occupied

Permissions

Maintenance

Messaging

Bookings

──────────────

Open Workspace

View Audit

Manage Permissions
```

Much richer.

---

# Property Workspace

Clicking

```
Open Workspace
```

takes you to

```
/agent-gateway/property/14
```

Instead of another generic page.

```
Property Workspace

Overview

Maintenance

Occupants

Bookings

Messages

History

Documents
```

Essentially

a mini-dashboard

for that delegation.

---

# Sidebar

I'd simplify it.

Instead of quick links.

```
Navigation

Dashboard

My Delegations

Marketplace

Automation

Reports

Settings
```

Below that

```
Resources

Documentation

Support

Developer API
```

---

# Token Management

I actually would remove it from the landing page.

Human agents almost never care.

Instead

```
Settings

↓

Developer

↓

API Tokens
```

Only appears when appropriate.

---

# Mechanical Agents

When the workspace is

```
Automation
```

The page changes.

```
Automation Workspace

Capabilities

Listing Publisher

Maintenance Dispatcher

Lease Generator

Usage

13 241 calls today

Rate Limit

Healthy

Tokens

2 Active

Logs

View
```

Same shell.

Different widgets.

---

# Owner View

Owners also need a gateway.

Same page.

Different cards.

```
My Delegated Agents

John Smith

Maintenance Company

Listing AI

Pending Invitations

Create Delegation

Recent Activity

Audit
```

---

# Navigation Structure

```
Agent Workspace
│
├── Home
│
├── My Delegations
│
├── Managed Properties
│     ├── Property A
│     ├── Property B
│
├── Invitations
│
├── Marketplace
│
├── Automation
│
├── Reports
│
└── Settings
      ├── Profile
      ├── Notifications
      ├── API Tokens
      └── Audit
```

---

# Future AI Integration

Eventually the page could include an AI assistant panel.

```
────────────────────────────

Agent Assistant

Good morning.

You have

• 3 maintenance requests

• 2 unanswered owner messages

• 1 inspection overdue

Suggested Actions

Review Request

Contact Owner

Generate Report

────────────────────────────
```

This fits naturally with the AI infrastructure already being introduced into NetComplex.

---

# Design Principles

Rather than presenting the Agent Gateway as an administration page, I would position it as an **Agent Workspace** with four design goals:

- **Context-first:** The user always knows _who_ they are currently acting as through a workspace/context switcher.
- **Work-first:** Surface actionable tasks, delegated properties, messages, and maintenance before exposing technical administration.
- **Progressive disclosure:** Technical functions such as API tokens, audit logs, and automation settings are available, but tucked into dedicated sections instead of dominating the landing page.
- **Extensible by design:** The same workspace shell should support human property agents today, provider businesses tomorrow, and AI or robotic agents in the future without requiring a redesign. This aligns well with the Principal-based architecture proposed in your advisory document.

SEE: [AGENT USER STORIES](./AGENT_USER_STORIES.md)

# DISCUSSION THREE

This is an excellent response from your team. It doesn't simply agree with the proposal—it pressure-tests it. Most of the concerns are valid, and a few point to places where I would refine the architecture. My assessment is below.

## Overall

I would classify this as:

- **~85% architectural alignment**
- **~15% implementation refinements**

I would **not** change the long-term direction (`Principal`, Agent Context, Workspace model), but I would adjust how the workspace is modeled in the UI.

---

# 1. Principal abstraction

**Decision: Approve**

I wouldn't change anything here.

The communique correctly identifies that the biggest long-term benefit is removing identity assumptions from the authorization layer.

Once `Principal` exists, the platform naturally accommodates:

- Users
- Providers
- AI
- Integrations
- Robots

without redesigning AgentAccess.

I think this should become one of NetComplex's core architectural concepts.

---

# 2. Removing AGENT from Role

**Decision: Approve**

I agree with their analysis.

In fact, I think they've strengthened the original recommendation.

Instead of

```
Role

↓

AGENT
```

it becomes

```
Authenticated User

↓

Workspace

↓

Delegation

↓

Permissions
```

That is much cleaner.

The only recommendation I'd add is:

> Introduce a lightweight `WorkspaceContext` object in the frontend before removing `AGENT` from the role enum.

For example:

```ts
interface WorkspaceContext {
  principalId: string;
  principalKind: 'USER' | 'PROVIDER';
  delegationId?: string;
  propertyId?: string;
  permissions: Permission[];
}
```

Then every page consumes `WorkspaceContext`.

Not Role.

---

# 3. The Workspace Selector

This is the biggest place where I'd revise my earlier proposal.

The communique is correct.

A flat selector won't survive.

Instead of

```
Working As

Personal

Provider

Property A

Property B
```

I'd make it hierarchical.

Example

```
My Account
│
├── Personal
│
├── Provider
│     ├── Dashboard
│     ├── Marketplace
│     └── Delegated Properties
│            ├── Palm Ave
│            ├── Sunset Close
│            └── ...
│
└── Owner
      ├── My Properties
      ├── Delegated Agents
      └── Audit
```

Notice something important.

**Delegated Properties belong to Provider.**

Not beside it.

That's the relationship.

The Provider is operating under delegations.

---

# 4. "Working As"

They also correctly identified that this wording is slightly misleading.

I would rename it.

Instead of

> Working As

I'd use

> Current Workspace

or

> Active Workspace

because the user isn't becoming someone else.

They're changing operational context.

That aligns perfectly with the "Agent is context, not identity" philosophy.

---

# 5. Owner vs Agent

Completely agree.

This was probably the strongest criticism.

An owner shouldn't land on

```
My Delegated Agents
```

inside Agent Gateway.

Instead

Owner Dashboard

↓

Delegations

↓

Agent Workspace

should be different navigation paths.

The shell can still be shared.

But not the landing page.

---

# 6. URL strategy

I actually changed my mind after reading this.

The communique proposes

```
/properties/:id
```

with conditional UI.

I think that's the better design.

Instead of

```
/properties/123
```

and

```
/agent-gateway/property/123
```

have

```
/properties/123
```

Then render different sections according to `WorkspaceContext`.

Example:

Owner

```
Financials

Delegations

Compliance

Residents
```

Agent

```
Maintenance

Bookings

Messages

Tasks
```

Same property.

Different capabilities.

That avoids duplicate routing and duplicated page logic.

---

# 7. Mechanical Agent Workspace

100% agree.

I wouldn't build UI for data that doesn't exist.

Instead I'd create extension points.

```
Workspace Registry

Personal

Provider

Property

Owner

Automation (hidden)
```

Automation becomes enabled once Phase 113 lands.

---

# 8. Empty State

Excellent catch.

This absolutely needs design.

For someone with zero delegations the gateway shouldn't feel broken.

Instead I'd show:

---

## Welcome to Agent Workspace

You don't currently manage any delegated properties.

You can:

- Accept a delegation invitation
- Browse the Marketplace
- Learn how property delegation works

---

Once the first delegation exists

the dashboard transforms automatically.

---

# 9. Search

This was another very good observation.

If someone manages

```
200
```

properties

there's no way they'll use a dropdown.

I'd introduce:

```
Search

Palm...

Palm Avenue

Palm Estate

Palm Grove

...
```

plus

```
Recent

Favorites

Pinned

All
```

Very similar to VS Code's workspace switcher.

---

# 10. One addition I'd make

I think something important is still missing.

Every workspace should expose its scope.

For example

```
──────────────────────────

Current Workspace

Provider

Soralia Property Management

Managing

14 Properties

18 Delegations

127 Tasks

Permissions

Maintenance

Bookings

Messaging

Expires Never

──────────────────────────
```

Or

```
Property

Palm Avenue

Delegated by

John Smith

Expires

31 Dec

Permissions

Maintenance

Documents

Messaging

Occupants

──────────────────────────
```

The workspace itself becomes a first-class object.

Users always know:

- what they're operating on
- who delegated it
- what they're allowed to do
- when it expires

That dramatically reduces confusion in delegated environments.

---

# My responses to the three decision questions

| Question                                                  | Recommendation                                              | Reasoning                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Approve `Principal` abstraction as the M6+ direction?** | **Yes**                                                     | It cleanly separates identity from commerce and automation, eliminates future polymorphic foreign keys, and provides a stable foundation for AI agents, integrations, and robotics. The migration effort is justified by the long-term simplification it delivers.             |
| **Remove `AGENT` from the `Role` enum?**                  | **Yes**, but introduce a frontend `WorkspaceContext` first. | Agent behavior is derived from active delegations, not identity. Establishing a workspace abstraction before removing the role minimizes disruption and gives the UI a stable context model independent of authorization.                                                      |
| **Ship the full workspace redesign now?**                 | **No. Ship it incrementally.**                              | Build the shell first (workspace selector, work-first dashboard, context model), then evolve property workspaces and owner views. Defer automation workspaces until the `MechanicalAgent` domain exists. This reduces delivery risk while keeping the architecture consistent. |

## One final recommendation

I would add one more architectural milestone between your current **P1** and **P2**:

> **Introduce `WorkspaceContext` as a frontend abstraction before introducing the `Principal` database model.**

This gives your React/tRPC layer a stable contract for navigation, permissions, and UI state. When the `Principal` model is eventually introduced, most of the frontend will already be decoupled from roles and identity details, making the migration significantly less invasive. I suspect this abstraction will become just as foundational on the client side as `Principal` will be on the server side.
