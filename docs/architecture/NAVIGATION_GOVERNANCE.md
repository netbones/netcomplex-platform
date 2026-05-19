# Navigation Governance

## Netcomplex Multitenant Platform

Version: 1.1  
Status: Active Architecture Standard

---

# Purpose

This document defines the rules, principles, and governance process for navigation within the Netcomplex multitenant ecosystem.

The objective is to:

- prevent navigation inflation
- maintain usability as modules grow
- separate public discovery from operational workflows
- ensure long-term scalability across tenants
- create predictable user experiences
- avoid duplicate navigation structures

Navigation is considered a product architecture concern, not a module-level decision.

---

# Core Philosophy

## Navigation Represents User Journeys — Not System Features

A feature existing in the platform does NOT automatically justify:

- header placement
- sidebar placement
- burger menu placement
- permanent visibility

Navigation must prioritize:

1. frequency
2. importance
3. user intent
4. discoverability
5. simplicity

---

# Navigation Layers

The platform is divided into four navigation domains.

---

# 1. Public Navigation

## Purpose

Community discovery and public access.

## Audience

- visitors
- prospective residents
- unauthenticated users

## Characteristics

- minimal
- stable
- low churn
- tenant branding focused

## Allowed Header Items

Maximum:

- 4–6 items

Recommended:

- Home
- Directory
- Services
- Resources
- Conservation **or** Campaign (tenant choice, see Tenant Onboarding below)
- More

## Conservation vs Campaign — Tenant Onboarding Choice

During tenant onboarding, the tenant selects their primary engagement focus:

| Choice             | Header Placement       | More Dropdown Placement       |
| ------------------ | ---------------------- | ----------------------------- |
| Conservation focus | Conservation in header | Campaigns in More dropdown    |
| Campaign focus     | Campaign in header     | Conservation in More dropdown |

This prevents header clutter while allowing both modules to exist. The unselected module remains accessible via the More dropdown. Tenants may change this preference later via tenant settings, but only one may occupy a header slot at a time.

## Rules

### Public header items MUST:

- be globally relevant
- serve most visitors
- remain stable over time
- represent core tenant identity

### Public header items MUST NOT:

- expose operational workflows
- expose internal tooling
- expose role-specific functionality
- grow dynamically with modules

---

# 2. Community Navigation

## Purpose

Participation and engagement.

## Audience

- authenticated residents
- members
- community participants

## Examples

- Groups
- News
- Surveys
- Competitions
- Campaigns
- Events

## Placement

- More dropdown
- Community section
- Dashboard widgets
- Contextual cards

## Rules

Community modules SHOULD:

- appear contextually
- be promoted through feeds/cards
- avoid permanent top-level placement

Community modules SHOULD NOT:

- inflate primary navigation
- duplicate dashboard functionality

---

# 3. Workspace Navigation

## Purpose

Personal productivity and user tasks.

## Audience

Authenticated users.

## Examples

- Dashboard
- Messages
- Bookings
- My Maintenance Requests
- Notifications
- Saved Resources
- Account Settings

## Placement

- avatar dropdown
- dashboard sidebar
- mobile workspace section

## Rules

Workspace items:

- are user-scoped
- should not appear in public navigation
- should not duplicate community navigation

---

# 4. Administrative Navigation

## Purpose

Platform management and operations.

## Audience

- moderators
- admins
- staff
- tenant operators

## Examples

- Tenant Settings
- Moderation
- Analytics
- Maintenance Admin (Requests)
- CMS (Content Management)
- User Management
- Groups Admin
- Surveys Admin
- Events Admin
- Competitions Admin
- Resources Admin
- Categories
- Households
- External Surveys

## Placement

- admin sidebar
- protected routes
- role-gated menus

## Rules

Administrative functionality:

- must remain isolated from public UX
- must be role protected
- must never appear in public header navigation

---

# 5. Footer Navigation

## Purpose

Secondary navigation for legal, utility, and condensed reference links.

## Structure

The footer is organized in two tiers:

### Upper Footer — Content Columns

- **Quick Links**: Home, Directory, Services, Resources, Conservation (if not in header), Dashboard (authenticated)
- **Services**: Anchor links to service sections (Maintenance, Security, Landscaping, Amenities), Events anchor under Resources

### Lower Footer — Legal & Utility

- Privacy
- Terms
- Guidelines
- Contact

## Rules

### Footer items MUST:

- be accessible from every page
- include legal and policy pages
- remain stable across tenant configurations

### Footer items MUST NOT:

- introduce new feature discovery paths not already in header or More dropdown
- duplicate header items without purpose (e.g., Home appears in both for orientation)
- grow beyond the established column structure without governance review

