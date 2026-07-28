---
title: INITIAL REVIEW DISCUSSION
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

# INITIAL REVIEW DISCUSSION

After reviewing the component, the issue is the same as the Resources page, but even more pronounced:

### Current Problems

The page is essentially:

```text
Title
↓
3 service cards
↓
Additional services card
↓
Hours card
Emergency card
↓
Form card
```

Everything is:

```tsx
bg-white rounded-lg shadow-lg
```

The page has good functionality, but visually it feels like a collection of admin dashboard cards rather than a service marketplace.

---

# What I'd Change

## 1. Replace The Header With A Service Portal Hero

Current:

```tsx
<h1>{t('title')}</h1>
<p>{t('subtitle')}</p>
```

Proposed:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Community Services

Professional services and support
for residents, homeowners and tenants.

[ Search Services ]

87 Available Services
24/7 Emergency Support
5 Service Categories

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Using:

```tsx
<div className="rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white p-10 mb-12">
```

This immediately gives the page identity.

---

## 2. Turn Service Categories Into Premium Service Tiles

Current cards:

````tsx
bg-white rounded-lg shadow-lg


all look identical.

Instead:

```tsx
const SERVICE_THEMES = {
  maintenance: {
    accent: 'bg-blue-500',
    panel: 'bg-blue-50',
    icon: 'text-blue-700',
  },
  security: {
    accent: 'bg-red-500',
    panel: 'bg-red-50',
    icon: 'text-red-700',
  },
  landscaping: {
    accent: 'bg-green-500',
    panel: 'bg-green-50',
    icon: 'text-green-700',
  },
};
````

Then:

```tsx
<div className="
  rounded-3xl
  overflow-hidden
  bg-white
  border
  border-gray-200
  hover:shadow-2xl
  hover:-translate-y-1
  transition-all
">
```

Add:

```tsx
<div className={theme.accent + ' h-2'} />
```

to create category identity.

---

## 3. Add Quick Access Category Navigation

Between Hero and Cards:

```text
┌─────────┐
🔧
Maintenance
└─────────┘

┌─────────┐
🛡
Security
└─────────┘

┌─────────┐
🌳
Landscaping
└─────────┘
```

This breaks up the page and improves navigation.

---

## 4. Transform Additional Services

Current:

```tsx
bg-white rounded-lg shadow-lg
```

with tiny cards.

Instead:

```text
━━━━━━━━━━━━━━━━━━━
Additional Services
━━━━━━━━━━━━━━━━━━━

□ Parking
□ Internet
□ Waste Management
□ Amenities

each with:
icon
description
learn more
```

using a tinted section:

```tsx
bg-slate-50 rounded-3xl
```

rather than another white box.

---

## 5. Make Emergency Contacts a Hero Section

Right now emergency contacts are buried halfway down the page.

For communities, emergency services are often one of the most important functions.

Move them higher and use:

```tsx
bg-red-50
border-l-4 border-red-500
```

Example:

```text
🚨 Emergency Contacts

Security Control Room
Emergency Maintenance
Medical Emergency
Fire Department
```

with large phone buttons.

---

## 6. Upgrade Service Hours

Current:

```text
Service | Hours
```

looks administrative.

Instead:

```text
🛠 Maintenance
Mon-Fri 08:00-17:00

🛡 Security
24 Hours

🌳 Landscaping
Mon-Sat
```

displayed as cards:

```tsx
grid - cols - 3;
```

Much more visual.

---

## 7. Turn The Request Form Into A Drawer/Modal

This is probably the single biggest UX improvement.

Currently:

```tsx
{
  selectedService && <Form />;
}
```

appears below the entire page.

Users click:

```text
Request Service
```

and then must scroll.

Instead:

```tsx
<ServiceRequestDialog />
```

or

```tsx
<ServiceRequestSheet />
```

from your UI library.

The form should slide in immediately.

---

## 8. Add Featured Services Section

Above the category grid:

```text
⭐ Most Requested Services

