---
title: The mistake most platforms make
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

## Community Graph

Today you have:

- Content
- Groups
- Conversations (chat)
- Notifications

What we're missing is a layer that models **persistent communities of interest** that can eventually span tenants.

Think of the evolution:

| Today             | Future                       |
| ----------------- | ---------------------------- |
| Tenant            | Tenant                       |
| Group             | Community                    |
| Group Members     | Community Members            |
| Content Post      | Discussion Topic             |
| Chat Conversation | Real-time Discussion Channel |
| Notification      | Community Activity Feed      |

---

# The mistake most platforms make

They start with:

```text
Group
 └─ Posts
     └─ Comments
         └─ Replies
```

and later discover they need:

```text
Cross-community collaboration
Federation
Shared resources
Events
Knowledge bases
Projects
Moderation
```

Then "threads" become a bottleneck.

Reddit, Facebook Groups, Discord Forums, Discourse and Slack Communities all eventually converge on the same model:

```text
Community
 ├─ Members
 ├─ Topics
 ├─ Posts
 ├─ Chat Channels
 ├─ Resources
 ├─ Events
 └─ Moderation
```

---

# Proposed Evolution for NetComplex

## Phase A (now)

Keep existing Groups.

Internally rename conceptually:

```text
Group
=
Local Community
```

Add a new aggregate:

```prisma
Community
```

Not exposed to users yet.

---

## Community Types

```ts
enum CommunityType {
  TENANT_LOCAL
  TENANT_INTEREST
  CROSS_TENANT
  PLATFORM_WIDE
}
```

Examples:

### Tenant Local

```text
Soralia Village DIY
```

Only Soralia residents.

### Tenant Interest

```text
Soralia Bird Watching
```

Only Soralia.

### Cross Tenant

```text
Southern Peninsula DIY Network
```

Members from:

- Soralia
- Green Meadows
- Mountain View

---

### Platform Wide

```text
Solar Installers South Africa
```

Entire NetComplex network.

---

# Separate Membership From Tenancy

Today:

```text
User
 └─ Tenant
```

Future:

```text
User
 ├─ Tenant Membership
 └─ Community Memberships
```

A user always belongs to one tenant.

A user may belong to many communities.

This becomes critical later.

---

# Introduce Topics Instead Of Threads

Don't create:

```prisma
Thread
```

Create:

```prisma
DiscussionTopic
```

Example:

```text
Community:
Soralia DIY

Topic:
Rainwater Harvesting Ideas

Posts:
- Original post
- Replies
- Nested replies
```

This scales far better.

---

# Community Affiliation

Your example is exactly why.

Today:

```text
Soralia DIY Group
```

Tomorrow:

```text
Soralia DIY Community
```

Later:

```text
Affiliated With:
- Green Meadows DIY
- Lakeside DIY
```

Eventually:

```text
Cape Town DIY Network
```

formed from multiple affiliated communities.

---

# Add Community Relationships Early

A future-proof table:

```prisma
CommunityRelationship
```

```ts
enum CommunityRelationshipType {
  AFFILIATED
  PARENT
  CHILD
  SCHOLAR
  YOUTH
  ADULT
  PARTNER
}
```

Example:

```text
Soralia DIY
   AFFILIATED
Green Meadows DIY
```

No functionality initially.

Just schema support.

---

# Content Should Become Community-Aware

Today:

```text
Content
  tenantId
```

Future:

```text
Content
  tenantId
  communityId?
```

This is a very small change now that prevents massive refactoring later.

The same applies to:

- Events
- Resources
- Surveys
- Competitions

All should optionally belong to a community.

---

# Unify Chat and Discussions

Right now you have:

```text
Conversation
```

I would evolve toward:

```text
Community
 ├─ Topics
 └─ Channels
```

Like Discord:

```text
Community
 ├─ General Chat
 ├─ DIY Help
 ├─ Marketplace
 └─ Events
```

So chat becomes a capability of a community, not a separate silo.

---

# Moderation Future-Proofing

Communities will eventually need:

```prisma
CommunityRole
```

```text
OWNER
MODERATOR
MEMBER
```

Separate from tenant roles:

```text
Tenant Role = RESIDENT
Community Role = MODERATOR
```

A resident can moderate a DIY community without becoming a tenant administrator.

---

# What I would put on the roadmap

A new GSD phase:

```text
32-community-foundation
```

### Plan 32-01

Community aggregate:

```text
Community
CommunityMember
CommunityRole
CommunityRelationship
```

No UI changes.

---

### Plan 32-02

Community-aware content:

```text
Content.communityId
Event.communityId
Resource.communityId
```

Still behaves exactly as today.

---

### Plan 32-03

Discussion Topics:

```text
DiscussionTopic
DiscussionPost
```

Implemented inside Groups.

Users perceive them as "group discussions".

---

### Plan 32-04

Cross-tenant communities.

Enable:

```text
allowCrossTenantMembership
```

feature flag.

---

### Plan 32-05

Community federation.

Affiliation requests between communities.

---

This approach keeps NetComplex aligned with its multi-tenant architecture while allowing communities to evolve from tenant-local groups into regional, interest-based networks without a major redesign. The key architectural decision is to treat **Groups as the first UI for Communities**, and **Threads as Discussion Topics within Communities**, rather than making threads a first-class top-level feature.