### Footer Governance Principle

The footer is a reference layer, not a discovery layer. It should not be used to surface features that failed navigation admission criteria.

---

# 6. Language Switcher

## Purpose

Provide locale selection for multilingual tenant experiences.

## Placement

- Primary: Header right-side, adjacent to user actions (Sign In / Avatar)
- Mobile: Within burger menu, under My Space section

## Rules

### Language switcher MUST:

- be visible on all tenant-scoped pages
- persist across navigation transitions
- reflect the current active locale

### Language switcher MUST NOT:

- appear in platform marketing pages (`/platform/*`)
- interfere with primary navigation item count

## Route Structure

Language-scoped routes use the `[lng]` dynamic segment:

```
/[lng]/platform/home
```

The `[lng]` segment is transparent to navigation — users interact with locale-agnostic paths (`/`, `/directory`, etc.) while the system resolves the active locale from session, preference, or URL segment.

---

# 7. Platform Navigation (Out of Scope)

The `/platform/*` route group (NetComplex marketing pages) uses its own `PlatformHeader` and `PlatformFooter` components. These are outside tenant navigation governance.

Platform navigation is governed separately and does not interact with tenant chrome.

---

# Primary Navigation Standards

## Header Navigation

### Maximum Visible Items

6 total including dropdown triggers.

### Approved Structure

```txt
Home
Directory
Services
Resources
Conservation
More
```

# More Dropdown

Used for:

- secondary public modules
- lower-frequency discovery
- campaign-oriented features
- the module not selected for header placement (Conservation or Campaign)

Example:

```txt
News
Groups
Surveys
Competitions
Campaigns (or Conservation — whichever is not in header)
Events
```

# Burger Menu Standards

## Mobile Burger Menu Purpose

The burger menu exists to:

- support mobile navigation
- organize categories
- reduce visual overload

It MUST NOT:

- duplicate desktop navigation exactly
- become a dumping ground for modules
- expose all system routes

## Required Burger Structure

```txt

Explore
Community
My Space
Administration
```

## Explore

Home
Directory
Services
Resources

## Community

Groups
News
Campaigns
Conservation
Surveys
Competitions

## My Space

Dashboard
Messages
Bookings
Maintenance
Notifications

## Administration

Role-based visibility only.

```txt
Moderation
Analytics
Tenant Settings
Content (CMS)
Operations
```

# Dashboard Governance

## Principle

Operational functionality should primarily surface through:

- dashboards
- widgets
- feeds
- alerts
- notifications
- contextual actions

NOT through permanent navigation.

# Dashboard Tab Admission Criteria

Tabs within the resident and admin dashboards MUST meet the following criteria before being added:

## Resident Dashboard Tabs

A new tab MUST:

1. **Represent a distinct user journey** — not a subset of an existing tab
2. **Have dedicated widgets** — at least 2 widgets that belong exclusively to this tab
3. **Justify separation** — cannot logically merge into an existing tab without creating cognitive overload
4. **Serve authenticated users** — tabs are workspace-scoped, not public

## Admin Dashboard Tabs

A new tab MUST:

1. **Represent a distinct administrative domain** — not a sub-feature of an existing admin area
2. **Have dedicated admin widgets** — at least 2 admin-specific widgets
3. **Require dedicated management workflows** — CRUD operations, analytics, or configuration that don't fit elsewhere
4. **Be role-scoped** — visible only to roles that need it

## Tab Rejection Criteria

A tab MUST NOT be added if:

- it duplicates functionality available in another tab
- it can be represented as a widget within an existing tab
- it is a single-feature page that doesn't warrant a tab container
- it is temporary or seasonal
- it is tenant-specific customization that doesn't apply platform-wide

## Current Tab Inventory

### Resident Dashboard

| Tab         | Purpose                                       |
| ----------- | --------------------------------------------- |
| Overview    | Stats, quick actions, activity, notifications |
| Maintenance | Maintenance requests and properties           |
| Bookings    | Events and booking notifications              |
| Services    | My services and service inquiries             |
| Content     | User content and media                        |
| Premium     | Premium portfolio and agent features          |

### Admin Dashboard

| Tab          | Purpose                            |
| ------------ | ---------------------------------- |
| Overview     | Admin stats, quick links, activity |
| Maintenance  | Request management and analytics   |
| Users        | User management and activity       |
| Content      | Content management and stats       |
| Events       | Event management                   |
| Competitions | Competition management             |
| Resources    | Resource management                |
| Surveys      | Survey management                  |
| System       | System configuration and activity  |
| Settings     | Page settings and feature flags    |

# Feature Discovery Rules

