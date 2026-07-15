---
phase: 125-proxy-vote-module
type: execute
status: planning
created: 2026-07-14
updated: 2026-07-14
milestone: M5+ Post-Launch
---

# Phase 125: Proxy Vote Module

**Source:** `docs/PROXY_SIG_DISCUSSION.md`

**Goal:** Design and implement a proxy vote submission module for HOA meetings. Owners who cannot physically attend AGM/SGM/Special Resolution Meetings/Trustee Elections can appoint a proxy nominee, upload a signed form, and have the proxy accept via notification workflow.

## Why this module exists

Given Netcomplex's architecture, this is modeled as a **lightweight workflow attached to an Event**, not a "form builder". It feels like checking in for an event rather than applying for something — simple, low-friction, and reusing existing capabilities (Events, Notifications, User Directory, Media uploads).

## Module Scope

**Proxy Vote** can be enabled only for events where:

- AGM
- SGM
- Special Resolution Meeting
- Trustee Election

## Resident Journey

### Step 1 — Open Meeting

Resident views the meeting event and selects "I cannot attend" to start proxy flow.

### Step 2 — Appoint Proxy

- Simple search box to find resident proxy nominee
- Option for "My proxy is not a resident" with name/email/phone fields
- Most HOAs allow non-members if permitted by constitution

### Step 3 — Upload Signed Proxy Form

- Upload field for signed PDF/JPG/PNG document
- No OCR, no AI — just file upload to existing media/document subsystem
- Supported: PDF, JPG, PNG

### Step 4 — Proxy Acceptance

Nominated person receives notification with:

- Accept/Decline buttons
- View Form option

### Step 5 — Digital Signature

Proxy confirms agreement via:

- Draw signature OR type full name + checkbox
- Depending on HOA legal requirements

### Step 6 — Complete

- Shows submission status: "Submitted to HOA, Pending verification"
- Indicates owner signature ✓ and proxy signature ✓ status

## HOA Dashboard

Admin widget showing:

- Owner and proxy names
- Checkmarks for signed/unsigned status
- Approve/Reject buttons
- QR Reference code after approval (PV-YYYY-NNNN)

## Status Lifecycle

```
Draft
  ↓
Waiting for Upload
  ↓
Waiting for Proxy
  ↓
Pending HOA Review
  ↓
Approved ←→ Rejected
  ↓
Withdrawn
```

Six states only — simple and clear.

## Notifications

| Recipient | Events                                                       |
| --------- | ------------------------------------------------------------ |
| Owner     | Proxy accepted, Proxy declined, HOA approved, HOA rejected   |
| Proxy     | You've been nominated, Reminder to sign, Submission complete |
| HOA       | New proxy received, Proxy accepted, Ready for review         |

## Database Model

MeetingProxy table:

- `id` — primary key
- `meetingId` — FK to Event
- `ownerUserId` — FK to User
- `ownerHouseholdId` — FK to Household
- `proxyUserId` (nullable) — FK to User if resident
- `proxyName` — text (if non-resident)
- `proxyEmail` — text (if non-resident)
- `proxyPhone` — text (if non-resident)
- `formDocumentId` — FK to Document (references media/document subsystem)
- `ownerSignedAt` — timestamp
- `proxySignedAt` — timestamp
- `approvedBy` — FK to User
- `approvedAt` — timestamp
- `status` — enum (Draft, WaitingForUpload, WaitingForProxy, PendingHoaReview, Approved, Rejected, Withdrawn)
- `notes` — text
- `createdAt`, `updatedAt` — timestamps

## Integration Points

1. **Events module** — Proxy Vote attached to AGM/SGM/Trustee Election events
2. **Media subsystem** — Document upload to existing document management
3. **Notifications** — Multi-party notification system
4. **User Directory** — Resident search for proxy nomination
5. **Admin UI** — Approval widget in admin space

## Optional Nice-to-Haves (Future)

- Allow one proxy holder to represent multiple owners (subject to HOA constitution limits)
- Show voting units represented at check-in
- Export attendance register including proxy allocations
- Generate PDF register for chairperson
- Automatically invalidate outstanding proxies once meeting closes

## Next Steps

Run `/gsd-plan-phase 125-proxy-vote-module` to create detailed implementation plan.
