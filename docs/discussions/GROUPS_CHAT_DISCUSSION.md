---
title: DISCUSSION ON FUTURE OF COMMUNITY GROUPS vs PLATFORM CHAT FEATURE
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

# DISCUSSION ON FUTURE OF COMMUNITY GROUPS vs PLATFORM CHAT FEATURE

# PART ONE

Q: The problem we face has to do with the manner in which two important features have been created without any integration. Chat and Groups are logical allies. Our Chat feature is currently entirely separate from Groups. But when a user joins a group, there will be an expectation of communication. Effectively what we have are group pages, and a separate, non-integrated chat feature. I like how the lotus project has managed to integrate chat with groups, see attached images and with a (chat|groups) header component that allows the user to easily navigate between the two aspects of the platform. The area is currently reserved for the as yet not signed-off workspaces switcher, which is on a feature branch. Our platform group pages, could potentially move in this same direction as lotus. You advice on the issue would be appreciated.I think you've identified a product architecture issue rather than simply a UI issue.

## RESPONSE:

The current design treats **Groups** and **Chat** as independent applications. In practice, users perceive them as two facets of the same social object.

A user doesn't think:

> "I'm going to the Groups module."

They think:

> "I'm participating in my gardening club."

That participation naturally involves:

- conversations
- members
- announcements
- events
- files
- decisions
- media
- moderation

Chat is one of those activities — not a separate destination.

---

# What Lotus gets right

Looking at your screenshots, Lotus has made one particularly good decision.

Instead of making Groups and Chat separate navigation items, they created a **context switcher**.

```
Chat | Groups
```

Notice what happens psychologically.

The user never leaves the collaboration space.

Instead they change _mode_.

Groups become:

```
Community
```

while Chat becomes

```
Conversation
```

That is a subtle but extremely effective UX pattern.

---

# What Lotus still doesn't solve

Lotus is still fundamentally a messaging application.

Groups exist largely to support chat.

Your platform is different.

Netcomplex is a **community operating system**.

A group is far richer than a chat room.

For example:

```
DIY Group

Members
Discussions
Knowledge Base
Gallery
Events
Polls
Marketplace
Volunteer Tasks
Documents
Achievements
```

Chat is only one module.

---

# I would reverse the ownership

Instead of

```
Chat
   └── Group Chat
```

I would design

```
Group
    ├── Feed
    ├── Discussion
    ├── Members
    ├── Events
    ├── Resources
    ├── Gallery
    ├── Tasks
    └── Settings
```

Notice there is no "Chat module."

Chat becomes

```
Discussion
```

inside a group.

Exactly like Slack.

Exactly like Discord.

Exactly like Teams.

Exactly like Facebook Groups.

Exactly like Circle.

The community owns the conversation.

Not the other way around.

---

# The architectural model

Instead of

```
Platform

Groups
Chat
Messages
```

I'd move toward

```
Community Platform

Communities
    ↓

Group
    ↓

Capabilities

• Feed
• Discussion
• Events
• Resources
• Polls
• Marketplace
• Members
• AI
```

This scales indefinitely.

---

# The navigation

I actually think Lotus gives you a clue, but I'd evolve it.

Instead of

```
Chat | Groups
```

I'd make it contextual.

When viewing a group:

```
────────────────────────────────────

DIY Club

Feed | Discussion | Members | Files | Events

────────────────────────────────────
```

Discussion is the chat.

Feed is asynchronous.

Events are scheduled.

Members is membership.

Everything belongs to the group.

---

# Where your existing chat fits

Your current chat module shouldn't disappear.

It becomes **Personal Messaging**.

Think WhatsApp.

```
Inbox

Alice
Bob
Committee Chair
Maintenance Manager
```

Those conversations have nothing to do with groups.

Meanwhile

```
Gardening Club
```

has

```
Discussion
```

which happens inside the group.

---

# Two communication models

I would formalize this distinction.

## Personal communication

```
Inbox

1:1

Small private groups

Temporary conversations
```

Navigation

```
Messages
```

---

## Community communication

```
HOA Committee

DIY Club

Neighbourhood Watch

Dog Owners

Running Club
```