## Preferred Discovery Mechanisms

| Feature Type | Preferred Surface   |
| ------------ | ------------------- |
| Maintenance  | Dashboard widget    |
| Surveys      | Notification/banner |
| Competitions | Campaign cards      |
| News         | Feed                |
| Messages     | Inbox icon          |
| Bookings     | User dashboard      |
| Groups       | Community section   |

# Navigation Admission Criteria

## Before adding ANY new permanent navigation item, the following questions MUST be answered.

## Qualification Checklist

1. Frequency

Will most users access this weekly?

2. Breadth

Is this relevant to most tenants?

3. Stability

Will this feature exist long-term?

4. Discoverability

Can this feature be discovered contextually instead?

5. Redundancy

Does another navigation surface already expose it?

6. User Intent

## Does this represent a primary user journey?

# Rejection Criteria

A feature MUST NOT become a permanent nav item if:

- it is role-specific
- it is seasonal
- it is campaign-based
- it duplicates dashboard functionality
- it has low engagement
- it is tenant-specific only
- it is operational/internal
- it is temporary

# Role-Based Navigation

Navigation MUST be role-aware.

Example
| Role | Visible Areas |
| --------- | ------------------------------ |
| Visitor | Public Navigation |
| Resident | Public + Community + Workspace |
| Moderator | Resident + Moderation |
| Admin | Full Access |

# Tenant Customization Rules

Tenants MAY:

- rename modules
- reorder community sections
- enable/disable optional modules
- select Conservation or Campaign for header placement (mutually exclusive)

Tenants MAY NOT:

- override core navigation governance
- exceed navigation limits
- inject arbitrary permanent header items
- place both Conservation and Campaign in the header simultaneously

---

# Information Architecture Principles

1. Shallow Public Navigation

Public navigation should remain:

- simple
- memorable
- consistent

2. Deep Contextual Experiences

Complexity belongs inside:

- dashboards
- workflows
- modules
- sidebars

NOT in global navigation.

3. Progressive Disclosure

Users should discover advanced functionality gradually.

## Avoid exposing:

- all features immediately
- administrative complexity
- rarely used workflows
- UX Standards

## Navigation Must Prioritize

- clarity
- consistency
- predictability
- responsiveness
- accessibility

# Anti-Patterns

## Forbidden Patterns

### Navigation Inflation

Adding every module to the header.

### Mirror Navigation

Desktop and mobile menus being identical.

### Feature Registry Menus

Menus acting as technical module lists.

### Operational Leakage

Admin tools visible in public UX.

### Duplicate Access Paths

Same functionality repeated excessively across menus.

# Recommended Final Architecture

## Public Header

```
Home
Directory
Services
Resources
{Conservation | Campaign}  (tenant choice)
More
```

## More Dropdown

```
News
Groups
{Campaign | Conservation}  (whichever is not in header)
Surveys
Competitions
```

## User Avatar Menu

```
Dashboard
Messages
Bookings
Maintenance
Settings
Sign Out
```

## Mobile Burger

```
Explore
Community
My Space
Administration
```

## Footer — Upper

| Quick Links      | Services    |
| ---------------- | ----------- | ------ |
| Home             | Maintenance |
| Directory        | Security    |
| Services         | Landscaping |
| Resources        | Amenities   |
| {Conservation    | Campaign}   | Events |
| Dashboard (auth) |             |

## Footer — Lower

```
Privacy | Terms | Guidelines | Contact
```

# Governance Process

## Any Navigation Change MUST Include

- UX justification
- frequency analysis
- role analysis
- tenant impact analysis
- mobile impact analysis

# Approval Process

## Required Reviewers

- Product
- UX
- Platform Architecture

# Future Scalability

This governance model is designed to scale with:

- additional tenants
- optional modules
- enterprise workflows
- smart community integrations
- IoT systems
- AI assistants
- future platform products

Without requiring navigation redesigns.

# Guiding Principle

## Navigation should expose intention, not implementation.

Users should experience:

- communities
- services
- participation
- workflows

Not platform internals.

# Important Architectural Principle

Modules with “verbs” usually belong in workspaces

Examples:

| Verb-Based | Better Placement |
| ---------- | ---------------- |
| Book       | Workspace        |
| Report     | Workspace        |
| Message    | Workspace        |
| Schedule   | Workspace        |
| Manage     | Workspace        |

Modules with “discovery” belong in public navigation

Examples:
| Discovery-Based | Better Placement |
| --------------- | ---------------- |
| Directory | Public Nav |
| Services | Public Nav |
| Resources | Public Nav |
| Conservation or Campaign | Public Nav (one in header, one in More) |
