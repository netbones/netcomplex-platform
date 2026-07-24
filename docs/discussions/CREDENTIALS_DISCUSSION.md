# DISCUSSION A

Q: Our current system uses Better Auth with RBAC. Users start their journey by becoming USERS, are then onboarded by their administrators (our tenants) according to the seat plan if they residents (standard, solo, premium), or are providers providing a service, or agents. At least that' is how I understand our system, which is still being nailed down. Since I have been playing with nostr and ditto extension, am wondering if we can't just issue our users with keys, and make login easier?

I actually think you're converging on something much bigger than "making login easier."

I would not replace Better Auth with Nostr. I would make Nostr keys a first-class identity credential that Better Auth understands.

That sounds subtle, but architecturally it's a very different system.

---

## Today your identity model is essentially

```
Email
   │
Password / Passkey
   │
Better Auth
   │
User
   │
Tenant Membership
   │
Seat
   │
RBAC
```

The important thing is that **Better Auth is not your identity**.

Better Auth is your **authentication broker**.

Your platform owns the identity.

---

## What Nostr gives you

Nostr says:

> The public key IS the identity.

```
npub1....
```

Everything else becomes proof that the holder owns the private key.

That is extremely attractive because:

- no passwords
- no email verification
- no OAuth dependency
- portable identity
- user owns their credentials

---

## But...

Your platform is not Twitter.

It's a regulated multi-tenant property management platform.

You care about things Nostr doesn't.

For example:

- Who lives in Unit 17?
- Which trustee approved them?
- Which HOA do they belong to?
- Which seat are they consuming?
- Are they suspended?
- Did they resign?
- Can they vote?

Those aren't identity questions.

Those are **authorization** questions.

---

## Identity should become independent of membership

I'd separate them.

```
Identity
---------
User ID
Public Keys
Email
Phone
Passkeys

↓

Membership

Tenant
Seat
Role
Status

↓

Permissions

RBAC
Modules
Policies
```

Notice that the key is attached to the **identity**, not the tenant.

A person can belong to:

```
Soralia Village

AND

Muizenberg Electricity Cooperative

AND

Local Marketplace

AND

Professional Association
```

with exactly the same keypair.

That feels much closer to where Netcomplex is heading.

---

# Better Auth becomes a credential manager

Instead of

```
Password

↓

Login
```

it becomes

```
Credentials

Email

Password

Passkey

Nostr Key

Lightning Auth

Magic Link

OIDC

↓

Better Auth

↓

Identity
```

Exactly like Auth0 or Clerk.

---

## Your onboarding changes slightly

Today

```
Signup

↓

User

↓

Tenant Admin approves

↓

Seat allocated

↓

Resident
```

Instead

```
Generate keypair

↓

Identity created

↓

User exists

↓

Invited to tenant

↓

Seat assigned

↓

Resident
```

Notice something interesting.

The user can exist before belonging anywhere.

That opens many possibilities.

---

## Marketplace

A plumber joins.

No tenant.

Just an identity.

```
Identity

↓

Provider

↓

Verified

↓

Can serve 200 tenants
```

Exactly what you wanted for providers.

---

## Agents

Estate agent.

```
Identity

↓

Agent

↓

Represents

Tenant A

Tenant B

Tenant C
```

No duplicate accounts.

---

## Residents

Resident moves.

Instead of

```
Delete account

Create account
```

you do

```
Remove membership

Add new membership
```

Identity never changes.

---

# Lightning fits naturally

You mentioned LNBits.

This is where it becomes exciting.

LNURL-auth already works by proving ownership of a keypair.

Flow becomes

```
LN Wallet

↓

Scan QR

↓

Wallet signs challenge

↓

Better Auth verifies

↓

Session created
```

No password.

No email.

Almost instant.

---

# Nostr extension

If they have Ditto

or

Alby

or

nos2x

```
Window.nostr

↓

Sign challenge

↓

Verify signature

↓

Logged in
```

