# RESPONSE TO PART 2.2 of COMMUNIQUE-02.md

For NetComplex, I would avoid trying to make the existing seat tables become the address system. They represent _owners_ of addresses, not the namespace itself. Your own analysis already highlights the biggest problem:

> there is no cross-table uniqueness and every lookup potentially queries multiple tables.

That is a strong indication that you're missing a first-class domain object.

## Recommendation: Option A++ — Central Address Registry

Instead of treating `StandardSeat`, `SoloSeat`, `PremiumSeat`, `Profile`, and future `Provider` records as address owners, make them consumers of a single Address Registry.

Think of it like DNS.

```
Address
--------
id
tenantId

address              "john@soralia.org"
localPart            "john"
domain               "soralia.org"

kind
STANDARD
ALIAS
SOLO
PREMIUM
PROVIDER
SYSTEM

status
ACTIVE
RESERVED
COOLING_OFF
ARCHIVED
DELETED

ownerType
STANDARD_SEAT
PROFILE
SOLO_SEAT
PREMIUM_SEAT
PROVIDER
SYSTEM

ownerId

canonicalAddressId
forwardStrategy

createdAt
releasedAt
coolingUntil
archivedUntil
```

Then every other table merely references it.

```
StandardSeat
-------------
addressId FK

SoloSeat
---------
addressId FK

PremiumSeat
------------
addressId FK

Profile
--------
aliasAddressId FK

Provider
---------
addressId FK
```

That gives you one authoritative namespace.

---

# Why this fits NetComplex

The more I read your architecture, the clearer it becomes that addresses are evolving into **platform identities**, not merely email-style strings.

You already intend them to support:

- messaging
- mentions
- invitations
- routing
- portability
- providers
- future federation
- cross-tenant communities

Those are identity concerns.

Not seat concerns.

---

# Address Resolution becomes trivial

Instead of

```
find in Profile
find in StandardSeat
find in SoloSeat
find in PremiumSeat
find in Provider
```

you simply

```
Address.findUnique({
    address
})
```

Then follow

```
ownerType
ownerId
```

This becomes O(1).

---

# It also fixes messaging

Current:

```
ConversationParticipant

userId
```

Future:

```
ConversationParticipant

participantId
participantType
```

where

```
USER
ADDRESS
GROUP
HOUSEHOLD
PROVIDER
```

Then

```
@john
```

is simply

```
Address

↓

owner

↓

participants
```

The chat system never needs to know whether John is

- Premium
- Solo
- Alias
- Provider

The registry already resolved it.

---

# Household Messaging

This is actually one of the nicest benefits.

```
unit042@soralia.org
```

can resolve to

```
ForwardStrategy

HOUSEHOLD
```

meaning

```
Address

↓

Household

↓

Current Members

↓

Recipients
```

while

```
john.unit042@soralia.org
```

has

```
ForwardStrategy

DIRECT
```

to a single user.

No special-case logic.

---

# Liberation becomes elegant

Current

```
john.unit042
```

↓

Premium

↓

john

```

Today this is effectively

delete

create

update

everything

Instead

```

Address A
john.unit042

↓

Forwards

↓

User

```

Later

```

Address B
john

↓

same User

```

Now

```

Address A

status

UPGRADED

↓

301-style forward

↓

Address B

```

Old messages still resolve.

Old mentions still resolve.

Bookmarks still work.

---

# Cooling-off is no longer awkward

Instead of storing cooldowns in seat tables

```

PremiumSeat

```

(which makes little sense),

the Address owns its lifecycle.

```

ACTIVE

↓

ARCHIVED

↓

COOLING_OFF

↓

AVAILABLE

```

Exactly where it belongs.

---

# Future Federation

Earlier we discussed cross-tenant communities.

That becomes much easier.

Today

```

[john@soralia.org](mailto:john@soralia.org)

```

Tomorrow

```

[john@greenpark.org](mailto:john@greenpark.org)

↓

same platform

↓

same Address Registry API

```

Eventually

```

[john@soralia.org](mailto:john@soralia.org)

↓

remote federation

↓

other NetComplex instance

```

because everything starts with Address resolution.

---

# Providers

Providers become completely natural.

```

[voltsafe@soralia.org](mailto:voltsafe@soralia.org)

kind

PROVIDER

```

or

```

[electrician.voltsafe@soralia.org](mailto:electrician.voltsafe@soralia.org)

```

or

```

[support.voltsafe@soralia.org](mailto:support.voltsafe@soralia.org)

```

They're simply addresses.

No special namespace.

---

# Aliases

Instead of Profile owning aliases,

make aliases first-class.

```

Address

kind = ALIAS

canonicalAddressId

↓

[john@soralia.org](mailto:john@soralia.org)

```

Now you can support

```

johnny@

maintenance@

security@

office@

admin@

```

without changing Profile.

---

# Reserved Names

A registry also lets you reserve platform names.

```

admin
support
system
billing
help
maintenance
security
office
community
events

```

Status

```

SYSTEM_RESERVED

```

No seat can ever claim them.

---

# APIs

The architecture naturally becomes:

```

AddressService

reserve()

release()

resolve()

move()

forward()

archive()

lookup()

validate()

generate()

```

Every module depends on this service instead of touching seat tables.

---

# Migration

You don't need to replace the existing schema immediately.

Phase 1

- Create `Address` table.
- Populate it from existing `StandardSeat`, `SoloSeat`, `PremiumSeat`, and `Profile` records.
- Add foreign keys (`addressId`) while keeping the legacy `platformAddress` columns.

Phase 2

- Read through `AddressService` only.
- Legacy columns become cached/denormalized values.

Phase 3

- Remove direct ownership of address strings from seat tables.
- Keep them as computed or synchronized fields only if needed for reporting or backward compatibility.

## Overall recommendation

I would treat **Platform Address** as one of NetComplex's core domain entities—alongside `User`, `Tenant`, and `Conversation`—rather than as an attribute scattered across multiple models. Given your roadmap (premium seats, providers, messaging, portability, dWallet, federation, and cross-community interaction), a centralized `Address` registry is likely to become foundational infrastructure rather than an implementation detail. It eliminates cross-table uniqueness issues, provides a single resolution mechanism for messaging and mentions, cleanly models lifecycle rules such as cooling-off periods, and gives you a stable platform for future features without forcing each new module to reinvent address handling.
```
