---
title: Announcement & Communication System — Problem Definition
status: current
reviewed: 2026-07-28
tags: [architecture, design]
audience: developer
---

# Announcement & Communication System — Problem Definition

**Document type:** Problem Statement & Requirements Context  
**Phase:** 11 — Announcements  
**Status:** Draft for review  
**Informed by:** Soralia Village anchor tenant experience

---

## The Current Reality

Soralia Village HOA currently communicates through two channels:

- **WhatsApp** — used by the HOA Chair for day-to-day notices, operational updates, and community issues
- **Email** — reserved for important or formal matters

### What This Looks Like in Practice

A resident's notification experience today is a flat, undifferentiated stream:

> _"Someone's dog got into the garden"_  
> _"Water will be off Thursday 08:00–12:00"_  
> _"High Court notice: levy recovery proceedings commence in 14 days"_

All three arrive at the same volume, through the same channel, with identical urgency signals. The resident must read every message to determine whether it requires action, escalation, or can be dismissed.

---

## The Core Problem

### 1. Signal Collapse

There is no distinction between:

- **Operational notices** — temporary, informational, no action required (water outage, gate maintenance, pest control scheduled)
- **Community notices** — social, contextual, may require awareness but not action (cat/dog complaint, noise concern, lost item)
- **Governance notices** — formal, may have legal standing, may require response or action within a defined period (AGM notice, levy resolution, rule change)
- **Legal notices** — high urgency, time-bound, potentially consequential (High Court applications, debt recovery, interdict)

When these four categories share a channel and format, every message demands the same cognitive load. High-stakes notices get lost. Low-stakes notices generate anxiety.

### 2. No Actionability

Current notices are read-only broadcasts. There is no mechanism to:

- Acknowledge receipt (required for some legal and governance notices)
- Forward to a third party (e.g. an attorney, a managing agent, a spouse)
- Escalate for response (e.g. flag a governance notice as requiring a board reply)
- Archive for future reference (e.g. retrieve the original levy notice six months later)
- Attach context or documentation (e.g. link to the relevant rule, bylaw, or court document)

### 3. No Targeting

All notices go to all residents regardless of relevance:

- A water outage affecting Block A goes to Block C residents
- A levy arrears notice goes to owners who are paid up
- An agent-facing property instruction goes to all community members
- A renter-specific rule reminder goes to owners

This creates noise fatigue and erodes trust in the channel. When everything is sent to everyone, people stop reading.

### 4. No Audit Trail

There is no record of:

- Who sent what, and when
- Whether a notice was received and read
- Whether a time-sensitive notice was acknowledged before its deadline
- What the board communicated prior to a disputed decision

This is a governance and legal liability. In a body corporate or HOA context, proof of notice is often a legal requirement.

### 5. No Retrieval

Notices live in WhatsApp scroll history or email inboxes — both are personal, ephemeral, and unsearchable at the community level. A new resident cannot retrieve the last three years of AGM notices. A board member cannot pull the history of communications about a specific property dispute.

---

## What the Platform Must Solve

The announcements system is not a feature. It is the replacement for an informal, unstructured communication channel that has real governance and legal implications for a body corporate or HOA.

The system must support four distinct communication modes:

### Mode 1: Operational Broadcast

_"The water will be off on Thursday."_

- Informational only
- Time-bounded (notice expires when the event passes)
- Relevant to a subset of residents (whole estate, or a zone)
- No action required
- Low urgency unless it escalates (e.g. outage extends past expected time)

### Mode 2: Community Notice

_"Please keep cats indoors after dark."_

- Informational and social
- May reference a specific rule or bylaw
- Relevant to all or a filtered segment
- May invite response or acknowledgement
- Low to medium urgency

### Mode 3: Governance Notice

_"The AGM will be held on 15 June. Special resolution on levy increase attached."_