Exactly like WebAuthn.

---

# You can even issue keys

Here's what I would do.

When a normal resident signs up.

```
Email

↓

Better Auth

↓

Create User

↓

Generate Ed25519 keypair

↓

Encrypt private key

↓

Store

↓

Offer export
```

The user doesn't even know they have a Nostr identity.

Later...

```
Install Ditto

↓

Import key

↓

Instant login
```

No migration required.

---

## Or let advanced users bring their own key

```
Login with Nostr

↓

Paste npub

↓

Sign challenge

↓

Verified

↓

Account linked
```

Exactly like linking Google.

---

# One thing I would NOT do

I would never make

```
npub
```

your primary database identifier.

Instead keep

```
User
--------
UUID
```

and allow multiple credentials.

```
User

UUID

Credentials

Email

Passkey

Nostr

Lightning

Future...
```

Because one day someone loses a Nostr key.

You don't want to lose the person.

---

# Even broader vision

I actually think Netcomplex is evolving toward a decentralized identity architecture rather than simply a better login system.

A future identity record could look like this:

```
Identity
---------
UUID
Display Name
Avatar

Credentials
-----------
Email
Passkeys
Nostr Public Keys
Lightning Auth
OIDC

Memberships
-----------
Soralia Village
Muizenberg Electricity Cooperative
Cape Traders Market

Capabilities
------------
Resident
Provider
Agent
Board Member
Volunteer

Wallets
-------
dWallet
Lightning
Future CBDC
```

At that point, Better Auth is responsible only for proving "this person controls one of these credentials." Everything that makes someone a resident, provider, trustee, or agent remains in your own domain model and RBAC system. That separation aligns well with the multi-tenant architecture you're building, where tenants, seats, lifecycle states, and permissions are distinct concepts from authentication. Your current platform already reflects that separation by centering on Better Auth with tenant-aware onboarding and role/seat lifecycle management.

I think this direction also meshes with several long-term goals you've discussed before—cross-tenant communities, dWallet, providers serving multiple estates, and Lightning integration. Those all become much simpler if the user has one portable cryptographic identity and your platform simply grants or revokes memberships and capabilities as their relationships with different communities change. That's a stronger architectural foundation than replacing Better Auth outright.

# DISCUSSION B

Q: So what would I need to do to implement this given our current schema and Better Auth setup?

Given everything I know about Netcomplex, I actually think this is a perfect time to do it—not as a migration, but as an **identity evolution**.

I would not touch your existing authentication flow initially. Instead, I would add a cryptographic identity layer underneath it.

I'd break it into six phases.

---

# Phase 1 – Introduce a Cryptographic Identity

Today you effectively have

```
User
 ├── email
 ├── password/passkey
 └── BetterAuthAccount
```

I'd evolve it into

```
Identity
──────────────
id (UUID)

User
──────────────
identityId
displayName
avatar

Credential
──────────────
identityId
type
publicKey
fingerprint
createdAt
lastUsed
```

Instead of one authentication method, every identity can own many credentials.

Example

```
Identity

Credentials

✓ Email

✓ Passkey

✓ Nostr

✓ Lightning

✓ Future
```

Notice there is **no tenant** involved yet.

---

# Phase 2 – Add a Credential table

Instead of adding columns to User

```
User

nostrPublicKey
```

I'd introduce

```
Credential

id

identityId

type

EMAIL

PASSKEY

NOSTR

LNURL

OIDC

publicKey

metadata

revokedAt
```

Then Better Auth simply asks

> Which credential authenticated?

---

# Phase 3 – Leave Better Auth untouched

Do NOT replace Better Auth.

Just teach it another login method.

Today

```
Password

↓

Better Auth

↓

Session
```

Tomorrow

```
Sign challenge

↓

Verify Nostr signature

↓

Find Credential

↓

Find Identity

↓

Issue Better Auth session
```

