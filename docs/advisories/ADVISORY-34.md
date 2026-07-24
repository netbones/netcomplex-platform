````markdown
# ADVISORY.md

# Advisory: Introduce a Platform Identity Layer (Decouple Identity from Authentication)

**Status:** Proposed
**Priority:** High (Architectural)
**Related Phases:**

- Phase 09 - Real-time Chat
- Phase 28 - Proxy Consolidation
- Phase 34 - Admin Layer
- Phase 46 - Provider Platform
- Phase 46.2 - Address Registry
- Phase 47 - dWallet
- Future - Cross-Tenant Communities
- Future - Decentralized Identity

---

## Executive Summary

Netcomplex currently authenticates users using Better Auth and authorizes them through tenant-scoped RBAC.

While this model is correct today, future platform goals introduce new requirements:

- Providers operating across multiple tenants
- Estate agents representing many communities
- Cross-tenant communities
- dWallet
- Lightning authentication
- Nostr integration
- Portable user identities
- Future digital signatures

These are identity problems rather than authentication problems.

**Recommendation**

Do **not** replace Better Auth.

Instead, introduce a first-class **Identity Layer** beneath Better Auth while leaving the existing authentication stack largely unchanged.

---

# Current Model

Current architecture roughly resembles:

```
Email
Password
Passkey

↓

Better Auth

↓

User

↓

Tenant Membership

↓

Seat

↓

RBAC
```

The "User" currently represents several different concepts simultaneously.

- Identity
- Resident
- Provider
- Agent
- Seat Holder

These concepts should be separated.

---

# Recommended Model

```
Credential

↓

Authentication

(Better Auth)

↓

Identity

↓

Membership

↓

Capability

↓

RBAC
```

Each layer has a single responsibility.

---

# Layer Responsibilities

## Authentication

Responsible only for proving ownership of credentials.

Examples

- Email/password
- Passkeys
- Nostr
- Lightning
- OIDC
- Future identity providers

Better Auth should continue owning:

- sessions
- cookies
- CSRF
- refresh tokens
- account linking
- password reset

No authorization logic belongs here.

---

## Identity

Represents an actual human (or organization).

Identity is global across the platform.

An Identity may belong to zero, one or many tenants.

Identity should survive:

- moving house
- leaving a community
- changing providers
- password resets
- authentication method changes

Identity should never depend upon a tenant.

---

## Membership

Membership represents the relationship between an Identity and a Tenant.

Examples

```
Identity

↓

Soralia Village

Resident

↓

Seat 17
```

Another example

```
Identity

↓

Muizenberg Electricity Cooperative

Member
```

One Identity may own many memberships.

---

## Capability

Capabilities describe what an identity is able to do.

Examples

- Resident
- Trustee
- Board Member
- Provider
- Estate Agent
- Volunteer
- Moderator

Capabilities are independent from authentication.

---

## RBAC

RBAC remains tenant scoped.

Permissions continue to work exactly as they do today.

Examples

```
Tenant A

Administrator

Tenant B

Resident

Tenant C

Provider
```

One Identity may simultaneously hold different RBAC roles in different tenants.

---

# Credential Model

Rather than storing authentication methods directly on User, introduce a Credential entity.

Suggested model:

```
Identity

↓

Credentials

• Email
• Passkey
• Nostr
• Lightning
• Future
```

Each Identity may own multiple credentials.

---

# Proposed Database Changes

Introduce new entities rather than modifying existing authentication tables.

Suggested additions

```
Identity
--------

id

createdAt

updatedAt
```

```
Credential

id

identityId

type

publicKey

fingerprint

metadata

revokedAt

lastUsedAt
```

Credential types may include:

```
EMAIL

PASSKEY

NOSTR

LNURL

OIDC
```

No tenant information belongs inside Credential.

---

# User Relationship

The existing User model should evolve into a profile rather than an identity.

Example

```
Identity

↓

User Profile

↓

Display Name

Avatar

Preferences

Settings
```

Identity owns authentication.

User owns presentation.

---

# Membership Model

Membership should continue owning:

- Tenant
- Household
- Seat
- Status
- Lifecycle
- Invitations

This keeps onboarding largely unchanged.

---

# Authentication Flow

Current

```
Password

↓

Better Auth

↓

Session
```

Future

```
Sign Challenge

↓

Verify Credential

↓

Lookup Identity

↓

Issue Better Auth Session
```

The session model does not change.

Only authentication methods expand.

---

# Nostr Integration

Nostr should be implemented as an additional credential provider.

Recommended flow

```
Browser

↓

window.nostr

↓

Request Challenge

↓

Sign Challenge

↓

Verify Signature

↓

Locate Credential

↓

Locate Identity

↓

Better Auth Session
```

This mirrors WebAuthn architecture.

---

# Lightning Integration

Future Lightning authentication should follow the same pattern.

```
Wallet

↓

LNURL-auth

↓

Signature

↓

Credential Verification

↓

Better Auth Session
```

Lightning therefore becomes another credential type rather than a replacement authentication system.

---

# User Onboarding

Current

```
Signup

↓

User

↓

Resident
```

Future

```
Create Identity

↓

Create User Profile

↓

Invitation

↓

Membership

↓

Seat Allocation

↓

RBAC
```

Identity becomes independent of tenancy.

---

# Cross-Tenant Benefits

This architecture naturally supports:

- marketplace providers
- contractors
- trustees
- estate agents
- volunteers
- electricity cooperatives
- neighbouring communities

without duplicate user accounts.

---

# dWallet Benefits

Wallets should belong to Identity.

Not Membership.

Example

```
Identity

↓

Wallet

↓

Transactions

↓

Tenant-specific permissions
```

A resident moving communities retains their wallet history.

---

# Proxy Voting

Future proxy voting and digital signatures benefit significantly.

A proxy submission becomes:

```
Identity

↓

Cryptographic Signature

↓

Verified Credential

↓

Legally attributable signature
```

This architecture also leaves room for future qualified digital signature providers.

---

# Future Credential Types

The Credential abstraction should allow future additions without architectural changes.

Examples

- Government Digital Identity
- OpenID Connect
- Enterprise SSO
- Wallet Authentication
- Mobile Secure Enclave
- Hardware Security Keys
- Decentralized Identity (DID)

---

# Migration Strategy

Phase 1

- Introduce Identity entity
- Introduce Credential entity
- Existing Better Auth unchanged

Phase 2

- Link existing Users to Identity

Phase 3

- Support multiple credentials

Phase 4

- Add Nostr login

Phase 5

- Add Lightning authentication

Phase 6

- Optional decentralized identity features

---

# Guiding Principles

1. Never replace Better Auth unless absolutely necessary.

2. Authentication is not Identity.

3. Identity is not Membership.

4. Membership is not Authorization.

5. Credentials must be replaceable.

6. Every Identity may own multiple credentials.

7. Every Identity may belong to multiple tenants.

8. Every tenant continues controlling onboarding, seat allocation and RBAC.

9. Platform identity should be portable.

10. Authentication providers should be plugins, not architectural dependencies.

---

# Long-Term Vision

Netcomplex should evolve toward an identity-centric platform rather than an account-centric platform.

The target architecture is:

```
Credential

↓

Authentication

↓

Identity

↓

Membership

↓

Capabilities

↓

RBAC

↓

Modules

↓

Services

↓

Communities

↓

Wallet

↓

Digital Signatures

↓

Future Decentralized Services
```

This architecture provides a stable foundation for future platform growth while minimizing disruption to the existing Better Auth implementation.
````
