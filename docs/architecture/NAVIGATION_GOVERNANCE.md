# Navigation Governance

## Netcomplex Multitenant Platform

Version: 1.0  
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
- Directory (seen but not public access)
- Services (seen but not public access)
- Resources (seen bu not public access)
- Conservation
- More

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
- Maintenance Admin
- CMS
- User Management

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

Example:

```txt
News
Groups
Surveys
Competitions
Campaigns
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

Tenants MAY NOT:

- override core navigation governance
- exceed navigation limits
- inject arbitrary permanent header items

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
More
```

## More Dropdown

```
News
Groups
Campaigns
Conservation
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

Explore
Community
My Space
Administration

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
| Conservation | Public Nav |
| Campaigns | Public Nav |