Better Auth still owns

- sessions
- cookies
- CSRF
- RBAC integration
- refresh
- logout

Only the login mechanism changes.

---

# Phase 4 – Issue keys automatically

This is where I think Netcomplex becomes interesting.

During signup

```
Signup

↓

Create Better Auth user

↓

Generate Ed25519 keypair

↓

Encrypt private key

↓

Store

↓

Credential created
```

Users don't even know.

Later

Settings

```
Export Nostr Identity
```

or

```
Connect Ditto
```

becomes available.

---

# Phase 5 – Tenant invitations change slightly

Currently

```
Signup

↓

Resident
```

I'd change it to

```
Identity exists

↓

Invitation accepted

↓

Membership created

↓

Seat assigned

↓

Role assigned
```

This is a subtle but important shift.

Identity is global.

Membership is local.

Exactly like GitHub.

You don't create a new GitHub account for every organization.

---

# Phase 6 – Multiple credentials

Eventually

Settings

```
Security

✓ Email

✓ Passkey

✓ Nostr

✓ Lightning

✓ Hardware Key

Add credential
```

Any one of them can authenticate.

---

# Schema changes

Without seeing every model, I'd expect something close to

```prisma
model Identity {
  id           String @id @default(cuid())

  users        User[]

  credentials  Credential[]

  createdAt DateTime @default(now())
}
```

```prisma
model Credential {

  id String @id @default(cuid())

  identityId String

  identity Identity
      @relation(fields:[identityId], references:[id])

  type CredentialType

  publicKey String?

  fingerprint String?

  metadata Json?

  revokedAt DateTime?

  lastUsed DateTime?
}
```

```prisma
enum CredentialType {

  EMAIL

  PASSKEY

  NOSTR

  LNURL

  OIDC
}
```

---

# Membership stays exactly where it is

I would **not** move

- seat
- tenant
- resident
- provider
- agent
- RBAC

Those are platform concerns.

Instead

```
Identity

↓

Membership

↓

Seat

↓

Role

↓

Permissions
```

---

# Your onboarding becomes cleaner

Platform

```
Create Identity
```

Tenant

```
Invite Identity
```

HOA

```
Allocate Seat
```

System

```
Assign RBAC
```

Those are four completely different responsibilities.

---

# Nostr login

The browser extension already gives you

```
window.nostr
```

The login flow is tiny.

```
GET /auth/challenge

↓

Server generates nonce

↓

Browser signs nonce

↓

POST signature

↓

Verify signature

↓

Lookup Credential

↓

Issue Better Auth session
```

Exactly like WebAuthn.

---

# The part I'd change in your current architecture

One thing I've noticed from our discussions over the last few months is that Netcomplex currently mixes together several concepts:

```
User

Resident

Provider

Agent

Seat Holder

Identity
```

Those are not actually the same thing.

I'd formalize them as separate layers:

```
Identity
    │
    ▼
Membership
    │
    ▼
Capability
    │
    ▼
Role
```

Where:

- **Identity** = "Who are you?" (UUID + credentials)
- **Membership** = "Which tenant(s) do you belong to?" (resident of Soralia, member of the electricity cooperative, etc.)
- **Capability** = "What can you do?" (resident, provider, agent, board member, volunteer)
- **Role** = "What permissions do you have in this tenant?" (RBAC)

That model will scale much better as you add providers, cross-tenant communities, marketplace features, dWallet, and decentralized identity.

## If I were planning the next major architectural phase for Netcomplex, I'd make one strategic goal explicit:

> **Decouple authentication from identity, and decouple identity from membership.**

Better Auth continues to handle authentication and session management. Your platform becomes the authoritative source for identity, memberships, and authorization. Once that separation exists, adding Nostr, LNURL-auth, passkeys, OpenID Connect, or future credential types becomes an incremental feature rather than another architectural migration. I think that's one of the cleanest long-term investments you can make for the platform.