Navigation

```
Groups

↓

Discussion
```

These are fundamentally different objects.

---

# The relationship

I would model it like this.

```
Platform
│
├── Messages
│      │
│      ├── Direct Message
│      ├── Small Group Chat
│      └── System Conversations
│
└── Communities
       │
       ├── Feed
       ├── Discussion
       ├── Members
       ├── Resources
       ├── Events
       ├── Polls
       └── Media
```

Notice how "Discussion" reuses your chat engine.

The backend doesn't care.

The UI does.

---

# The workspace switcher

You mentioned this area is currently reserved for a workspace switcher.

I actually think the workspace switcher and the Lotus pattern can coexist beautifully.

Imagine:

```
┌─────────────────────────────────────────────┐
│ Soralia Village                     ▼       │
└─────────────────────────────────────────────┘

                    ↓

Home

Explore

Community

Messages

Profile
```

Then inside Community

```
DIY Club

Feed | Discussion | Members | Files | Events
```

You don't need another global

```
Chat | Groups
```

switch.

The context changes after entering a community.

---

# Future-proofing

This is the biggest reason I'd make this change.

You have already discussed future capabilities such as:

- dWallet
- Community Merits
- Volunteer Credits
- AI assistants
- Marketplace
- Donations
- Support with Chips
- Competitions
- Resource sharing

None of these belong to "Chat."

They belong to the **Group**.

That suggests the group should be the primary aggregate root for community collaboration, with discussion being just one capability.

---

# My recommendation

I would **not** copy Lotus literally.

I would borrow the principle:

> Conversation and membership should live within the same contextual experience.

Then adapt it to Netcomplex's broader vision:

- Keep **Messages** as the global personal communication hub.
- Make **Groups** the primary collaboration object.
- Replace the standalone "Group Chat" concept with a **Discussion** tab within each group.
- Build a reusable contextual header for groups:

```
GroupHeader

[Avatar]
Group Name

Feed | Discussion | Members | Events | Resources | Gallery | Settings
```

As additional capabilities (wallet interactions, polls, AI copilots, volunteer coordination, chips, achievements, and more) are introduced, they become new tabs or panels within the same contextual shell rather than new top-level modules. This produces a cohesive collaboration model instead of a collection of disconnected features.

Given the direction of Netcomplex, I think this aligns much better with the platform's long-term architecture than maintaining parallel "Groups" and "Chat" applications. It also gives you a stable extensibility point for future modules without continually expanding the global navigation.

# PART TWO

## Q: Thanks, you have some good insights for me to sleep on. To get back to the Chats vs Groups discussion. I understand that Communities could have feeds and discussions. Per: Platform

│
├── Messages
│ │
│ ├── Direct Message
│ ├── Small Group Chat
│ └── System Conversations
│
└── Communities
│
├── Feed
├── Discussion
├── Members
├── Resources
├── Events
├── Polls
└── Media

My issue is with our UI/UX. A user is able to access Chat easily because its part of the Space Chrome for desktop and mobile. But to nav to Groups, user must either open the burger, use the link if its set in the header by the Admin, or nav to /dashboard/services and the Groups domain card. The user logs in, finds the workspace, perhaps visits community to see what is happening, what is the economical way to jump into a groups discussion if not by navigation to chat with groups topics being an extension of the chat UX?

## RESPONSE TWO

## A: I actually think you've uncovered the tension that almost every collaboration platform eventually runs into:

> **The architecture says Groups own Discussions. The UX says Discussions need to be one tap away.**

Those are not contradictory goals.

The mistake many products make is assuming that **navigation must mirror architecture**. It shouldn't.

---

## Think about Slack

Internally, Slack has:

- Workspaces
- Channels
- DMs
- Huddles
- Threads
- Canvases

But users don't think about the hierarchy.

They simply open Slack and start talking.

---

## Think about Discord

Discord is even more hierarchical:

```
Server
    Category
        Channel
            Thread
```

Yet the UI feels like "Chat."

Why?

Because navigation is conversation-centric.

---

## Your architecture can stay community-centric

I still believe this is the right model:

```
Community
    Feed
    Discussion
    Events
    Members
```