Maintenance
Security
Landscaping
```

This makes the page feel active.

---

## 9. Add Service Statistics

Your data already allows:

```text
87 Services
24/7 Support
12 Emergency Contacts
8 Categories
```

Display these in the hero.

---

## 10. Introduce Section Rhythm

Current:

```text
White
White
White
White
White
```

Recommended:

```text
Gradient Hero

White Category Navigation

Tinted Featured Services

White Service Grid

Red Emergency Section

Slate Additional Services

White Hours Section

Gradient CTA
```

This creates visual hierarchy.

---

### The Three Highest-Impact Changes

If I were updating NetComplex's Services page, I would prioritize:

1. **Gradient hero with service statistics**
2. **Move service request into a modal/drawer**
3. **Colour-themed service categories instead of identical white cards**

Those three changes alone would make the page feel like a modern community service marketplace rather than an internal admin page.

# FOLLOWUP RESOLUTION

> The initial idea was that we distinquished between inhouse services provided by HOA and third-party trusted services available via our /directory.

That distinction is actually quite valuable, and I would avoid turning `/services` into a generic service marketplace if `/directory` already fulfills that role.

A common mistake in community platforms is ending up with:

```text
/services
  Electrician
  Plumber
  Garden Service

/directory
  Electrician
  Plumber
  Garden Service
```

which creates duplication and user confusion.

## A Clear Separation

### `/services`

**Services provided by the HOA, Estate, Body Corporate, or Management Association.**

Examples:

```text
Maintenance Requests
Access Control
Visitor Management
Refuse Collection
Common Area Cleaning
Garden Maintenance
Pool Maintenance
Security Services
Architectural Review
Building Plan Submission
Rule Violations
Move-In / Move-Out Requests
Emergency Assistance
```

The question is:

> "What can the community administration do for me?"

---

### `/directory`

**Trusted third-party businesses available to residents.**

Examples:

```text
Electricians
Plumbers
Painters
Landscapers
Internet Providers
DSTV Installers
Pet Services
Domestic Workers
Handymen
Cleaning Companies
```

The question is:

> "Which external provider should I contact?"

---

## How I'd Reposition the Services Page

Instead of:

```text
Services
```

make it:

```text
Community Services
```

or

```text
Resident Services
```

The page becomes a service portal.

---

## Section 1: HOA Services Hero

```text
━━━━━━━━━━━━━━━━━━━━━━

Resident Services

Request assistance from the HOA,
management office and community teams.

━━━━━━━━━━━━━━━━━━━━━━
```

---

## Section 2: Service Categories

Large cards:

```text
┌─────────────────┐
🔧 Maintenance
Submit maintenance requests
Track progress
View history
└─────────────────┘

┌─────────────────┐
🛡 Security
Visitor access
Incident reporting
Emergency contacts
└─────────────────┘

┌─────────────────┐
🏛 Administration
Documents
Approvals
General requests
└─────────────────┘
```

These are not vendors.

These are workflows.

---

## Section 3: Service Requests

Think of this as a resident portal.

```text
Open Requests
Completed Requests
Pending Approval
```

Very similar to a municipal service portal.

---

## Section 4: Emergency Services

```text
Security Control Room
Estate Manager
Emergency Maintenance
Medical Emergency
```

Highly visible.

---

## Section 5: Need an External Contractor?

This is where the two systems connect.

```text
Can't find what you're looking for?

Browse our trusted service provider directory.

[ Browse Directory ]
```

Link to `/directory`.

---

## Navigation Governance

I would document the distinction as:

### Services

```text
Purpose:
Provide workflows and requests managed
by the HOA / Estate / Association.
```

### Directory

```text
Purpose:
Discover third-party businesses and
service providers available to residents.
```

### Rule

```text
If a resident submits a request
through NetComplex and the HOA
is responsible for managing it:

→ Services

If a resident chooses and contacts
an independent provider:

→ Directory
```

This becomes a very clean domain boundary and aligns well with the ubiquitous language of a community management platform. In DDD terms, **Services** belongs to the _Community Operations_ bounded context, while **Directory** belongs to a _Business Directory / Marketplace_ bounded context. Keeping those separate will make both the UX and the underlying domain model much easier to evolve.