- Formal
- May have statutory notice periods (e.g. Sectional Titles Act requires 14 days' notice for AGM)
- Must be sent to specific roles (owners, not renters or agents)
- May require acknowledgement
- Should link to supporting documents (agenda, financial statements, proxy form)
- Medium to high urgency

### Mode 4: Legal / Urgent Notice

_"High Court application filed. Response required within 5 business days."_

- Highest urgency
- Legally consequential
- Narrow audience (may be property-specific, or owner-only)
- Must be acknowledged
- Should prompt resident to forward to their attorney or representative
- Must carry a deadline indicator
- Must generate a notification that cannot be silenced or batched

---

## Derived Requirements

From the problem definition, the following requirements are non-negotiable:

### R1 — Priority is structural, not cosmetic

Priority levels must map to communication modes, not just visual colour. `urgent` means legal/time-bound. `high` means governance/action-required. `normal` means operational. `low` means community/social. This taxonomy must be documented and enforced in the admin form UI so that authors cannot arbitrarily assign `urgent` to a cat complaint.

### R2 — Targeting is mandatory

No announcement should reach a user for whom it is irrelevant. The minimum targeting dimensions are:

- Occupancy type (owner / renter / all) — via `ResidentFilter`
- Role (board, committee, resident, agent, etc.) — via `Role[]`
- Future: property zone or street (not in current schema — flag for Phase 12+)

### R3 — Notification fanout is required for all announcements

An announcement that does not generate a `Notification` record per targeted user does not exist from the resident's perspective. The two systems must be coupled at creation time.

### R4 — Priority must determine notification behaviour

`urgent` and `high` priority announcements must generate notifications that cannot be dismissed without acknowledgement. `normal` and `low` can be standard dismissible notifications. This implies the `Notification` model may need a `requiresAck` boolean field in a future migration.

### R5 — Forwarding / diversion must be possible

Residents must be able to forward an announcement to an external email address (e.g. their attorney) directly from the notification UI. This is particularly important for legal and governance notices. This is a UI feature, not a data model feature, but it must be designed in.

### R6 — Audit trail is required for governance and legal notices

The system must record, per announcement:

- `sentAt` timestamp
- Count of targeted users
- Count of acknowledged users (once `requiresAck` is implemented)

This is a future migration concern but the schema should be designed to accommodate it.

### R7 — Document attachment

Governance and legal notices must be able to link to a `Resource` record (the existing `Resource` model with `fileUrl`) or an external URL. The `Announcement` model should have an optional `resourceId String?` field linking to `Resource`.

### R8 — No new permanent navigation item

Announcements are delivered through the notification system and surfaced through the dashboard stream widget. They do not warrant a standalone navigation entry. See NAVIGATION_GOVERNANCE.md.

---

## Immediate Schema Implications

Beyond what is in `11-ANNOUNCEMENTS-REVISED-INSTRUCTIONS.md`, this problem definition adds two further schema considerations:

```prisma
model Announcement {
  id            String         @id
  tenantId      String
  title         String
  content       String
  author        String
  priority      String         @default("normal")
  targetFilter  ResidentFilter @default(ALL)
  targetRoles   Role[]
  resourceId    String?        // link to supporting document
  expiresAt     DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @default(now()) @updatedAt
  resource      Resource?      @relation(fields: [resourceId], references: [id])
}
```

The `Notification` model should be flagged for a future migration to add `requiresAck Boolean @default(false)` and `ackedAt DateTime?`. Do not implement this now — but do not make architectural decisions that foreclose it.

---

## Priority Taxonomy — Enforced Definitions

These definitions must appear in the admin form UI as helper text, not just colour codes:

| Priority | Label          | Meaning                                                         | Examples                                             |
| -------- | -------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| `urgent` | Legal / Urgent | Time-bound, legally consequential, requires immediate attention | High Court notice, interdict, emergency safety issue |
| `high`   | Governance     | Formal, action may be required, statutory notice period applies | AGM notice, levy resolution, rule amendment          |
| `normal` | Operational    | Informational, temporary, no action required                    | Water outage, maintenance access, gate closure       |
| `low`    | Community      | Social, contextual, awareness only                              | Pet reminder, noise request, lost property           |

Authors must not be able to self-assign `urgent` without a role check. Only `BOARD` and `ADMIN` roles may publish `urgent` announcements. `COMMITTEE` may publish `high` and below. `MANAGER` may publish `normal` and below.

---

## Future Considerations (Out of Scope for Phase 11)

These are flagged here so they are not accidentally foreclosed by current implementation decisions:

- **Zone/street targeting** — announcements scoped to a physical area of the estate (requires a `zone` or `block` field on `Property` or `Household`)
- **Acknowledgement receipts** — `requiresAck` on `Notification`, with a dashboard view for admins showing who has and hasn't acknowledged a critical notice
- **Document attachment** — the `resourceId` field above enables this; the UI for it can follow in a later phase
- **Scheduled publishing** — `publishAt DateTime?` for pre-authored notices
- **Reply / escalation thread** — a lightweight thread attached to an announcement for board responses (not chat — structured Q&A)
- **External forwarding** — forward-to-email from notification UI, pre-populated with announcement content and a link

---

## Summary

The WhatsApp + email model fails because it collapses urgency, eliminates targeting, provides no actionability, and leaves no audit trail. The platform's announcement system must be designed as a **governed communication layer**, not a bulletin board. The difference is consequential: in a body corporate context, a levy recovery proceeding or an AGM notice has legal weight. The system that carries it must reflect that weight in its design.

The immediate implementation (Phase 11) should lay the correct foundation — targeting, priority taxonomy, notification fanout, and document linkage — even if acknowledgement receipts and forwarding come in a later phase.