But your **entry point** doesn't have to be the Community page.

---

# Chat becomes the communication hub

This is the distinction I'd make.

Your **Chat** icon doesn't open "Direct Messages."

It opens **Communication**.

Something like:

```
Messages

────────────────────

Recent

🏠 HOA Committee

🔨 DIY Club

👤 Alice

👤 Bob

🏃 Running Club

📦 Concierge

🛠 Maintenance

────────────────────

```

Notice something.

The user doesn't care whether the conversation belongs to a Group.

They just want to resume where they left off.

---

## The left panel becomes unified

Instead of

```
Messages

Alice

Bob

Charlie
```

I'd imagine

```
Communication

Recent

● Alice

● HOA Committee

● DIY Club

● Neighbourhood Watch

● Committee

● Bob

● Concierge

```

Everything is ordered by activity.

Exactly like Microsoft Teams.

Exactly like Discord.

Exactly like Mattermost.

---

# Opening a group conversation

Suppose I click

```
DIY Club
```

The header could become

```
DIY Club

Discussion | Feed | Members | Events
```

The user lands immediately in **Discussion** because they came from Chat.

One click later, they can move to Feed.

Or Members.

Or Files.

Now Chat becomes a doorway into Communities.

---

# This solves your discoverability problem

Right now you described:

> Burger
>
> Header link
>
> Services
>
> Group card

That's four different ways to find Groups.

Most users won't.

Instead:

```
Community

↓

Groups

↓

Discussion
```

becomes

```
Chat

↓

DIY Club

↓

Discussion
```

Much faster.

---

# Don't make Chat own Groups

This is the subtle distinction.

Avoid this:

```
Chat

    Group Chats

        DIY

        HOA

        Running Club
```

Because now Groups become subordinate to Chat.

Instead make Chat a **navigator**.

```
Communication Hub

↓

Conversation

↓

Community Context
```

When the user selects a conversation, the application knows

```
conversation.communityId = 42
```

Now every button in the header can jump into that community.

---

# I think Lotus hints at this

Lotus' toggle

```
Chat | Groups
```

is trying to solve exactly this.

But I think you can simplify further.

Remove the toggle entirely.

Instead:

```
Messages
```

contains

```
Direct

Groups

System

```

not as different pages, but simply different conversation types.

---

# One conversation engine

From an engineering perspective this becomes elegant.

```
Conversation

type

DIRECT

GROUP

SYSTEM

SERVICE

AI
```

Every conversation uses the same backend.

Different headers.

Different capabilities.

---

# One header component

Imagine every conversation rendering a contextual header.

### Direct message

```
Alice

Call

Search

Shared Files
```

---

### Group discussion

```
DIY Club

Discussion

Feed

Members

Events

Files
```

Same page.

Different capabilities.

---

# Even better...

Since you've mentioned the **Space Chrome**, I'd actually consider slightly redefining what that icon represents.

Instead of:

```
💬 Chat
```

consider

```
💬 Conversations
```

or simply keep the familiar chat icon, but make it semantically broader.

When users click it, they enter their communication inbox, where they naturally encounter:

- Direct messages
- Group discussions
- Committee rooms
- Service conversations
- AI assistant chats

The icon doesn't promise "private messaging"; it promises "places where conversations happen."

That aligns perfectly with your broader platform vision.

## My one caution

I would resist the temptation to make the global Chat UI the _only_ way into a group's discussion. The group page should still stand on its own, because many users will arrive there from search, notifications, feeds, or deep links.

Instead, think of the relationship like this:

```
Community
    ├── Feed
    ├── Discussion
    └── ...

           ▲
           │
           │
     Communication Hub
```

The Communication Hub is a **cross-cutting index** of active conversations. It doesn't own them; it provides the fastest path back into them. Once you open a conversation, the surrounding UI expands to reveal the rest of the community context.

For Netcomplex, I think this strikes the best balance. It preserves the architectural integrity of communities as the primary collaboration unit while making active discussions just as immediately accessible as a traditional chat application. It also creates a natural place for future conversation types—AI copilots, service desks, committee rooms, support channels—without forcing users to learn separate navigation patterns for each.
