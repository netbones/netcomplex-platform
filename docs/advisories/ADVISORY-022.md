# ADVISORY-22.md

# Agent Identity & Delegation Architecture Advisory

**Status:** Architectural Guidance
**Audience:** Engineering Agents, Architecture Reviewers, GSD Phase Authors
**Applies To:** Phase 111+, Agent Gateway, Provider Platform, AI Infrastructure, dWallet, Marketplace
author:

---

# Purpose

This advisory establishes the long-term architectural direction for delegated actors within NetComplex.

It does **not** change the existing Phase 111 implementation.

Instead, it identifies architectural boundaries that future work should preserve to avoid unnecessary technical debt.

---

# Executive Summary

The current Agent Gateway implementation successfully unifies authorization through:

- AgentAccess
- AgentToken
- Scoped permissions
- DelegationAction audit history

This architecture is considered sound and should remain the foundation of delegated execution.

Future work **should not** split authorization based on whether the actor is human or automated.

Instead, future evolution should separate:

- Identity
- Business capability
- Execution model

These are different architectural concerns.

---

# Core Principle

The platform should authorize **principals**, not implementations.

The authorization layer should never care whether work is performed by:

- a resident
- a service provider
- an AI agent
- an integration
- a future robotic system

Authorization should only evaluate:

- authenticated principal
- granted scopes
- delegation status

Everything else belongs elsewhere.

---

# Identity Hierarchy

Future work should evolve toward the following conceptual model.

```
Principal
├── User
├── ServiceProvider
├── MechanicalAgent
├── ExternalIntegration
└── FutureRobot
```

A Principal represents anything capable of authenticating and acting on behalf of another party.

This abstraction exists conceptually even if it is not immediately implemented in the database.

---

# Delegation Model

Delegation should target a Principal rather than a ServiceProvider.

Preferred conceptual flow:

```
Owner
    │
    ▼
AgentAccess
    │
    ▼
Principal
    │
    ▼
AgentToken
    │
    ▼
Scoped Execution
```

The delegation system should remain completely independent of whether the Principal represents a human or software.

---

# Service Providers

ServiceProvider represents a commercial organisation.

Examples:

- Estate Agency
- Electrician
- Security Company
- HOA Contractor

Responsibilities include:

- marketplace presence
- billing
- reputation
- service catalogue
- verification
- bookings

A ServiceProvider exists because it sells services.

---

# Mechanical Agents

MechanicalAgent represents automation.

Examples:

- Listing Publisher
- AI Maintenance Dispatcher
- Lease Drafting Assistant
- Future Inspection Robot

Responsibilities include:

- capability declaration
- API credentials
- execution
- automation
- orchestration
- usage metrics

MechanicalAgent exists because it performs work.

It is **not** a marketplace provider.

Future implementations should avoid merging these concepts.

---

# AgentAccess

AgentAccess should remain the canonical delegation record.

It should continue to contain:

- permissions
- originalPermissions
- status
- grantor
- grantee
- audit history

Future evolution should preserve backward compatibility.

---

# AgentToken

AgentToken remains the execution credential.

Tokens should continue to contain:

- Principal identity
- Delegation identity
- Scoped permissions
- Expiration
- Revocation

Future work should not introduce separate token systems for AI and human agents.

One token architecture is sufficient.

---

# Verification

Verification is not a boolean.

Future work should evolve toward policy-based verification.

Examples:

Human Provider

- business registration
- licensing
- insurance

Mechanical Agent

- API ownership
- capability declaration
- security review
- model information

Future Robot

- certification
- calibration
- operator registration

Verification requirements differ.

The verification framework should support multiple verification policies without changing the authorization layer.

---

# Billing

Billing should be capability-driven rather than identity-driven.

Examples:

Human Provider

- monthly subscription
- marketplace commission

Mechanical Agent

- execution count
- API usage
- AI token consumption
- automation tier

Robot

- inspection duration
- maintenance cycles

Billing strategies should evolve independently of authentication.

---

# Roles

The existing Role enum should represent organisational permissions.

Examples:

- USER
- RESIDENT
- PROVIDER
- ADMIN
- BOARD

"Agent" is fundamentally different.

Agent describes **how someone is currently operating**, not who they are.

Future work should avoid introducing business logic that permanently assigns users an AGENT identity simply because they accepted a delegation.

Instead, delegation should establish an Agent Context.

---

# Agent Context

A user may temporarily operate as an agent while remaining the same authenticated user.

Example:

```
Personal Context

↓

Delegated Property

↓

Scoped Agent Context
```

This mirrors workspace switching rather than account switching.

---

# Provider vs Agent

A ServiceProvider may also operate under delegated authority.

These are separate concerns.

Provider responsibilities:

- marketplace
- services
- invoices
- bookings

Agent responsibilities:

- delegated property management
- scoped maintenance
- delegated messaging
- delegated administration

These responsibilities should share authentication while remaining logically separated.

---

# Gateway Direction

The current Agent Gateway should evolve into a broader workspace model.

Possible workspaces include:

- Personal
- Provider
- Delegated Properties
- Automation
- Administration

Each workspace exposes different tools while using the same authenticated identity.

---

# Robotics

Physical robotics should not drive today's schema.

Instead, current work should establish reusable abstractions:

- Principal
- Capability
- Verification
- Execution

Future robotic systems should integrate naturally through those abstractions.

---

# Architectural Guidance

Future engineering work should prefer:

✓ Shared authorization

✓ Shared delegation pipeline

✓ Shared audit model

✓ Shared token infrastructure

✓ Separate business models

✓ Separate capability models

✓ Separate verification policies

Future work should avoid:

✗ Separate authentication systems

✗ Separate delegation systems

✗ AI-specific authorization pipelines

✗ Human-specific authorization pipelines

✗ ServiceProvider shape inflation

✗ Role inflation

---

# Immediate Recommendations

Priority 1

- Complete outstanding Phase 111 correctness fixes.
- Preserve backward compatibility.

Priority 2

- Gradually introduce a Principal abstraction before attempting AI-specific schema expansion.

Priority 3

- Treat Agent as an execution context rather than a permanent identity.

Priority 4

- Introduce MechanicalAgent as a dedicated automation domain when automation capabilities mature.

Priority 5

- Allow verification, billing and capability frameworks to evolve independently from delegation.

---

# Long-Term Vision

The long-term goal is a single delegation architecture capable of supporting:

- human professionals
- commercial providers
- AI assistants
- external integrations
- autonomous automation
- future robotic execution

without requiring new authorization models.

Authorization should remain stable while business capabilities continue to evolve.
