---
title: ADVISORY.md
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY.md

# Advisory: Replace Immediate Onboarding Wizard with a Persistent Setup Center

**Status:** Architectural Recommendation

**Priority:** High

**Applies To:**

- Phase 20 Self-Service Inception
- Platform Onboarding
- Tenant Provisioning
- Dashboard/Home Layer
- Future SaaS Growth

---

# Executive Summary

The current onboarding experience launches users directly into a mandatory multi-step wizard immediately after tenant creation.

While this approach is common for small SaaS products, it does not scale well for NetComplex's long-term vision as a multi-tenant community operating platform.

Instead of treating onboarding as a one-time wizard, onboarding should become a persistent operational workspace that guides administrators from first login through long-term platform adoption.

This document recommends replacing the current onboarding flow with a **Setup Center** that acts as the operational headquarters for new tenant owners.

---

# Current Flow

```
Signup

↓

Immediate Wizard

↓

Branding

↓

Modules

↓

Pages

↓

Invites

↓

Launch

↓

Dashboard
```

Problems:

- User is blocked from exploring
- Long wizard increases abandonment
- Difficult to add new setup tasks
- Future modules make wizard continuously longer
- Setup is treated as an event instead of a lifecycle

---

# Recommended Flow

```
Registration

↓

Identity

↓

Setup Center

↓

Provisioning

↓

Launch

↓

Continuous Adoption
```

The Setup Center remains available permanently.

It is not a wizard.

It is an operational dashboard.

---

# Design Philosophy

The platform should never force configuration before users understand what they are configuring.

Instead:

Show the platform.

Explain what is incomplete.

Allow users to configure features when they are ready.

Progress should be continuous rather than linear.

---

# Phase 1 — Registration

Collect only essential information.

Required:

- Name
- Email
- Authentication
- Intent

Example:

```
What would you like to do?

○ Create a community

○ Join an existing community

○ Register as a provider

○ Explore NetComplex
```

This decision determines the onboarding path.

---

# Phase 2 — Identity

After login, verify identity and establish ownership.

Examples:

- Verify Email
- Accept Terms
- Confirm Community Ownership

Nothing else.

---

# Phase 3 — Setup Center

Instead of redirecting into a wizard:

Redirect into a Setup Center.

Example:

```
Welcome to Green Meadows HOA

Community Setup

72% Complete

Continue Setup

Explore Dashboard

Invite Residents

Launch Community
```

The user can:

- Continue setup
- Skip for now
- Explore the platform
- Return tomorrow

Everything auto-saves.

---

# Setup Center Structure

The Setup Center should consist of four permanent sections.

---

## 1. Launch

Core identity.

Tasks:

- Community Name
- Branding
- Logo
- Contact Details
- Domain
- Timezone
- Address

Completion:

100% required before public launch.

---

## 2. Populate

People.

Tasks:

- Invite Board Members
- Invite Residents
- Create Service Accounts
- Import Members
- Assign Roles

---

## 3. Configure

Platform capabilities.

Examples:

- Maintenance
- Bookings
- dWallet
- Community Services
- Marketplace
- Surveys
- AI Agents
- Achievements
- Provider Directory

Nothing here should be mandatory.

---

## 4. Grow

Recommendations.

Examples:

```
Recommended

Enable Community Wallet

Create your first survey

Configure provider directory

Enable achievements

Launch first competition
```

These recommendations evolve over time.

---

# Progress Tracking

Instead of:

```
Step 4 of 7
```

Use:

```
Community Ready

82%

██████████░░░
```

This feels like achievement rather than obligation.

---

# Mission-Based Experience

Convert setup tasks into missions.

Instead of:

```
Configure Bookings
```

Use:

```
Mission

Enable Community Bookings

Estimated Time

2 minutes

Benefits

Residents can reserve facilities.
```

Completion becomes rewarding.

This architecture also aligns naturally with the future Community Merits system.

---

# Progressive Disclosure

Do not ask users to configure features they have never seen.

Instead:

When entering Bookings:

```
Bookings is not configured.

Would you like to:

• Use defaults

• Import template

• Configure manually
```

Configuration becomes contextual.

---

# Required vs Optional

Separate these clearly.

Required:

- Tenant Name
- Branding
- Owner
- Contact
- Address
- Timezone

Optional:

- Maintenance Categories
- Bookings
- Wallet
- Marketplace
- Providers
- AI
- Surveys
- Competitions
- Achievements

Future modules simply appear as optional recommendations.

---

# Continuous Onboarding

Onboarding should never truly end.

After launch the Setup Center becomes a health dashboard.

Example:

```
Community Health

Branding

Complete

Residents

45%

Maintenance

Configured

Payments

Not Enabled

AI Assistant

Available

Achievements

Not Enabled

Overall Readiness

83%
```

This encourages ongoing platform adoption.

---

# Dashboard Integration

The Home Layer should display setup progress whenever onboarding is incomplete.

Example card:

```
Community Setup

82%

Continue Setup
```

Once completed:

Replace with:

```
Community Health
```

The transition is seamless.

---

# Technical Architecture

Introduce a new concept:

```
Setup Project
```

Instead of treating onboarding as session state.

Suggested model:

```
TenantSetup

id

tenantId

completionPercentage

completedSections

currentRecommendations

completedMissions

launchedAt

lastViewedAt
```

Each setup item should have its own completion state.

This allows:

- Auto-save
- Resume anywhere
- Future expansion
- Analytics
- Personalized recommendations

---

# Benefits

## Lower abandonment

Users are not forced into a long wizard.

---

## Better discoverability

Users understand features before configuring them.

---

## Infinite scalability

New modules simply add new missions.

The onboarding experience never becomes longer.

---

## Better SaaS architecture

Provisioning becomes a first-class platform capability.

Not merely a signup flow.

---

## Higher feature adoption

Recommendations continue after launch.

Modules are introduced when relevant.

---

## Better enterprise support

Communities can return months later and continue configuring advanced capabilities.

---

# Future Extensions

The Setup Center naturally supports:

- AI-assisted onboarding
- Recommended modules
- Usage analytics
- Community health scoring
- Platform maturity levels
- Guided migrations
- Marketplace recommendations
- Automated setup verification
- Billing recommendations
- White-label deployment readiness

No redesign would be required.

---

# Recommendation

The existing onboarding wizard should be re-implemented as a **persistent Setup Center** rather than a mandatory sequential wizard.

The Setup Center becomes a permanent administrative workspace that supports:

- Initial tenant provisioning
- Community launch
- Progressive configuration
- Long-term platform adoption
- Future module expansion

This approach better reflects NetComplex's evolution from a community application into a multi-tenant community operating platform and significantly reduces future architectural debt while providing a more flexible and user-friendly onboarding experience.
