---
title: MAINTENANCE TEAMS
status: current
reviewed: 2026-07-28
tags: [status, communication]
audience: all
---

# MAINTENANCE TEAMS

## PROBLEM STATEMENT:

We need to be able to add more than one user to a team, currently one team = one person. Also, a team member is most likely a user who provides the service (eg gardening and mowing lawns, five days a week). He or she will interact with the platform via the user > provider lifecycle. We need to make sure our provider lifecycle caters to the employment status of the provider (employeed by HOA).

## Current State

Model Members/Users? Notes
MaintenanceTeam None Just name, trade, contactName — a team is a label, not a group of people
ServiceProvider (maintenance) Optional 1:1 via userId Thin CRUD records, not linked to the full provider lifecycle
ServiceProvider (platform) 1:1 via userId Full lifecycle: registration → probation → approval → verified → PROVIDER role
Two parallel "provider" concepts coexist: thin maintenance providers (no user link, no verification) and full platform providers (linked to user, with reputation/legal/billing). Neither connects to teams.

## Proposed Plan

Phase 1 — Multi-member teams
New MaintenanceTeamMember junction table:
Field Type
id String
teamId FK → MaintenanceTeam
userId FK → user
createdAt DateTime
Unique constraint on (teamId, userId).
New API endpoints under /api/maintenance/teams/[id]/members:

- GET — list team members (with user name, email, role)
- POST — add user to team { userId }
- DELETE — remove user from team ?userId=...
  UI — extend /admin/teams:
- Expandable member list per team row
- "Add Member" with user search/picker
- Remove button per member
  Phase 2 — Streamlined in-house provider lifecycle
  New employmentType field on ServiceProvider:
  Value Meaning
  IN_HOUSE Employed by HOA, member of a maintenance team
  EXTERNAL Independent contractor (existing behavior, default)
  Auto-provider flow: When a user is added to a team:

1. Check if user already has a ServiceProvider record linked via userId
2. If not → create one automatically: employmentType: IN_HOUSE, trade from team, isActive: true, verification VERIFIED (skip probation)
3. If user's role is USER → promote to PROVIDER so they get the provider dashboard space
4. If user already has a provider record → just link it (no changes)
   This means: joining a team makes you a verified provider automatically. No self-registration, no admin approval gate — because the admin already approved you by adding you to the team.
   Phase 3 — Team assignment notifications & provider dashboard
   New event: maintenance.team_assigned — emitted when a team is assigned to a request. Triggers:

- In-app notification to all team members
- Email to team members (if configured)
  Provider dashboard for team members: Team members with PROVIDER role see requests assigned to their teams in the provider dashboard, filterable by team, with status update capability.
  Phase 4 — /admin/teams enhanced UI
  Add team detail view showing:
- Create/edit team (already done)
- Member list with avatars
- Add/remove members
- Member's provider status indicator (linked, verified, etc.)

## Questions

1. Auto-promote to PROVIDER role? When a user joins a team, should they automatically get the PROVIDER role and the provider dashboard space? Or should there be a separate, lighter "team member" access model?
2. Existing ServiceProvider records: The maintenance providers API creates standalone providers without userId. Should we migrate these to be linkable to users, or keep them separate as "external contractor" records?
3. Notification preferences: Should team members be able to opt out of assignment notifications, or is it mandatory (you're on the team, you get notified)?
   Which direction should I take on these?
