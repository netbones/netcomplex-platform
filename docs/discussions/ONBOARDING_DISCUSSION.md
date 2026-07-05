Given what I know about NetComplex, I would avoid an **"immediate wizard after signup"** as the primary onboarding mechanism.

Your platform is no longer a simple SaaS app—it is a **multi-tenant operating system**. Different users arrive with different intentions:

- A tenant owner evaluating the platform.
- An HOA administrator migrating an existing community.
- A resident invited into an existing tenant.
- A service provider joining the marketplace.
- Eventually AI agents operating on behalf of organizations.

Those are fundamentally different onboarding journeys.

## I would separate onboarding into four phases

```
Registration
      ↓
Identity
      ↓
Provisioning
      ↓
Guided Adoption
```

This is much more scalable than one long wizard.

---

# Phase 1 — Registration (under 2 minutes)

Goal:

> "Get them into the platform."

Nothing more.

Collect only:

- Name
- Email
- Password / Passkey
- Tenant intention

Example:

```
Welcome to NetComplex

What are you here to do?

○ Create a new community
○ Join an existing community
○ Register as a service provider
○ I'm just exploring
```

This single question determines the entire journey.

No branding.

No colours.

No modules.

No page selection.

No invitations.

Those are provisioning tasks.

---

# Phase 2 — Identity Confirmation

Once signed in:

Show a welcome dashboard instead of a wizard.

```
Welcome David.

Your community isn't ready yet.

Let's build it together.
```

Then present a checklist.

Example:

```
✓ Verify email

□ Create your community

□ Choose your community type

□ Configure branding

□ Invite first admin

□ Launch
```

Psychologically this feels much lighter than

```
Step 1 of 8
```

---

# Phase 3 — Provisioning

This is where your existing wizard belongs.

Instead of forcing it immediately...

Treat it as a project.

Example:

```
Community Setup

Progress

██████░░░░ 60%

Continue Setup
```

The owner can:

- leave
- explore
- come back tomorrow

Everything auto-saves.

This is how products like:

- Shopify
- Notion
- Slack

handle onboarding.

---

# Phase 4 — Guided Adoption

This is where many SaaS platforms fail.

Launching a tenant is not success.

Adoption is.

Once the tenant exists, the platform should gradually unlock guidance.

Example:

```
Week 1

✓ Invite residents

✓ Publish announcement

✓ Add first event

✓ Configure maintenance

✓ Complete branding
```

Later:

```
Recommended

Enable dWallet

Create first survey

Configure providers

Enable bookings

Setup achievements
```

Now onboarding becomes continuous.

---

# Replace the Wizard with Missions

Instead of:

```
Step 4 of 8
```

Use missions.

```
Mission

Invite your first resident

Reward

Community Ready +5%
```

This fits NetComplex's future merit system and makes the process feel like progress rather than paperwork.

---

# Progressive Disclosure

Today your wizard asks many questions before the user has seen the platform.

Instead:

Immediately show:

```
Dashboard

Announcements

Residents

Widgets

Messages

```

Grey out incomplete areas.

Example:

```
Bookings

Requires setup

Configure
```

```
Community Services

Needs categories

Configure
```

```
Events

Ready
```

People learn by seeing.

---

# Separate Required vs Optional

Current onboarding likely mixes both.

Instead:

## Required

Tenant name

Slug

Timezone

Owner

Brand

Contact

Done.

Everything else becomes optional.

---

Optional:

Facilities

Maintenance categories

Modules

Bookings

Wallet

Merits

Provider marketplace

AI agents

These can be enabled later.

---

# Introduce an "Onboarding Home"

Rather than redirecting to a wizard...

Redirect here.

```
Welcome to Soralia Village

Community Setup

82%

──────────────────────────

Continue Setup

Explore Dashboard

Invite Residents

View Guide

Watch Demo

Contact Support
```

This becomes the owner's headquarters.

---

# Use Contextual Setup

Instead of asking:

> "Configure bookings"

Wait until they click Bookings.

Show:

```
Bookings hasn't been configured.

Would you like to:

○ Use defaults

○ Import template

○ Configure manually
```

Now configuration happens exactly when needed.

---

# Think of Setup as Infrastructure

Your current wizard appears to focus on configuring features.

Instead, think in terms of provisioning platform capabilities:

| Stage           | Creates            |
| --------------- | ------------------ |
| Registration    | User               |
| Community Setup | Tenant             |
| Branding        | Identity           |
| Modules         | Capabilities       |
| Invites         | Population         |
| Launch          | Public community   |
| Adoption        | Ongoing engagement |

Each stage can be resumed independently and tracked as a long-lived provisioning project rather than a one-time wizard. This aligns well with your multi-tenant architecture and the existing self-service onboarding foundation in Phase 20.

## A NetComplex-specific evolution

Given your roadmap (multi-tenant SaaS, dWallet, provider marketplace, AI agents, address registry), I'd evolve onboarding into a **Workspace Setup Center** instead of a wizard.

The first screen after login becomes a control center with four persistent sections:

- **Launch** — community identity, domain, branding, and core settings.
- **Populate** — invite residents, administrators, and service providers.
- **Configure** — enable modules, payments, maintenance, bookings, messaging, and dWallet.
- **Grow** — recommendations based on usage, such as enabling surveys, achievements, AI assistants, or marketplace features.

The key difference is that this screen never disappears. Even after launch, it becomes the operational "health dashboard" for administrators, showing setup completeness, recommended next actions, and newly available platform capabilities as NetComplex evolves. This approach scales far better than continually extending a one-time onboarding wizard every time a new feature is introduced.
