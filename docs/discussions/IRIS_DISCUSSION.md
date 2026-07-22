# IRIS DISCUSSION

Q: Should the current User Activity feed on /dashboard evolve into an Iris-like stream (with content from my friends, my groups), or should this be situated elsewhere, perhaps on our current community space /community dashboard, which is currently a widget dashboard that allows many different widgets , was initially solely about allowing user to customise experiences?

A: I actually think this question touches on the larger identity of Netcomplex.

At the moment, it sounds like there are three concepts competing for the same responsibility:

- **Dashboard** — "my operational home"
- **Community** — "my customizable widget space"
- **Activity Feed** — "what's happening around me"

Those should not all try to be the same thing.

## I would keep the Dashboard operational

When someone logs in to an HOA platform, the first question is usually:

> "Do I need to do anything today?"

Not

> "What's everyone talking about?"

Your dashboard should answer operational questions first.

For example:

- Outstanding maintenance requests
- Bookings today
- Package arrivals
- Approvals waiting
- Upcoming AGM
- Unread notices
- Payment reminders
- AI summary of today

This is a productivity dashboard.

Think Microsoft 365 Home rather than Facebook.

---

## Community should become the social home

Your `/community` area is a much better candidate for an Iris-like stream.

Why?

Because the user has mentally entered "community mode."

That page can evolve from a widget dashboard into something like:

```
Community

────────────────────────────

What's happening

────────────────────────────

Friends

Groups

Nearby

Events

Marketplace

Volunteer opportunities

Recommended discussions

Trending resources

Competitions

```

That is exactly where a social timeline belongs.

---

## Widgets don't disappear

I wouldn't abandon the widget concept.

Instead, I'd make the Community page a composition of widgets.

For example:

```
Community

────────────────────────

Activity Stream

──────────────

My Groups

──────────────

Upcoming Events

──────────────

Marketplace

──────────────

Competitions

──────────────

Volunteer Requests

──────────────

Resources

```

Every section is a widget.

Users can still customize the layout.

Now customization has purpose.

---

## The Activity Feed becomes just another widget

Instead of hardcoding an Activity page, create an `ActivityFeedWidget`.

That widget can appear on:

- Community
- Dashboard (if enabled)
- Group page
- Profile
- Mobile Home

The same engine powers different contexts.

---

## Different contexts produce different feeds

This is where the architecture becomes elegant.

The feed service understands context.

### Dashboard

```
Activity Feed

• Your maintenance ticket updated

• Committee approved booking

• Package delivered

• Event tomorrow
```

Operational.

---

### Community

```
Community Feed

• John posted in DIY Club

• Neighbour sold bicycle

• Gardening competition announced

• Running Club meeting tonight

• Volunteer opportunity

• Alice uploaded photos
```

Social.

---

### Group

```
DIY Club

• Bob posted new guide

• Sarah uploaded plans

• Saturday workshop announced

• Poll opened
```

Group-specific.

---

### User Profile

```
David

Recent posts

Achievements

Groups joined

Competitions won
```

Personal.

---

## Borrow from Iris—but don't become Iris

Iris works because almost everything revolves around content.

Netcomplex revolves around communities.

Content is one artifact within those communities.

That distinction matters.

An Iris-style endless feed should not dominate the platform.

Instead, it should enrich the community experience.

---

## I would separate "work" and "community"

One mental model I often use is:

```
Platform

├── Dashboard
│
│   Work
│
│   • Tasks
│   • Approvals
│   • Maintenance
│   • Bookings
│   • AI Summary
│
└── Community
    │
    Life
    │
    • Feed
    • Groups
    • Events
    • Marketplace
    • Resources
    • Friends
```

The distinction is immediately understandable to users.

---

## Looking further ahead

As Netcomplex grows, I would expect the navigation to feel something like:

```
Home
│
├── Dashboard
├── Community
├── Messages
├── Directory
├── Services
├── Wallet
└── Profile
```

Then inside **Community**:

```
Community

Feed

Groups

Events

Marketplace

Discover

Friends
```

The feed becomes the **default landing view** within Community, while Groups becomes one of several collaboration spaces accessible from there.

## My recommendation

I would **not** evolve the `/dashboard` into an Iris-like social timeline. Doing so mixes operational workflow with social discovery and makes the dashboard less effective at helping users accomplish immediate tasks.

Instead:

- Keep **Dashboard** focused on "what requires my attention."
- Evolve **Community** into the user's social and collaborative hub.
- Make the **Activity Feed** a reusable widget backed by a context-aware feed engine.
- Allow users to pin the Activity Feed widget onto their Dashboard if they prefer a more social experience, but don't make it the default.

This preserves a clear mental model while leveraging the flexibility of your existing widget architecture. It also aligns naturally with the direction you've already been taking: a customizable Community space that can grow into the primary place for discovery, participation, and collaboration without overloading the operational dashboard.
